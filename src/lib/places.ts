// Google Places (New) autocomplete + details, and a Static Maps URL.
// Uses the *new* Places API (places.googleapis.com/v1) — the legacy
// maps/api/place endpoints are not enabled on the project.
const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const placesEnabled = !!KEY;

export type Prediction = { description: string; placeId: string };
export type LatLng = { lat: number; lng: number };

export async function autocomplete(input: string, signal?: AbortSignal): Promise<Prediction[]> {
  if (!KEY || input.trim().length < 2) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
      signal,
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    const suggestions = data?.suggestions || [];
    return suggestions
      .filter((s: any) => s.placePrediction)
      .slice(0, 5)
      .map((s: any) => ({ description: s.placePrediction.text?.text || '', placeId: s.placePrediction.placeId }));
  } catch {
    return [];
  }
}

// Geocode free text (e.g. a saved city name) → coordinates, via Places (New) text search.
export async function geocode(text: string): Promise<LatLng | null> {
  if (!KEY || !text.trim()) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'places.location' },
      body: JSON.stringify({ textQuery: text, maxResultCount: 1 }),
    });
    const data = await res.json();
    const loc = data?.places?.[0]?.location;
    return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
  } catch {
    return null;
  }
}

export async function placeLatLng(placeId: string): Promise<LatLng | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'location' },
    });
    const data = await res.json();
    const loc = data?.location;
    return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
  } catch {
    return null;
  }
}

// Static map image (real tiles) — needs "Maps Static API" enabled on the key's
// project. If it's not, the image 403s and RouteMap falls back to an SVG of the
// real coordinates. Returns null when no key.
export function staticMapUrl(from: LatLng, to: LatLng, width = 640, height = 320): string | null {
  if (!KEY) return null;
  const f = `${from.lat},${from.lng}`;
  const t = `${to.lat},${to.lng}`;
  const parts = [
    `size=${width}x${height}`,
    'scale=2',
    `markers=${encodeURIComponent('color:0x2A2E8F|' + f)}`,
    `markers=${encodeURIComponent('color:0xFF4D4F|' + t)}`,
    `path=${encodeURIComponent('color:0x00B4C4ff|weight:3|geodesic:true|' + f + '|' + t)}`,
    `key=${KEY}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${parts.join('&')}`;
}
