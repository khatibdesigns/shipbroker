import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ShipMode } from './ai';
import { IconName } from '../components/Icon';

// A lightweight in-memory RFQ cart shared between the Services screen and the
// RFQ Cart screen. Items are the services a user bundles into one combined RFQ.
export type RfqItem = {
  id: string;
  label: string;
  sub: string;
  icon: IconName;
  mode?: ShipMode;
};

type RfqState = {
  items: RfqItem[];
  count: number;
  add: (item: Omit<RfqItem, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<RfqState | null>(null);

let seq = 0;

export function RfqProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RfqItem[]>([]);

  const add = useCallback((item: Omit<RfqItem, 'id'>) => {
    seq += 1;
    setItems((prev) => [...prev, { ...item, id: `rfq-${seq}` }]);
  }, []);
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<RfqState>(
    () => ({ items, count: items.length, add, remove, clear }),
    [items, add, remove, clear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRfq(): RfqState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRfq must be used within RfqProvider');
  return v;
}
