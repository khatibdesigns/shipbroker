// ShipBroker AI agent client — talks to the Claude-CLI proxy on EC2 (/ship).
// The proxy runs `claude` under a personal subscription (no API tokens) and can
// read an attached photo via the CLI's Read tool to identify the item.

const DEFAULT_API = 'http://16.16.79.251:8090';
const API = (process.env.EXPO_PUBLIC_SHIP_API_URL ?? DEFAULT_API).replace(/\/$/, '');
const SHIP_ENDPOINT = `${API}/ship`;

export type ChatMsg = { role: 'user' | 'assistant'; text: string };

export type ShipMode = 'air' | 'road' | 'sea';

export type ShipmentDraft = {
  item?: string | null;
  category?: string | null;
  fromCity?: string | null;
  toCity?: string | null;
  mode?: ShipMode | null;
  weightKg?: number | null;
  size?: 'small' | 'medium' | 'large' | null;
  dimensions?: { l?: number | null; w?: number | null; h?: number | null } | null;
  timing?: string | null;
  notes?: string | null;
  // freight specifics
  pieces?: number | null;
  cbm?: number | null;
  dims?: { w?: number | null; h?: number | null; d?: number | null } | null;
};

export type ShipTurn = {
  reply: string;
  draft: ShipmentDraft;
  chips: string[];
  ready: boolean;
};

// One conversational turn. Pass the running message history, the current draft,
// the UI language, and (optionally) a base64 photo of the item.
export async function shipTurn(opts: {
  messages: ChatMsg[];
  draft: ShipmentDraft;
  lang?: 'en' | 'ar';
  imageBase64?: string;
  imageMime?: string;
  timeoutMs?: number;
}): Promise<ShipTurn> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 165000);
  try {
    const res = await fetch(SHIP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        messages: opts.messages,
        draft: opts.draft ?? {},
        lang: opts.lang,
        image: opts.imageBase64,
        imageMime: opts.imageMime,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Assistant error (${res.status})`);
    }
    return {
      reply: String(data.reply || ''),
      draft: (data.draft as ShipmentDraft) || opts.draft || {},
      chips: Array.isArray(data.chips) ? data.chips.filter((c: any) => typeof c === 'string') : [],
      ready: !!data.ready,
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The assistant took too long. Please try again.');
    throw new Error(e?.message || 'Could not reach the assistant.');
  } finally {
    clearTimeout(timer);
  }
}

// Human-readable one-line summary of a draft (for tracker/offers headers).
export function draftItemLabel(d: ShipmentDraft): string {
  return (d.item && d.item.trim()) || 'Shipment';
}

const PLAN_ENDPOINT = `${API}/plan`;

// "Ask AI" on an offer — uses the generic Claude proxy (/plan) to assess an offer
// against the shipment. Returns plain text (a few short bullet points).
export async function askAboutOffer(opts: {
  shipment: ShipmentDraft;
  offer: { name: string; mode: string; price: string; eta: string; rating: number; type: string };
  lang?: 'en' | 'ar';
  timeoutMs?: number;
}): Promise<string> {
  const s = opts.shipment;
  const route = [s.fromCity, s.toCity].filter(Boolean).join(' → ') || 'the route';
  const langLine = opts.lang === 'ar' ? 'Reply in Arabic.' : 'Reply in English.';
  const prompt = [
    `You are ShipBroker's shipping assistant. A user is choosing a carrier for a shipment and tapped "Ask AI" on one offer.`,
    `Shipment: ${s.item || 'a shipment'} · ${route} · weight ${s.weightKg ?? '—'} kg · timing ${s.timing || '—'}.`,
    `Offer: ${opts.offer.name} (${opts.offer.type}), transport ${opts.offer.mode}, price ${opts.offer.price} KWD, ETA ${opts.offer.eta}, rating ${opts.offer.rating}/5.`,
    `In 3-4 short bullet points, give a candid assessment: is this good value, is the speed/mode suitable for this shipment, and any trade-off to weigh. Be concise and practical. ${langLine}`,
    `Output plain text bullets only (use "• "). No preamble.`,
  ].join('\n');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
  try {
    const res = await fetch(PLAN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Assistant error (${res.status})`);
    return String(data.text || data.completion || data.result || '').trim();
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The assistant took too long. Please try again.');
    throw new Error(e?.message || 'Could not reach the assistant.');
  } finally {
    clearTimeout(timer);
  }
}
