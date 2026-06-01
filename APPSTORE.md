# ShipBroker — App Store Connect listing

All copy is within Apple's character limits. Replace the contact email / domain
placeholders before submitting.

---

## App information

- **Name** (≤30): `ShipBroker`
- **Subtitle** (≤30): `Send & carry across the GCC`
- **Bundle ID**: `com.khd.shipbroker`
- **Primary category**: Business · **Secondary**: Travel
- **Age rating**: 4+
- **Price**: Free

## Promotional Text (≤170, editable without review)

> Post a package and watch travellers and licensed companies compete to deliver it — by air, road, or sea. Build your shipment by chat or photo with the AI agent.

## Keywords (≤100, comma-separated)

```
shipping,freight,courier,cargo,delivery,logistics,send package,carry,GCC,Kuwait,sea freight,air,trucking,RFQ
```

## Description (≤4000)

ShipBroker is a two-sided shipping marketplace for the GCC. Whether you’re sending a single parcel or a full container, post what you need and let travellers and licensed companies compete to move it — then pick the offer that fits your budget and timeline. Payments are held securely until delivery.

CREATE A SHIPMENT IN SECONDS
• AI Agent — just chat, or snap a photo of your item and the assistant identifies it and fills in the details for you. It asks one simple question at a time: where from, where to, size, weight, and how fast.
• Step-by-step Wizard — a guided form for businesses, with the right fields for each service (air, sea, road, winch, marine, warehousing). Pick pieces and dimensions and we calculate total weight and volume (CBM) automatically.

ONE SHIPMENT, MANY OFFERS
• Travellers already heading your way and licensed logistics companies bid on the same shipment, side by side.
• Compare price, delivery time, transport mode, and ratings at a glance.
• Not sure which to choose? Tap “Ask AI” on any offer for a quick, candid assessment.

MOVE IT YOUR WAY
• Air, road, or sea — choose what suits your cargo and deadline.
• Peer-to-peer for small parcels and documents; commercial freight for pallets, containers, vehicles, and boats.

TRUST & SAFETY BUILT IN
• Payments held in escrow and released on delivery.
• Verified carriers with ratings, reviews, on-time records, and delivery history.
• Track every shipment from pickup to delivery.

EARN BY CARRYING
• Travelling anyway? Browse packages that match your route and earn on trips you’re already making.

MADE FOR THE REGION
• Fully bilingual — English and العربية with complete right-to-left support.
• KWD pricing and GCC-first routes.

Send smarter. Carry more. ShipBroker.

## What’s New (v1.0)

> Welcome to ShipBroker! Create a shipment by chat or photo with our AI agent, compare offers from travellers and companies, pay securely with escrow, and track every delivery — all bilingual (English / العربية).

---

## URLs

- **Privacy Policy URL** (required): `https://khatibdesigns.github.io/shipbroker/privacy.html`
- **Support URL** (required): `https://khatibdesigns.github.io/shipbroker/support.html`
- **Marketing URL** (optional): `https://khatibdesigns.github.io/shipbroker/`

> Served from the repo's `gh-pages` branch. Enable once: repo **Settings → Pages →
> Source: Deploy from a branch → Branch: `gh-pages` / `(root)` → Save**. Repo must
> be public (or GitHub Pro) for Pages on the free tier.

Ready-to-host pages are in `site/` (privacy.html, support.html, index.html).
Host them anywhere static (the EC2 box, GitHub Pages, Netlify, or a subpath of an
existing domain) and paste the resulting URLs above.

Support contact email used in the pages: `nader@khatibdesigns.com` (change if needed).

---

## App Privacy (data-collection questionnaire)

ShipBroker does **not** use tracking and does **not** show ads. Answer the
questionnaire as follows (all uses = “App Functionality”, not linked to tracking):

Data collected and linked to the user’s identity:
- **Contact Info**: name, email address, phone number, physical address (account profile).
- **User Content**: photos you attach, shipment details, and messages to the AI agent.
- **Identifiers**: user ID (Firebase Auth).
- **Sensitive Info**: gender and date of birth (collected at signup; optional fields).
- **Other Data**: shipment origin/destination you type or search.

Not collected:
- Precise device location (the app never accesses GPS; place search is text-based).
- Browsing history, contacts, health, financial account numbers.
- No data is used for tracking or advertising.

Third-party processors (data shared only to provide the service):
- **Google Firebase** (Authentication + Cloud Firestore) — account and shipment data.
- **Google Maps Platform** (Places + Static Maps) — place searches you type for pickup/destination.
- **AI assistant backend** — the item photo and your chat messages are sent to our
  server to generate the shipment summary; the photo is processed transiently and
  deleted after analysis.

Account deletion: users can sign out; to request account + data deletion, contact
support (see Support page).
