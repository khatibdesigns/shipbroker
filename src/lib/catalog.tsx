import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { useAuth } from './auth';
import { ModeKey } from './theme';
import { ShipmentDraft } from './ai';

// Shared catalog (carriers + available packages) lives in Firestore — no static
// UI arrays. Seeded once on first run if the collections are empty.
export type Review = { author: string; initials: string; rating: number; text: string; days: number };

export type Carrier = {
  id: string;
  name: string;
  type: 'traveller' | 'company';
  rating: number;
  reviews: number;
  modes: ModeKey[];
  initials: string;
  verified?: boolean;
  // profile detail
  deliveries: number;
  onTimePct: number;
  memberSince: number;
  responseMins: number;
  routes: string[];
  bio: string;
  reviewList: Review[];
};

export type AvailablePackage = {
  id: string;
  item: string;
  category: string;
  fromCity: string;
  toCity: string;
  weightKg: number;
  fit: string;
  eta: string;
  urgent?: boolean;
  value?: string;
  senderName: string;
  senderInitials: string;
  senderRating: number;
  senderReviews: number;
};

export type Offer = {
  carrierId: string;
  name: string;
  initials: string;
  type: 'traveller' | 'company';
  rating: number;
  reviews: number;
  mode: ModeKey;
  price: string; // formatted KWD, e.g. "240.000"
  eta: { en: string; ar: string };
  verified?: boolean;
  ai?: boolean;
};

