# ShipBroker

A two-sided shipping marketplace for the GCC — senders post a package or shipment;
travellers, logistics companies, freight forwarders, truckers, winch operators and
marine captains bid to move it. Requests are created conversationally via an **AI
Agent** or a step-by-step **Wizard**. Bilingual (English ⇄ العربية) with full RTL,
KWD pricing.

Built from a Claude Design handoff (`claude.ai/design`) as a real Expo / React
Native app — Expo SDK 56, all-JS (Expo Go compatible), no native modules.

## Run

```bash
npm install
npm start        # then scan the QR with Expo Go (iOS/Android)
```

## Firebase

Wired to project **`shipbroker-bc9b3`** via the Firebase **JS SDK** (works in Expo
Go — no native build needed). Config lives in `.env` (`EXPO_PUBLIC_FIREBASE_*`,
gitignored); `.env.example` documents the keys. The app runs fully without config
(local-only state) and lights up cloud auth + sync once the keys are present.

- **Auth (`src/lib/auth.tsx`):** three real providers — **Email/password**,
  **Google**, **Apple** — over an anonymous "guest" baseline, AsyncStorage-persisted.
  The app is gated behind the Welcome screen until signed in.
  - **Email/password works in Expo Go today** (pure JS SDK).
  - **Google + Apple are native modules** — they only run in a **dev build /
    standalone**, not plain Expo Go. They're lazy-required so the JS bundle still
    loads in Expo Go (the buttons just surface "needs a dev build").
  - On first provider sign-in the user's name/email are seeded into the profile;
    Apple's full name (returned only once) is captured too.
  - Enable in Firebase Console → Authentication → Sign-in method: **Anonymous,
    Email/Password, Google, Apple** (all enabled for this project).
  - **Google needs the Web client ID** in `.env`
    (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) — Firebase Console → Auth → Google →
    Web SDK configuration → "Web client ID". The iOS client ID + URL scheme come
    from `GoogleService-Info.plist` and are already set.

### Building a dev client (for Google + Apple)

```bash
# EAS (recommended)
npm i -g eas-cli && eas login
eas build --profile development --platform ios     # or: android

# …or local prebuild + run (needs Xcode / Android Studio)
npx expo prebuild
npx expo run:ios        # or: npx expo run:android
```

The `expo-apple-authentication` + `@react-native-google-signin/google-signin`
config plugins (in `app.config.js`) add the Sign-In-with-Apple entitlement and the
Google URL scheme automatically during prebuild.
- **Firestore:** one doc per user at `users/{uid}` (name, phone, persona, company,
  provider type). The captured name shows in the Home greeting + Account header.
  Rules in `firestore.rules` lock each doc to its owner —
  `firebase deploy --only firestore:rules`.
- **Native builds (EAS):** `google-services.json` + `GoogleService-Info.plist` are
  in the repo root and referenced from `app.config.js`; both are gitignored. Expo
  Go ignores them and uses the JS-SDK web config above.
- Metro needs the `cjs` + `unstable_enablePackageExports=false` resolver tweaks
  (`metro.config.js`) or Firebase Auth fails to register under Hermes.

## Stack

- **Expo SDK 56**, React Native 0.85, TypeScript, Hermes.
- **expo-linear-gradient** for hero / brand gradients, **react-native-svg** for the
  ported icon set, **@expo-google-fonts** (Plus Jakarta Sans + IBM Plex Sans Arabic).
- Lightweight state-based navigator (`src/lib/nav.tsx`) — four tab roots, each with
  its own push/pop stack. No react-navigation, keeps the app pure-JS.
- Bilingual via `src/lib/i18n.tsx` — inline `t(en, ar)` pairs, persisted with
  AsyncStorage; the `English | عربي` toggle flips the whole UI to RTL live (no reload).

## Structure

```
src/
  lib/      theme.ts (design tokens) · i18n.tsx · nav.tsx
  components/ Icon.tsx (SVG glyphs) · ui.tsx (Button, Card, Field, Chip, Seg,
              ModeBadge, Rating, Hero, BottomNav, Sheet, Bubble, Composer, …)
  screens/  HomeScreen · AiAgentScreen · OffersScreens · CarryScreens ·
            AuthScreens · ProviderScreens · B2BScreens · AccountScreen · shared.tsx
  Shell.tsx  route name → component registry
```

## Send with AI (vision shipment builder)

The AI Agent (`src/screens/AiAgentScreen.tsx` + `src/lib/ai.ts`) is a real
conversational flow backed by the Claude-CLI proxy on EC2 (`/ship`, see
`scripts/README.md`):

- **Take or attach a photo** of the item (`expo-image-picker`); the `claude` CLI
  reads it (vision, token-free) to identify the item and estimate category /
  dimensions / weight, and prefills the draft.
- **Chat, one question at a time** — origin, destination, what, size, weight,
  transport mode (air / road / sea), timing — each answerable by typing or tapping
  a quick-reply chip. The agent recommends a mode and honours corrections
  ("change the weight to 20 kg", "make it air").
- A **live shipment summary** fills in as you talk; **Find best offers** persists a
  real shipment and goes to the Offers marketplace.

## Real data (not a static demo)

- **Profile onboarding** — after email / Google / Apple signup the app requires
  name + DOB + phone + gender + address (`users/{uid}` in Firestore) before
  entering; the greeting and Account header are driven by it.
- **Real shipments** — AI-created shipments are saved per user
  (`users/{uid}/shipments`) and surface live in the Home tracker, the Shipments
  tab (active / history with empty states), the Offers header, and tracking; escrow
  confirmation flips the shipment to *In transit*.
- Offers/carriers remain representative samples (no real carrier backend yet).

## Flows (29 screens across 6 sections)

1. **Home** — Send (indigo hero) ⇄ Carry (green hero) toggle, mini-tracker,
   top-rated carriers, earnings + available-packages feed.
2. **AI Agent** — conversational request creation: opening chips → Q&A → photo →
   shipment summary → "finding offers" skeleton → Offers (one interactive screen).
3. **Offers** — travellers + companies competing, AI-Choice badge, sort/filter
   sheet, offer detail, escrow confirmation.
4. **Carry & tracking** — package feed, package detail + make offer, shipments
   (active/history), live tracking timeline.
5. **Auth + provider onboarding** — welcome/login, B2C signup, provider
   registration → type chooser → Freight Forwarder / Trucking / Winch / Marine Captain.
6. **B2B wizard + RFQ** — Create Shipment (5 steps), Schedule & Details sheet,
   services grid, Quick RFQ sheet, add-to-RFQ, combined RFQ cart.

The **Account** tab doubles as a directory into every flow so both the sender and
provider sides are reachable for review.

## Notes for the next pass

- Map / photo areas use the design's striped placeholders — drop in real map tiles
  and imagery when available.
- Forms are presentational (the handoff is a hi-fi prototype); wire real inputs,
  validation, auth and a payments/escrow backend for production.
