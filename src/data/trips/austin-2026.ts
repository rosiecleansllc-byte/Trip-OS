import type { Trip } from '../../types/trip'

// Seed data for Trip 2: Austin + Waco 2026 — the real-world beta for
// Trip OS's multi-trip architecture. Two confirmed flights, one hotel that
// only covers part of the stay, and one confirmed event ticket, plus a
// deliberately unfinished back half (lodging + Austin↔Waco transport)
// modeled as OpenItems rather than guessed. Nothing here is placeholder
// content invented for the demo — it's the real trip as booked so far.

export const austinTrip: Trip = {
  meta: {
    id: 'austin-2026',
    name: 'Austin + Waco',
    destinationLabel: 'Austin + Waco, Texas',
    startDate: '2026-09-09',
    endDate: '2026-09-13',
    timeZone: 'America/Chicago',
    travelers: [
      { id: 't1', name: 'You' },
      { id: 't2', name: 'Blake' },
    ],
    homeCurrency: 'USD',
    tripCurrency: 'USD',
    status: 'upcoming',
    coverImageUrl: '/images/trip-covers/austin-waco-2026.webp',
    coverAlt: 'Austin, Texas cowgirl poster pointing toward a map of Texas',
    coverPosition: 'center 20%',
  },

  legs: [
    { id: 'austin', name: 'Austin', order: 1 },
    { id: 'waco', name: 'Waco', order: 2 },
  ],

  weatherLocations: [
    { id: 'wx-austin', name: 'Austin', city: 'Austin', country: 'US', latitude: 30.2672, longitude: -97.7431, relatedLegId: 'austin' },
    { id: 'wx-waco', name: 'Waco', city: 'Waco', country: 'US', latitude: 31.5493, longitude: -97.1467, relatedLegId: 'waco' },
  ],

  days: [
    {
      id: 'd1',
      date: '2026-09-09',
      dayNumber: 1,
      legId: 'austin',
      title: 'Travel to Austin',
      outfitNote: 'Comfortable travel clothes for the flight.',
      // Two looks today — the flight outfit, then a bottoms swap for
      // Franklin's BBQ after arriving — see outfitBoards below.
      outfitBoardIds: ['ob1-travel', 'ob1-franklin'],
      scheduleItems: [
        // No real time for the drive to the airport — sortOrder just
        // keeps it at the top of the day once a manual item (which
        // always carries a real time) merges in and forces a resort;
        // see scheduleSortValue (lib/date.ts) for why an untimed item
        // needs this to avoid sinking to the very end of the list.
        { id: 'd1-1', label: 'Travel to ATL', type: 'transport', sortOrder: 720 },
        {
          id: 'd1-2',
          time: '16:19',
          label: 'Frontier ATL → AUS',
          type: 'transport',
          location: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
          // Airport/security context lives here rather than as its own
          // standalone schedule row — it's part of getting on this
          // flight, not a separate itinerary stop.
          notes: 'Arrive with time for ATL airport security. Direct, 2h 29m, economy.',
          websiteUrl: 'https://www.flyfrontier.com',
          privateDocumentKey: 'austin-frontier-outbound-confirmation',
          privateDocumentType: 'confirmation',
        },
        { id: 'd1-3', time: '17:48', label: 'Arrive Austin (AUS)', type: 'transport', location: 'Austin-Bergstrom International Airport (AUS)' },
        {
          id: 'd1-4',
          label: 'Uber: AUS → Franklin Barbecue',
          type: 'transport',
          location: 'Austin-Bergstrom International Airport (AUS)',
          sortOrder: 1075, // just after the 17:48 arrival
        },
        { id: 'd1-5', label: 'Franklin Barbecue', type: 'meal', location: 'Franklin Barbecue, Austin, TX', sortOrder: 1090 },
        {
          id: 'd1-6',
          label: 'Uber: Franklin Barbecue → Hyatt House Austin/Downtown',
          type: 'transport',
          location: 'Franklin Barbecue, Austin, TX',
          sortOrder: 1110,
        },
        {
          id: 'd1-7',
          label: 'Check in at Hyatt House Austin/Downtown',
          type: 'lodging',
          location: 'Hyatt House Austin/Downtown, 901 Neches Street, Austin, TX 78701',
          phone: '+1 512 391 0000',
          notes: 'King Room, 2 adults, breakfast included. Covers Sept. 9–11 only — booked via Booking.com.',
          privateDocumentKey: 'austin-hyatt-booking-confirmation',
          privateDocumentType: 'confirmation',
          sortOrder: 1130,
        },
        { id: 'd1-8', label: 'Easy dinner / settle in', type: 'meal', sortOrder: 1200 },
      ],
    },
    {
      id: 'd2',
      date: '2026-09-10',
      dayNumber: 2,
      legId: 'austin',
      title: 'Austin',
      outfitNote: 'Casual Austin exploring.',
      outfitBoardId: 'ob2-exploring',
      // None of these have a real time yet, but each still gets a
      // sortOrder (lib/date.ts scheduleSortValue) so they hold their
      // correct relative order — instead of all sinking to the end,
      // in whatever order they happen to be authored — the moment a
      // manual item with a real time merges into this day.
      scheduleItems: [
        { id: 'd2-1', label: 'Breakfast at Hyatt House', type: 'meal', sortOrder: 480 },
        { id: 'd2-2', label: 'Austin exploration / activities TBD', type: 'free', sortOrder: 600 },
        { id: 'd2-3', label: 'Lunch TBD', type: 'meal', sortOrder: 780 },
        { id: 'd2-4', label: 'Dinner TBD', type: 'meal', sortOrder: 1140 },
      ],
    },
    {
      id: 'd3',
      date: '2026-09-11',
      dayNumber: 3,
      legId: 'waco',
      title: 'Austin → Waco',
      outfitNote: 'Comfortable clothes for checkout and travel.',
      outfitBoardId: 'ob3-waco',
      // The actual Austin → Waco transition is a real transportation item
      // the traveler adds herself (see lib/manualItems.ts) — no seeded
      // placeholder here to avoid ever showing both a real timed leg and
      // an untimed "Travel Austin → Waco" stand-in on the same day.
      scheduleItems: [
        { id: 'd3-1', label: 'Breakfast at Hyatt House', type: 'meal', sortOrder: 480 },
        { id: 'd3-2', label: 'Pack / checkout', type: 'free', sortOrder: 600 },
        { id: 'd3-3', time: '11:00', label: 'Hyatt House checkout by 11:00 AM', type: 'lodging', location: 'Hyatt House Austin/Downtown, Austin' },
      ],
    },
    {
      id: 'd4',
      date: '2026-09-12',
      dayNumber: 4,
      legId: 'waco',
      title: 'You × AI Summit / Waco',
      outfitNote: 'Summit outfit.',
      outfitBoardId: 'ob4-summit',
      // A full Waco day — Fairfield Inn by Marriott Waco (a real,
      // manually-added stay, not seeded here) covers the night of the
      // 12th, so this day never returns to Austin.
      scheduleItems: [
        {
          id: 'd4-2',
          label: 'Arrive for Summit',
          type: 'transport',
          location: 'The Performing Arts Community Center, Waco, TX',
          sortOrder: 450, // ahead of the 08:00 Summit start
        },
        {
          id: 'd4-3',
          time: '08:00',
          label: 'You × AI Summit',
          type: 'activity',
          location: 'The Performing Arts Community Center, Waco, TX',
          notes: '2 tickets.',
          privateDocumentKey: 'you-ai-summit-ticket',
          privateDocumentType: 'ticket',
          travelMinutes: 15,
          arrivalBufferMinutes: 15,
        },
        { id: 'd4-4', label: 'Event day', type: 'free', sortOrder: 900 },
      ],
    },
    {
      id: 'd5',
      date: '2026-09-13',
      dayNumber: 5,
      legId: 'austin',
      title: 'Return home',
      outfitNote: 'Comfortable clothes for the flight home.',
      outfitBoardId: 'ob5-return',
      // Departs from Waco, then returns toward AUS for the flight home —
      // if a manual transport/rental-car item exists for the Waco → AUS
      // leg, it merges in ahead of these by time when it has one; see
      // ScheduleItem.sortOrder for how these place themselves without a
      // real time of their own.
      scheduleItems: [
        { id: 'd5-1', label: 'Morning / early afternoon flexible', type: 'free', sortOrder: 600 },
        { id: 'd5-2', label: 'Head to AUS', type: 'transport', location: 'Austin-Bergstrom International Airport (AUS)', sortOrder: 900 },
        { id: 'd5-3', label: 'Airport / security', type: 'transport', sortOrder: 960 },
        {
          id: 'd5-4',
          time: '18:33',
          label: 'Frontier AUS → ATL',
          type: 'transport',
          notes: 'Direct, 2h 27m, economy.',
          websiteUrl: 'https://www.flyfrontier.com',
          privateDocumentKey: 'austin-frontier-return-confirmation',
          privateDocumentType: 'confirmation',
          travelMinutes: 35,
          arrivalBufferMinutes: 120,
        },
        { id: 'd5-5', time: '22:00', label: 'Arrive Atlanta (ATL)', type: 'transport', location: 'Hartsfield-Jackson Atlanta International Airport (ATL)' },
      ],
    },
  ],

  bookings: [
    {
      id: 'bk-hotel-hyatt-house-austin',
      category: 'hotel',
      name: 'Hyatt House Austin/Downtown',
      legId: 'austin',
      dateStart: '2026-09-09',
      dateEnd: '2026-09-11',
      status: 'confirmed',
      cost: { amount: 353.97, currency: 'USD' },
      address: 'Hyatt House Austin/Downtown, 901 Neches Street, Austin, TX 78701',
      phone: '+1 512 391 0000',
      notes: 'King Room, 2 adults, breakfast included. Booked via Booking.com — covers Sept. 9–11 only.',
      tip: 'Central downtown Austin base for the first half of the trip.',
      privateDocumentKey: 'austin-hyatt-booking-confirmation',
      privateDocumentType: 'confirmation',
    },
    {
      id: 'bk-ticket-you-ai-summit',
      category: 'ticket',
      name: 'You × AI Summit = Unstoppable — 2 tickets',
      legId: 'waco',
      dateStart: '2026-09-12',
      time: '08:00',
      status: 'confirmed',
      cost: null,
      address: 'The Performing Arts Community Center, Waco, TX',
      privateDocumentKey: 'you-ai-summit-ticket',
      privateDocumentType: 'ticket',
      travelMinutes: 15,
      arrivalBufferMinutes: 15,
    },
  ],

  transport: [
    {
      id: 'tr-frontier-outbound',
      mode: 'flight',
      from: 'ATL',
      to: 'AUS',
      date: '2026-09-09',
      departTime: '16:19',
      arriveTime: '17:48',
      carrier: 'Frontier Airlines',
      status: 'confirmed',
      cost: null,
      notes: 'Arrive with time for ATL airport security. Direct, 2h 29m, economy.',
      websiteUrl: 'https://www.flyfrontier.com',
      privateDocumentKey: 'austin-frontier-outbound-confirmation',
      privateDocumentType: 'confirmation',
    },
    {
      id: 'tr-frontier-return',
      mode: 'flight',
      from: 'AUS',
      to: 'ATL',
      date: '2026-09-13',
      departTime: '18:33',
      arriveTime: '22:00',
      carrier: 'Frontier Airlines',
      status: 'confirmed',
      cost: null,
      notes: 'Direct, 2h 27m, economy.',
      websiteUrl: 'https://www.flyfrontier.com',
      privateDocumentKey: 'austin-frontier-return-confirmation',
      privateDocumentType: 'confirmation',
      travelMinutes: 35,
      arrivalBufferMinutes: 120,
    },
    {
      // Replaces the old direct AUS → Hyatt House Uber — the real Sept.
      // 9 arrival flow is two separate legs with a Franklin Barbecue stop
      // between them.
      id: 'tr-uber-aus-franklin',
      mode: 'local',
      from: 'Austin-Bergstrom International Airport (AUS)',
      to: 'Franklin Barbecue',
      date: '2026-09-09',
      carrier: 'Uber',
      status: 'confirmed',
      cost: null,
      location: 'Austin-Bergstrom International Airport (AUS)',
    },
    {
      id: 'tr-uber-franklin-hyatt',
      mode: 'local',
      from: 'Franklin Barbecue',
      to: 'Hyatt House Austin/Downtown',
      date: '2026-09-09',
      carrier: 'Uber',
      status: 'confirmed',
      cost: null,
      location: 'Franklin Barbecue, Austin, TX',
    },
  ],

  // Named wardrobe reference for the trip — same generic CapsuleItem
  // shape France uses, but deliberately no imageUrl on any entry: these
  // are the traveler's own clothes, and per Trip OS's privacy rules a
  // private photo can only ever live on-device in IndexedDB (see
  // lib/visualBoards.ts), never committed to git or the JS bundle. The
  // traveler attaches her own photos via Pack's Visuals tab; this list
  // exists so those uploads have a consistent name to title themselves
  // after, and so the outfitBoards below can reference something real.
  capsule: [
    { id: 'c1', category: 'outerwear', name: 'Navy Blazer' },
    { id: 'c2', category: 'top', name: 'White Button-Down' },
    { id: 'c3', category: 'bottom', name: 'Red Leggings' },
    { id: 'c4', category: 'bottom', name: 'Mini Denim Skirt' },
    { id: 'c5', category: 'dress', name: 'Short Floral Summer Sundress' },
    { id: 'c6', category: 'dress', name: 'Long Sage Floral Dress' },
    { id: 'c7', category: 'bottom', name: 'Light-Wash Wide-Leg Jeans' },
    { id: 'c8', category: 'shoes', name: 'White Sneakers' },
    { id: 'c9', category: 'shoes', name: 'Black Pointed Heels' },
    { id: 'c10', category: 'shoes', name: 'Blush/Nude Sandals' },
    { id: 'c11', category: 'accessory', name: 'Black Shoulder Bag', note: 'Structured, gold-tone hardware.' },
    { id: 'c12', category: 'accessory', name: 'Black Oval Sunglasses' },
    { id: 'c13', category: 'accessory', name: 'Neck Scarf' },
  ],

  // Six looks across the five days (Sept. 9 has two — see d1's
  // outfitBoardIds). Text/metadata only, same as capsule above — no
  // imageUrl, since there's no committed public asset to point at. The
  // dynamic "Outfit Board" section in Pack composes the traveler's own
  // uploaded photos against these itemNames at render time.
  outfitBoards: [
    {
      id: 'ob1-travel',
      dayId: 'd1',
      label: 'Travel Day to Austin',
      itemNames: ['White Button-Down', 'Red Leggings', 'White Sneakers'],
      note: 'Comfortable airport/flight outfit.',
    },
    {
      id: 'ob1-franklin',
      dayId: 'd1',
      label: "Franklin's BBQ",
      itemNames: ['White Button-Down', 'Mini Denim Skirt', 'White Sneakers'],
      note: "Same shirt and sneakers as the flight — only the bottoms change, from red leggings to a mini denim skirt, for Franklin's BBQ right after arriving.",
    },
    {
      id: 'ob2-exploring',
      dayId: 'd2',
      label: 'Austin Exploring',
      itemNames: ['Short Floral Summer Sundress', 'White Sneakers', 'Neck Scarf'],
      note: 'Casual Austin daytime look.',
    },
    {
      id: 'ob3-waco',
      dayId: 'd3',
      label: 'Magnolia + Dinner in Waco',
      itemNames: ['Long Sage Floral Dress', 'Blush/Nude Sandals'],
      note: 'One look for the whole day — the Austin → Waco travel, Magnolia Silos, and dinner in Waco.',
    },
    {
      id: 'ob4-summit',
      dayId: 'd4',
      label: 'You × AI Summit',
      itemNames: [
        'Navy Blazer',
        'Light-Wash Wide-Leg Jeans',
        'White Button-Down',
        'Black Pointed Heels',
        'Black Shoulder Bag',
        'Black Oval Sunglasses',
      ],
      note: 'Swap the heels for sneakers any time from Pack — this look is editable, not fixed.',
    },
    {
      id: 'ob5-return',
      dayId: 'd5',
      label: 'Return Travel Day',
      itemNames: ['White Button-Down', 'Red Leggings', 'White Sneakers'],
      note: 'Same core outfit as the outbound travel day.',
    },
  ],

  packingList: [
    { id: 'pk-travel-outfit', category: 'Clothing', label: 'Travel outfit' },
    { id: 'pk-summit-outfit', category: 'Clothing', label: 'Summit outfit' },
    { id: 'pk-casual-outfits', category: 'Clothing', label: 'Casual Austin outfits' },
    { id: 'pk-sleepwear', category: 'Clothing', label: 'Sleepwear' },
    { id: 'pk-underwear', category: 'Clothing', label: 'Underwear' },
    { id: 'pk-shoes', category: 'Clothing', label: 'Shoes' },
    { id: 'pk-toiletries', category: 'Personal', label: 'Toiletries' },
    { id: 'pk-medication', category: 'Personal', label: 'Medication' },
    { id: 'pk-makeup', category: 'Personal', label: 'Makeup / skincare' },
    { id: 'pk-phone-charger', category: 'Tech', label: 'Phone charger' },
    { id: 'pk-battery', category: 'Tech', label: 'Portable battery' },
    { id: 'pk-laptop', category: 'Tech', label: 'Laptop' },
    { id: 'pk-laptop-charger', category: 'Tech', label: 'Laptop charger' },
    { id: 'pk-earbuds', category: 'Tech', label: 'Earbuds' },
    { id: 'pk-id', category: 'Travel', label: 'ID' },
    { id: 'pk-wallet', category: 'Travel', label: 'Wallet' },
    { id: 'pk-summit-ticket', category: 'Travel', label: 'Summit ticket' },
    { id: 'pk-flight-confirmations', category: 'Travel', label: 'Flight confirmations' },
    { id: 'pk-hotel-confirmation', category: 'Travel', label: 'Hotel confirmation' },
  ],

  openItems: [
    {
      id: 'open-lodging-sep11-13',
      tripId: 'austin-2026',
      label: 'Book lodging for Sept. 11–13',
      category: 'lodging',
      priority: 'high',
      status: 'open',
      detail: 'Hyatt House only covers Sept. 9–11 — the back half of the trip has no lodging booked yet.',
      relatedDayId: 'd3',
    },
    {
      id: 'open-austin-waco-transport',
      tripId: 'austin-2026',
      label: 'Decide Austin ↔ Waco transportation',
      category: 'transport',
      priority: 'high',
      status: 'open',
      detail: 'Rental car, drive, rideshare, or overnight in Waco — not yet decided.',
      // No relatedDayId: the outbound leg is Sept. 11 (d3) and the return
      // is Sept. 13 (d5) — a round trip spanning two different days can
      // never satisfy a single day-anchored check, so this is scoped by
      // category + requiresRoundTrip alone. See openItemIsCoveredBy.
      //
      // A round trip: one direction alone (e.g. only "Austin → Waco") never
      // resolves this on its own — unless it's a single rental-car item
      // whose own date -> endDate span proves a genuine multi-day rental
      // (kept across pickup and drop-off), not just a one-day booking —
      // see lib/manualItems.ts openItemIsCoveredBy / rentalCoversRoundTrip.
      requiresRoundTrip: true,
    },
    {
      id: 'open-atl-airport-transport',
      tripId: 'austin-2026',
      label: 'Decide ATL airport transportation / parking',
      category: 'transport',
      status: 'open',
      relatedDayId: 'd1',
    },
    {
      id: 'open-aus-hotel-transport',
      tripId: 'austin-2026',
      label: 'Austin arrival ground transportation',
      category: 'transport',
      // Decided: Uber AUS → Franklin Barbecue → Hyatt House (see
      // tr-uber-aus-franklin/tr-uber-franklin-hyatt in transport, and
      // d1-4/d1-6 in the Sep 9 schedule) — modeled as already-resolved
      // seed data rather than left in the unresolved list. Still a real,
      // toggleable checklist item: getEffectiveTrip lets the traveler
      // reopen it via the checklist if the plan changes.
      detail: 'Uber AUS → Franklin Barbecue → Hyatt House',
      status: 'done',
      relatedDayId: 'd1',
    },
    {
      id: 'open-packing',
      tripId: 'austin-2026',
      label: 'Finish packing',
      category: 'packing',
      status: 'open',
    },
  ],
}