const CARRIERS_SEED: Carrier[] = [
  {
    id: 'gulf-sea-lines', name: 'Gulf Sea Lines', type: 'company', rating: 4.9, reviews: 1240, modes: ['sea', 'road'], initials: 'GS', verified: true,
    deliveries: 1180, onTimePct: 98, memberSince: 2016, responseMins: 18, routes: ['Kuwait → Jeddah', 'Kuwait → Europe', 'Shuwaikh → Marseille'],
    bio: 'Licensed GCC freight forwarder specialising in FCL/LCL sea freight and cross-border trucking. Customs clearance included.',
    reviewList: [
      { author: 'Ahmad N.', initials: 'AN', rating: 5, text: 'Shipped a car Kuwait→Paris. Arrived on time, great comms throughout.', days: 4 },
      { author: 'Hessa M.', initials: 'HM', rating: 5, text: 'Very professional, handled customs paperwork end to end.', days: 12 },
    ],
  },
  {
    id: 'skycargo-express', name: 'SkyCargo Express', type: 'company', rating: 4.7, reviews: 540, modes: ['air'], initials: 'SC', verified: true,
    deliveries: 505, onTimePct: 96, memberSince: 2018, responseMins: 9, routes: ['Kuwait → London', 'Kuwait → Istanbul', 'Kuwait → Dubai'],
    bio: 'Air freight specialist for urgent documents and goods. Next-day options across the GCC and Europe.',
    reviewList: [
      { author: 'Yara K.', initials: 'YK', rating: 5, text: 'Documents in London next morning. Worth every fils.', days: 2 },
      { author: 'Tariq S.', initials: 'TS', rating: 4, text: 'Fast, slightly pricey but reliable for urgent items.', days: 20 },
    ],
  },
  {
    id: 'gulf-logistics', name: 'Gulf Logistics', type: 'company', rating: 4.8, reviews: 1200, modes: ['sea', 'road'], initials: 'GL', verified: true,
    deliveries: 1140, onTimePct: 97, memberSince: 2014, responseMins: 22, routes: ['Kuwait → Dammam', 'Kuwait → Doha', 'Kuwait → Riyadh'],
    bio: 'Full-service logistics: warehousing, road freight and reefer transport across the GCC.',
    reviewList: [
      { author: 'Noura A.', initials: 'NA', rating: 5, text: 'Moved 3 pallets to Riyadh, smooth and well-tracked.', days: 7 },
      { author: 'Bader Q.', initials: 'BQ', rating: 5, text: 'Their warehousing + delivery combo saved us a lot.', days: 15 },
    ],
  },
  {
    id: 'desertline-trucking', name: 'DesertLine Trucking', type: 'company', rating: 4.6, reviews: 320, modes: ['road'], initials: 'DL', verified: true,
    deliveries: 298, onTimePct: 95, memberSince: 2019, responseMins: 25, routes: ['Kuwait → Dammam', 'Kuwait → Doha'],
    bio: 'Flatbed and lowbed trucking for heavy and oversized cargo across the GCC.',
    reviewList: [
      { author: 'Salem R.', initials: 'SR', rating: 5, text: 'Flatbed for machinery to Dammam — careful and on time.', days: 9 },
      { author: 'Dana F.', initials: 'DF', rating: 4, text: 'Good service, driver kept me updated the whole way.', days: 28 },
    ],
  },
  {
    id: 'omar-khalid', name: 'Omar Khalid', type: 'traveller', rating: 4.9, reviews: 218, modes: ['road', 'air'], initials: 'OK',
    deliveries: 206, onTimePct: 99, memberSince: 2021, responseMins: 6, routes: ['Kuwait → Dubai', 'Kuwait → Bahrain'],
    bio: 'Frequent traveller between Kuwait and the GCC. Happy to carry documents and small parcels.',
    reviewList: [
      { author: 'Maha L.', initials: 'ML', rating: 5, text: 'Carried my phone to Dubai, met up exactly as agreed.', days: 3 },
      { author: 'Khaled T.', initials: 'KT', rating: 5, text: 'Super friendly and trustworthy, will use again.', days: 11 },
    ],
  },
  {
    id: 'sara-a', name: 'Sara A.', type: 'traveller', rating: 4.9, reviews: 34, modes: ['air'], initials: 'SA',
    deliveries: 31, onTimePct: 100, memberSince: 2023, responseMins: 12, routes: ['Kuwait → Paris', 'Kuwait → London'],
    bio: 'Cabin-crew, flying Kuwait↔Europe weekly. Small items and documents only.',
    reviewList: [
      { author: 'Reem H.', initials: 'RH', rating: 5, text: 'Took my sneakers to Paris, perfect condition.', days: 6 },
      { author: 'Omar B.', initials: 'OB', rating: 5, text: 'Lovely person, very careful with the package.', days: 18 },
    ],
  },
  {
    id: 'yousef-m', name: 'Yousef M.', type: 'traveller', rating: 4.7, reviews: 96, modes: ['road'], initials: 'YM',
    deliveries: 90, onTimePct: 96, memberSince: 2022, responseMins: 14, routes: ['Kuwait → Dammam', 'Kuwait → Doha'],
    bio: 'Drive across the GCC most weekends. Can take medium parcels and boxes.',
    reviewList: [
      { author: 'Fahad A.', initials: 'FA', rating: 5, text: 'Drove my parts to Dammam same day, great guy.', days: 5 },
      { author: 'Latifa S.', initials: 'LS', rating: 4, text: 'Reliable and communicative.', days: 22 },
    ],
  },
  {
    id: 'layla-h', name: 'Layla H.', type: 'traveller', rating: 4.8, reviews: 150, modes: ['air', 'road'], initials: 'LH',
    deliveries: 142, onTimePct: 98, memberSince: 2020, responseMins: 8, routes: ['Kuwait → Istanbul', 'Kuwait → Dubai'],
    bio: 'Travel often for work. Documents, electronics and small gifts welcome.',
    reviewList: [
      { author: 'Sami D.', initials: 'SD', rating: 5, text: 'Carried a laptop to Istanbul, smooth handover.', days: 8 },
      { author: 'Aisha N.', initials: 'AN', rating: 5, text: 'On time and very kind, highly recommend.', days: 19 },
    ],
  },
];

const PACKAGES_SEED: AvailablePackage[] = [
  { id: 'pk-docs-dxb', item: 'Documents', category: 'documents', fromCity: 'Kuwait', toCity: 'Dubai', weightKg: 0.5, fit: 'Backpack', eta: '10 days', value: '20 KWD', senderName: 'Mona K.', senderInitials: 'MK', senderRating: 4.8, senderReviews: 41 },
  { id: 'pk-sneakers-par', item: 'Sneakers (size 42)', category: 'apparel', fromCity: 'Kuwait', toCity: 'Paris', weightKg: 2, fit: 'Carry-On', eta: '14 days', value: '60 KWD', senderName: 'Sara A.', senderInitials: 'SA', senderRating: 4.9, senderReviews: 34 },
  { id: 'pk-phone-kwi', item: 'Phone + charger', category: 'electronics', fromCity: 'Riyadh', toCity: 'Kuwait', weightKg: 1, fit: 'Backpack', eta: '7 days', value: '180 KWD', senderName: 'Khalid R.', senderInitials: 'KR', senderRating: 4.7, senderReviews: 88 },
  { id: 'pk-spare-kwi', item: 'Spare part', category: 'auto', fromCity: 'Doha', toCity: 'Kuwait', weightKg: 5, fit: 'Sports Bag', eta: 'ASAP', urgent: true, value: '95 KWD', senderName: 'Faisal T.', senderInitials: 'FT', senderRating: 4.6, senderReviews: 53 },
];

