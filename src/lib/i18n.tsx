import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ShipBroker is bilingual (English ⇄ العربية). The design handoff embeds both
// strings inline at each call site via t(en, ar) — we keep that ergonomic
// pattern instead of a key dictionary, so screens stay readable and self-documenting.

export type Lang = 'en' | 'ar';

type I18nState = {
  lang: Lang;
  isRTL: boolean;
  setLang: (l: Lang) => void;
  toggle: () => void;
  // Pick the language-appropriate string. If no Arabic is supplied, falls back to English.
  t: (en: string, ar?: string) => string;
};

const Ctx = createContext<I18nState | null>(null);
const KEY = 'shipbroker.lang.v1';

function detectDeviceLang(): Lang {
  try {
    const loc = (Intl as any).DateTimeFormat().resolvedOptions().locale as string;
    if (loc.split('-')[0].toLowerCase() === 'ar') return 'ar';
  } catch {}
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDeviceLang());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'en' || v === 'ar') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  };

  const value = useMemo<I18nState>(() => {
    const t = (en: string, ar?: string) => (lang === 'ar' && ar ? ar : en);
    return {
      lang,
      isRTL: lang === 'ar',
      setLang,
      toggle: () => setLang(lang === 'en' ? 'ar' : 'en'),
      t,
    };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used within I18nProvider');
  return v;
}
