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
  lib/                    date, money, and share-mode redaction helpers
  components/
    layout/               TopBar, BottomNav, AppShell
    ui/                    Card, StatusTag, SectionHeader, ImagePlaceholder,
                           ActionRow (Directions/Ticket/Website/Call/…),
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

### Action links (Directions / Ticket / Website / Reservation / Menu / Call / Modify)

`Booking`, `Transport`, and `ScheduleItem` all extend `LinkActions`
(`src/types/trip.ts`), rendered as one-tap buttons by
`components/ui/ActionRow.tsx`. Two of those fields are easy to mix up,
so read this before adding a link:

- **`ticketUrl`** — public. The general info/purchase page anyone could
  use (a museum's ticketing site, a venue's box office). Always visible,
  Share mode included.
- **`privateTicketUrl`** — private. *This trip's actual* purchased
  e-ticket, PDF, or QR-code link from the confirmation email. **Never**
  put a personal ticket link in `ticketUrl` — use `privateTicketUrl`
  instead. ActionRow prefers it over `ticketUrl` for the Ticket button
  outside Share mode, and ignores it completely inside Share mode — if
  it's the only ticket link an item has, the Ticket button just doesn't
  render in Share mode rather than falling back to it.
- **`modifyUrl`** — private, same treatment as `privateTicketUrl` (a
  personal manage/cancel link for the booking).

This is enforced once, centrally, in `ActionRow` — not per-page — so
there's a single place to audit if a new private field is ever added.

## Commands

```
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```