type CatalogState = {
  carriers: Carrier[];
  packages: AvailablePackage[];
  topCarriers: Carrier[];
  getPackage: (id: string) => AvailablePackage | undefined;
  getCarrier: (id: string) => Carrier | undefined;
};

const Ctx = createContext<CatalogState | null>(null);

// Bump when the seed data shape changes so existing docs get re-seeded/migrated.
const CATALOG_VERSION = 2;

async function seedCatalog() {
  if (!firestore) return;
  try {
    const meta = await getDoc(doc(firestore, 'carriers', '_meta'));
    const ver = meta.exists() ? (meta.data() as any).version || 0 : 0;
    if (ver >= CATALOG_VERSION) return;
    await Promise.all(CARRIERS_SEED.map((c) => setDoc(doc(firestore!, 'carriers', c.id), c)));
    await Promise.all(PACKAGES_SEED.map((p) => setDoc(doc(firestore!, 'packages', p.id), p)));
    await setDoc(doc(firestore!, 'carriers', '_meta'), { version: CATALOG_VERSION });
  } catch {}
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [packages, setPackages] = useState<AvailablePackage[]>([]);

  useEffect(() => {
    if (!firestore) return;
    // Seed/migrate once we have an authenticated user (rules require auth to write).
    if (uid) seedCatalog();
    const unsubC = onSnapshot(
      query(collection(firestore, 'carriers'), orderBy('rating', 'desc')),
      (s) => setCarriers(s.docs.filter((d) => d.id !== '_meta').map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {}
    );
    const unsubP = onSnapshot(collection(firestore, 'packages'), (s) => setPackages(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
    return () => { unsubC(); unsubP(); };
  }, [uid]);

  const value = useMemo<CatalogState>(
    () => ({
      carriers,
      packages,
      topCarriers: carriers.slice(0, 6),
      getPackage: (id: string) => packages.find((p) => p.id === id),
      getCarrier: (id: string) => carriers.find((c) => c.id === id),
    }),
    [carriers, packages]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCatalog must be used within CatalogProvider');
  return v;
}

/* ---------------- offer generation (dynamic, from the carriers pool) ---------------- */

const PER_KG: Record<ModeKey, number> = { air: 0.85, road: 0.35, sea: 0.18 };
const BASE: Record<ModeKey, number> = { air: 120, road: 55, sea: 38 };
const ETA: Record<ModeKey, { en: string; ar: string }[]> = {
  air: [{ en: 'Next day', ar: 'اليوم التالي' }, { en: 'Tomorrow, 6 PM', ar: 'غداً، ٦ م' }],
  road: [{ en: 'Tomorrow, 10 AM', ar: 'غداً، ١٠ ص' }, { en: '2–3 days', ar: '٢–٣ أيام' }],
  sea: [{ en: '3–4 days', ar: '٣–٤ أيام' }, { en: '5–6 days', ar: '٥–٦ أيام' }],
};

function fmtKWD(n: number) {
  return `${Math.round(n).toLocaleString('en-US')}.000`;
}

// Build offers for a shipment from the seeded carriers. Each carrier quotes on a
// mode it supports (preferring the shipment's requested mode). One is flagged AI Choice.
export function buildOffers(draft: ShipmentDraft, carriers: Carrier[]): Offer[] {
  const kg = draft.weightKg ?? 1;
  const want = draft.mode as ModeKey | undefined;
  const offers: Offer[] = carriers.map((c, i) => {
    const mode: ModeKey = want && c.modes.includes(want) ? want : c.modes[0];
    const price = BASE[mode] + PER_KG[mode] * kg;
    return {
      carrierId: c.id,
      name: c.name,
      initials: c.initials,
      type: c.type,
      rating: c.rating,
      reviews: c.reviews,
      mode,
      price: fmtKWD(price),
      eta: ETA[mode][i % 2],
      verified: c.verified,
    };
  });
  // AI Choice: prefer one matching the requested mode, best rating; else best rating overall.
  const pool = want ? offers.filter((o) => o.mode === want) : offers;
  const best = (pool.length ? pool : offers).reduce((a, b) => (b.rating > a.rating ? b : a));
  return offers
    .map((o) => ({ ...o, ai: o.carrierId === best.carrierId }))
    .sort((a, b) => (a.ai === b.ai ? b.rating - a.rating : a.ai ? -1 : 1));
}
