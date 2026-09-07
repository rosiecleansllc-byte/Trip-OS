# Trip OS

A calm, mobile-first travel command center. Built for **France 2026**
(Paris → Mont-Saint-Michel → the Riviera → Paris, Sept 26–Oct 7), and
structured so any future trip drops in as data, not code.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (design tokens in `src/index.css`)
- React Router (bottom-tab navigation)
- Zustand (`shareMode`, `currentTripId`, persisted to `localStorage`)
- No backend, no auth, no payments — everything lives in static seed data.

## Structure

```
src/
  types/trip.ts          generic data model — no trip-specific fields
  data/
    tripsIndex.ts         registry of all trips
    trips/france-2026.ts  the seeded France trip
  store/useAppStore.ts    share mode + active trip
  lib/                    date, money, share-mode redaction, and
                           privateDocs.ts (device-local IndexedDB store)
  components/
    layout/               TopBar, BottomNav, AppShell
    ui/                    Card, StatusTag, SectionHeader, ImagePlaceholder,
                           ActionRow (Directions/Ticket/Website/Call/…),
                           PrivateDocumentAction (Add/View a device-local
                           ticket/reservation/confirmation, image or PDF),
                           Lightbox (full-screen image viewer, portal-rendered)
  pages/                  Today, Trip, Bookings, Transport, Pack, Wallet
```

## Adding a new trip

1. Create `src/data/trips/<trip-id>.ts` exporting a `Trip` object (see
   `france-2026.ts` for the shape — meta, legs, days, bookings, transport,
   capsule wardrobe, outfit boards).
2. Register it in `src/data/tripsIndex.ts`.
3. Nothing in `pages/` or `components/` references France, Paris, or any
   trip-specific string — the UI renders whatever trip is active.

Multi-trip switching (a trip picker in the UI) isn't wired up yet; the
active trip is `defaultTripId` in `tripsIndex.ts`. Swapping it is a
one-line change until a picker exists.

## Images

Every capsule item and outfit board is an image slot: no `imageUrl` set
renders `ImagePlaceholder` (a labeled gray box); setting one renders the
real photo in its place automatically, same size and position, no other
changes needed. `ImagePlaceholder` defaults to `object-contain` so a real
garment photo is never cropped or distorted, whatever its aspect ratio.

For France 2026, `public/images/` is already populated — all cropped
from the approved master outfit board (`public/images/outfits/
france-2026-master-board.webp`, viewable full-screen from the Pack tab's
"View full outfit board" button):

- `public/images/capsule/<id>.webp` — one crop per capsule piece, id
  matching `src/data/trips/france-2026.ts` (e.g. `c1.webp` is the navy
  trench). A couple of items (the optional rain capelet) have no crop
  since they're not shown on the board — placeholder by design, not an
  oversight.
- `public/images/outfits/day-01.webp` … `day-12.webp` — one crop per
  day's full outfit panel, wired to that day's `OutfitBoard.imageUrl`.

To add a future trip's photos, follow the same pattern: drop files into
those two folders (any naming works, `.webp` recommended) and point each
item's `imageUrl` at the path. Any public URL works too, not just local
files.

## Share mode

Toggled from the top bar. Strips confirmation codes, costs, and private
notes from Bookings/Transport/Trip, and hides the Wallet tab entirely —
while keeping dates, places, and the `tip` field (public, trip-level
recommendations) visible. See `src/lib/share.ts`.

### Action links (Directions / Ticket / Website / Reservation / Menu / Call / Modify / private documents)

`Booking`, `Transport`, and `ScheduleItem` all extend `LinkActions`
(`src/types/trip.ts`), rendered as one-tap buttons by
`components/ui/ActionRow.tsx`. Some of those fields are easy to mix up,
so read this before adding a link:

- **`ticketUrl`** — public. The general info/purchase page anyone could
  use (a museum's ticketing site, a venue's box office). Always visible,
  Share mode included.
- **`privateTicketUrl`** — private. *This trip's actual* purchased
  e-ticket, PDF, or QR-code **link** from the confirmation email. **Never**
  put a personal ticket link in `ticketUrl` — use `privateTicketUrl`
  instead. ActionRow prefers it over `ticketUrl` for the Ticket button
  outside Share mode, and ignores it completely inside Share mode — if
  it's the only ticket link an item has, the Ticket button just doesn't
  render in Share mode rather than falling back to it.
- **`modifyUrl`** — private, same treatment as `privateTicketUrl` (a
  personal manage/cancel link for the booking).
- **`privateDocumentKey`** (+ optional `privateDocumentLabel` /
  `privateDocumentType`) — private, same treatment again, but for a
  **file the traveler adds themselves on their own device**, not
  anything shipped with the app. See "Private documents" below — this is
  the one field here that is never a URL and never seed data.

This is enforced once, centrally, in `ActionRow` — not per-page — so
there's a single place to audit if a new private field is ever added.

### Private documents (reservation confirmations, QR tickets)

Trip OS has no backend and no login, by design (see Stack, above) — which
means there is no server that could authenticate a request for a
"private" file. Anything committed to `public/` or bundled into the JS is
downloadable by anyone with the deployed URL, Share mode or not. So a
traveler's actual reservation confirmations, order receipts, and
QR-code tickets are **never** part of the repo or the seed data. Instead:

- `LinkActions.privateDocumentKey` names a slot (e.g.
  `'le-procope-ticket'`) — set it on a `Booking`, `Transport`, and/or the
  matching day's `ScheduleItem` that represent the same real-world
  document; using the same key across all of them means adding the file
  once makes it show up everywhere that item appears (Today, Bookings,
  Transport).
- `PrivateDocumentAction` (`components/ui/PrivateDocumentAction.tsx`)
  renders an **"Add {ticket/reservation/confirmation/receipt}"** button
  until the traveler picks a file (image or PDF) from their own phone —
  it's written straight into this browser's IndexedDB via
  `lib/privateDocs.ts` and never sent anywhere. Once stored, the same spot
  shows **"View {…}"** instead, opening images in the existing `Lightbox`
  (full quality, no compression, `touch-pinch-zoom` for mobile) and PDFs
  in a new tab via the browser's native viewer.
- `privateDocumentType` (`'ticket' | 'reservation' | 'confirmation' |
  'receipt'`) picks the button wording automatically; set
  `privateDocumentLabel` only to override it.
- The document lives only in that one browser's IndexedDB — a different
  device, or Share mode on the same device, shows the "Add" button again
  rather than exposing anything, and there's nothing for Share mode to
  redact because ActionRow never even renders `PrivateDocumentAction`
  when `shareMode` is true.

If this app ever gets real backend/auth infrastructure, a hosted private
document would need its own reviewed field — don't repurpose
`privateDocumentKey` to point at a URL.

### Public travel resources

`TravelResource` (`src/types/trip.ts`) is for the opposite case: a
reference link that's genuinely fine to share — an official transit map,
a visa-requirements page, and so on. Add entries to `Trip.resources`;
Transport renders them in their own "Travel resources" section, visually
separate from booked legs. `isPrivate` exists only to exclude one from
Share mode without deleting it — leave it unset for the normal, fully
public case.

A resource's `resourceUrl` can point anywhere — an external site, or a
generic (non-personal) file committed under `public/documents/<trip-id>/`
the same way images live under `public/images/<trip-id>/`. Unlike a
private document, a public resource file has no traveler-specific data
in it, so committing it is fine; France 2026's Paris Transit Map
(`public/documents/france-2026/paris-transit-map.pdf`, the official
Île-de-France Mobilités network map) is an example.

## Commands

```
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```
