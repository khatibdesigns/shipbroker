import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Lightweight state-based navigator: four tab roots, each with its own push/pop
// stack. Avoids react-navigation so the app stays pure-JS / Expo Go friendly.

export type TabKey = 'home' | 'shipments' | 'offers' | 'account';
export type Route = { name: string; params?: any };
export type NavAction = 'push' | 'pop' | 'replace' | 'tab';

const ROOTS: Record<TabKey, Route> = {
  home: { name: 'Home' },
  shipments: { name: 'Shipments' },
  offers: { name: 'Offers' },
  account: { name: 'Account' },
};

type NavState = {
  tab: TabKey;
  current: Route;
  canGoBack: boolean;
  seq: number;
  action: NavAction;
  switchTab: (t: TabKey) => void;
  /** Bottom-nav tap: go to the tab and reset it to its root (pops any pushed screens). */
  selectTab: (t: TabKey) => void;
  push: (name: string, params?: any) => void;
  replace: (name: string, params?: any) => void;
  pop: () => void;
  popToRoot: () => void;
};

const Ctx = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>('home');
  const [stacks, setStacks] = useState<Record<TabKey, Route[]>>({
    home: [],
    shipments: [],
    offers: [],
    account: [],
  });

  // Transition signal for the screen animator: a monotonic seq + the kind of
  // navigation, so the renderer can pick a slide/fade direction.
  const [anim, setAnim] = useState<{ seq: number; action: NavAction }>({ seq: 0, action: 'tab' });
  const bump = useCallback((action: NavAction) => setAnim((a) => ({ seq: a.seq + 1, action })), []);

  const switchTab = useCallback((t: TabKey) => { setTab(t); bump('tab'); }, [bump]);

  // Tapping a bottom-nav item always lands on that tab's root, clearing any
  // screens that were pushed onto it (so e.g. Home always returns to Home).
  const selectTab = useCallback((t: TabKey) => {
    setTab(t);
    setStacks((s) => (s[t].length ? { ...s, [t]: [] } : s));
    bump('tab');
  }, [bump]);

  const push = useCallback(
    (name: string, params?: any) => {
      setStacks((s) => ({ ...s, [tab]: [...s[tab], { name, params }] }));
      bump('push');
    },
    [tab, bump]
  );

  const replace = useCallback(
    (name: string, params?: any) => {
      setStacks((s) => {
        const next = s[tab].slice(0, -1);
        next.push({ name, params });
        return { ...s, [tab]: next };
      });
      bump('replace');
    },
    [tab, bump]
  );

  const pop = useCallback(() => { setStacks((s) => ({ ...s, [tab]: s[tab].slice(0, -1) })); bump('pop'); }, [tab, bump]);

  const popToRoot = useCallback(() => { setStacks((s) => ({ ...s, [tab]: [] })); bump('pop'); }, [tab, bump]);

  const value = useMemo<NavState>(() => {
    const stack = stacks[tab];
    const current = stack.length ? stack[stack.length - 1] : ROOTS[tab];
    return { tab, current, canGoBack: stack.length > 0, seq: anim.seq, action: anim.action, switchTab, selectTab, push, replace, pop, popToRoot };
  }, [tab, stacks, anim, switchTab, selectTab, push, replace, pop, popToRoot]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): NavState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav must be used within NavProvider');
  return v;
}
