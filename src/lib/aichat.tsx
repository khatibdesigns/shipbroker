import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from './i18n';
import { shipTurn, ChatMsg, ShipmentDraft } from './ai';

// The AI-agent conversation lives here (not in the screen) so it survives
// navigating away and back — and is restored after an app restart. An in-flight
// turn also keeps running while the screen is unmounted.
export type UiMsg = { role: 'user' | 'assistant'; text: string; uri?: string; err?: boolean };

type SendOpts = { text?: string; imageBase64?: string; imageMime?: string; uri?: string };

type AiChatState = {
  messages: UiMsg[];
  draft: ShipmentDraft;
  chips: string[];
  ready: boolean;
  loading: boolean;
  started: boolean; // user has sent at least one message
  send: (opts: SendOpts) => Promise<void>;
  reset: () => void;
};

const Ctx = createContext<AiChatState | null>(null);
const KEY = 'shipbroker.aichat.v1';

function greetingFor(t: (en: string, ar?: string) => string) {
  return t(
    'Hi! Tell me what you want to send, or add a photo of the item and I’ll identify it for you.',
    'مرحباً! أخبرني بما تريد إرساله، أو أضف صورة للغرض وسأتعرّف عليه.'
  );
}
function starterChips(t: (en: string, ar?: string) => string) {
  return [t('Send a package', 'إرسال طرد'), t('Electronics', 'إلكترونيات'), t('Documents', 'مستندات')];
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<UiMsg[]>([{ role: 'assistant', text: greetingFor(t) }]);
  const [draft, setDraft] = useState<ShipmentDraft>({});
  const [chips, setChips] = useState<string[]>(starterChips(t));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Keep the latest values for use inside async send without stale closures.
  const ref = useRef({ messages, draft });
  ref.current = { messages, draft };

  // Restore a previous in-progress conversation.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const s = JSON.parse(raw);
          if (Array.isArray(s.messages) && s.messages.length) {
            setMessages(s.messages);
            setDraft(s.draft || {});
            setChips(s.chips || []);
            setReady(!!s.ready);
            setStarted(!!s.started);
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Persist whenever the conversation changes (after hydration, once started).
  useEffect(() => {
    if (!hydrated || !started) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ messages, draft, chips, ready, started })).catch(() => {});
  }, [hydrated, started, messages, draft, chips, ready]);

  const send = useCallback(
    async (opts: SendOpts) => {
      if (loading) return;
      const userText = opts.text?.trim() || (opts.uri ? t('Here’s a photo of my item', 'هذه صورة الغرض') : '');
      if (!userText && !opts.imageBase64) return;
      const userMsg: UiMsg = { role: 'user', text: userText, uri: opts.uri };
      const history: ChatMsg[] = [...ref.current.messages, userMsg].map((m) => ({ role: m.role, text: m.text }));
      setMessages((m) => [...m, userMsg]);
      setChips([]);
      setStarted(true);
      setLoading(true);
      try {
        const turn = await shipTurn({ messages: history, draft: ref.current.draft, lang, imageBase64: opts.imageBase64, imageMime: opts.imageMime });
        setDraft(turn.draft);
        setReady(turn.ready);
        setChips(turn.chips);
        setMessages((m) => [...m, { role: 'assistant', text: turn.reply }]);
      } catch (e: any) {
        setMessages((m) => [...m, { role: 'assistant', text: '⚠️ ' + (e?.message || t('Something went wrong.', 'حدث خطأ ما.')), err: true }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, lang, t]
  );

  const reset = useCallback(() => {
    setMessages([{ role: 'assistant', text: greetingFor(t) }]);
    setDraft({});
    setChips(starterChips(t));
    setReady(false);
    setStarted(false);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, [t]);

  const value = useMemo<AiChatState>(
    () => ({ messages, draft, chips, ready, loading, started, send, reset }),
    [messages, draft, chips, ready, loading, started, send, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAiChat(): AiChatState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAiChat must be used within AiChatProvider');
  return v;
}
