import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { useAuth } from './auth';
import { ShipmentDraft, ShipMode } from './ai';
import { Payment } from './payments';

// Shipments live top-level at shipments/{id} with a senderId, so carriers can
// discover open ones and bid (bids live at shipments/{id}/offers). The sender's
// own list is a senderId query; surfaced live in Home (tracker), Shipments tab,
// and the Offers header. Owner-locked for writes in firestore.rules.
export type ShipmentStatus = 'finding_offers' | 'booked' | 'in_transit' | 'delivered';

export type Shipment = ShipmentDraft & {
  id: string;
  senderId?: string;
  status: ShipmentStatus;
  createdAt: number;
  carrier?: string;
  carrierId?: string;
  acceptedOfferId?: string;
  orderId?: string;
  priceKWD?: string;
  eta?: string;
  photoUri?: string;
  payment?: Payment;
};

type ShipmentsState = {
  shipments: Shipment[];
  active: Shipment | null; // most recent not-yet-delivered
  create: (draft: ShipmentDraft, extra?: Partial<Shipment>) => Promise<string | null>;
  setStatus: (id: string, status: ShipmentStatus, extra?: Partial<Shipment>) => Promise<void>;
  getById: (id: string) => Shipment | undefined;
};

const Ctx = createContext<ShipmentsState | null>(null);

export function ShipmentsProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    if (!firestore || !uid) {
      setShipments([]);
      return;
    }
    // Query by senderId + sort client-side (avoids a composite index).
    const q = query(collection(firestore, 'shipments'), where('senderId', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Shipment[];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setShipments(list);
      },
      () => setShipments([])
    );
    return unsub;
  }, [uid]);

  const create = useCallback(
    async (draft: ShipmentDraft, extra?: Partial<Shipment>) => {
      if (!firestore || !uid) return null;
      const data = {
        senderId: uid,
        item: draft.item ?? null,
        category: draft.category ?? null,
        fromCity: draft.fromCity ?? null,
        toCity: draft.toCity ?? null,
        mode: (draft.mode ?? null) as ShipMode | null,
        weightKg: draft.weightKg ?? null,
        size: draft.size ?? null,
        dimensions: draft.dimensions ?? null,
        timing: draft.timing ?? null,
        notes: draft.notes ?? null,
        status: 'finding_offers' as ShipmentStatus,
        createdAt: Date.now(),
        ...extra,
      };
      const ref = await addDoc(collection(firestore, 'shipments'), data);
      return ref.id;
    },
    [uid]
  );

  const setStatus = useCallback(
    async (id: string, status: ShipmentStatus, extra?: Partial<Shipment>) => {
      if (!firestore || !uid) return;
      await updateDoc(doc(firestore, 'shipments', id), { status, ...(extra || {}) });
    },
    [uid]
  );

  const value = useMemo<ShipmentsState>(() => {
    const active = shipments.find((s) => s.status !== 'delivered') ?? null;
    return {
      shipments,
      active,
      create,
      setStatus,
      getById: (id: string) => shipments.find((s) => s.id === id),
    };
  }, [shipments, create, setStatus]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShipments(): ShipmentsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShipments must be used within ShipmentsProvider');
  return v;
}

// Display helpers shared across screens.
export function modeLabelEN(m?: ShipMode | null): string {
  return m === 'sea' ? 'Sea' : m === 'air' ? 'Air' : m === 'road' ? 'Road' : '';
}

export function statusLabel(s: ShipmentStatus, t: (en: string, ar?: string) => string): string {
  switch (s) {
    case 'finding_offers':
      return t('Finding offers', 'جارٍ البحث');
    case 'booked':
      return t('Booked', 'محجوزة');
    case 'in_transit':
      return t('In Transit', 'قيد النقل');
    case 'delivered':
      return t('Delivered', 'تم التوصيل');
  }
}
