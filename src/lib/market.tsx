import { useEffect, useState } from 'react';
import {
  collection, addDoc, onSnapshot, query, where, doc, updateDoc, getDocs, writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Offer, Carrier, buildOffers } from './catalog';
import { Shipment } from './shipments';
import { ShipmentDraft } from './ai';
import { notify } from './notifications';

// The real two-sided marketplace layer. Shipments live top-level (users own them
// via senderId); carrier BIDS live under shipments/{id}/offers. A freshly created
// shipment is seeded with a few "instant quotes" from the catalog carriers so the
// sender sees real, selectable offers immediately, and live human-carrier bids
// land in the same subcollection on top.

export type OfferStatus = 'pending' | 'accepted' | 'declined';
export type OfferSource = 'instant' | 'carrier';

// A stored bid mirrors the catalog Offer shape (so OfferCard/OfferDetail render it
// unchanged) plus persistence fields.
export type MarketOffer = Offer & {
  id: string;
  status: OfferStatus;
  source: OfferSource;
  note?: string | null;
  createdAt: number;
};

function offersCol(shipmentId: string) {
  return collection(firestore!, 'shipments', shipmentId, 'offers');
}

// Live subscription to the bids on one shipment (newest priced first, AI-choice on top).
export function useShipmentOffers(shipmentId?: string): { offers: MarketOffer[]; loading: boolean } {
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!firestore || !shipmentId) {
      setOffers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      offersCol(shipmentId),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MarketOffer[];
        // AI-choice/instant "best" first, then by price ascending.
        list.sort((a, b) => (b.ai ? 1 : 0) - (a.ai ? 1 : 0) || price(a) - price(b));
        setOffers(list);
        setLoading(false);
      },
      () => { setOffers([]); setLoading(false); }
    );
    return unsub;
  }, [shipmentId]);
  return { offers, loading };
}

function price(o: { price: string }) {
  return parseFloat((o.price || '').replace(/,/g, '')) || 0;
}

// Seed instant quotes from catalog carriers into a shipment that has none yet.
// Idempotent-ish: callers guard on offers.length === 0; safe to call once.
export async function seedInstantOffers(shipmentId: string, draft: ShipmentDraft, carriers: Carrier[]): Promise<void> {
  if (!firestore || !carriers.length) return;
  const generated = buildOffers(draft, carriers).slice(0, 4);
  const batch = writeBatch(firestore);
  generated.forEach((o) => {
    const ref = doc(offersCol(shipmentId));
    batch.set(ref, {
      carrierId: o.carrierId,
      name: o.name,
      initials: o.initials ?? null,
      type: o.type,
      rating: o.rating,
      reviews: o.reviews,
      mode: o.mode,
      price: o.price,
      eta: o.eta,
      verified: o.verified ?? false,
      ai: o.ai ?? false,
      status: 'pending',
      source: 'instant',
      note: null,
      createdAt: Date.now(),
    });
  });
  await batch.commit();
}

// Persist a single generated Offer as a real bid doc and return it with its id.
// Used by the carrier-scoped AI flow that jumps straight to one carrier's offer.
export async function seedOneOffer(shipmentId: string, o: Offer, source: OfferSource = 'instant'): Promise<MarketOffer | null> {
  if (!firestore) return null;
  const payload = {
    carrierId: o.carrierId, name: o.name, initials: o.initials ?? null, type: o.type,
    rating: o.rating, reviews: o.reviews, mode: o.mode, price: o.price, eta: o.eta,
    verified: o.verified ?? false, ai: o.ai ?? false,
    status: 'pending' as OfferStatus, source, note: null, createdAt: Date.now(),
  };
  const ref = await addDoc(offersCol(shipmentId), payload);
  return { id: ref.id, ...payload };
}

// A live human carrier submits a bid on an open shipment.
export async function submitCarrierOffer(
  shipmentId: string,
  bid: { carrierId: string; name: string; initials?: string; type: 'traveller' | 'company'; rating: number; reviews: number; mode: Offer['mode']; price: string; etaEn: string; etaAr: string; note?: string },
): Promise<void> {
  if (!firestore) return;
  await addDoc(offersCol(shipmentId), {
    carrierId: bid.carrierId,
    name: bid.name,
    initials: bid.initials ?? null,
    type: bid.type,
    rating: bid.rating,
    reviews: bid.reviews,
    mode: bid.mode,
    price: bid.price,
    eta: { en: bid.etaEn, ar: bid.etaAr },
    verified: false,
    ai: false,
    status: 'pending',
    source: 'carrier',
    note: bid.note?.trim() || null,
    createdAt: Date.now(),
  });
  // Notify the shipment owner that a new bid arrived.
  notify('new_offer', shipmentId);
}

// Sender accepts one offer: mark it accepted, decline the rest, move the shipment
// to in_transit with the winning carrier's terms. One atomic batch.
export async function acceptOffer(shipmentId: string, offerId: string, winner: MarketOffer, etaText: string): Promise<string> {
  if (!firestore) return '';
  const orderId = '#SB-' + shipmentId.slice(-5).toUpperCase();
  const snap = await getDocs(offersCol(shipmentId));
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: d.id === offerId ? 'accepted' : 'declined' });
  });
  batch.update(doc(firestore, 'shipments', shipmentId), {
    status: 'in_transit',
    carrier: winner.name,
    carrierId: winner.carrierId,
    mode: winner.mode,
    priceKWD: winner.price,
    eta: etaText,
    acceptedOfferId: offerId,
    orderId,
  });
  await batch.commit();
  // Notify the winning carrier that their bid was accepted.
  notify('offer_accepted', shipmentId, { carrierId: winner.carrierId });
  return orderId;
}

// Carrier-facing feed: open shipments (finding_offers) from OTHER senders.
export function useOpenShipments(excludeSenderId?: string | null): { open: Shipment[]; loading: boolean } {
  const [open, setOpen] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!firestore) {
      setOpen([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(firestore, 'shipments'), where('status', '==', 'finding_offers'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((s: any) => s.senderId !== excludeSenderId) as Shipment[];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOpen(list);
        setLoading(false);
      },
      () => { setOpen([]); setLoading(false); }
    );
    return unsub;
  }, [excludeSenderId]);
  return { open, loading };
}
