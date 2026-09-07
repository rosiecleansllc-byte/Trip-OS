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
    ui/                    Card, StatusTag, SectionHeader, ImagePlaceholder
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

Outfit and capsule-item photos are placeholders (`ImagePlaceholder`).
Drop a real image URL into a capsule item's `imageUrl` or an outfit
board's `imageUrl` in the seed data and it renders in place of the
placeholder automatically.

## Share mode

Toggled from the top bar. Strips confirmation codes, costs, and private
notes from Bookings/Transport/Trip, and hides the Wallet tab entirely —
while keeping dates, places, and the `tip` field (public, trip-level
recommendations) visible. See `src/lib/share.ts`.

## Commands

```
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build
npm run preview   # preview the production build
```
