import type { Trip } from '../../types/trip'

// Seed data for Trip 2: Austin + Waco 2026 — the real-world beta for
// Trip OS's multi-trip architecture. Two confirmed outbound/return
// flights (the original Sep. 9 outbound was canceled and rebooked for
// Sep. 10 — kept as a canceled historical record rather than deleted;
// see the transport array), one hotel that only covers part of the
// stay, and one confirmed event ticket, plus a deliberately unfinished
// back half (lodging + Austin↔Waco transport) modeled as OpenItems
// rather than guessed. Nothing here is placeholder content invented for
// the demo — it's the real trip as booked so far.

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
      title: 'Flight Canceled — Rebooked for Sep. 10',
      // The original Sep. 9 flight was canceled and rebooked for Sep.
      // 10 (see d2) — no outfit is assigned to this day anymore (the
      // "Travel Day to Austin" outfit moved to d2 with the real flight;
      // see outfit-travel-day below).
      outfitNote: 'Original flight canceled and rebooked — no confirmed plans today. See Sep. 10 for the actual travel day.',
      scheduleItems: [
        // The original outbound chain, kept visible (never deleted) and
        // marked cancelled — see tr-frontier-outbound in transport
        // below for the matching Transport record and its preserved
        // historical confirmation document.
        { id: 'd1-1', label: 'Travel to ATL', type: 'transport', sortOrder: 720, cancelled: true },
        {
          id: 'd1-2',
          time: '16:19',
          label: 'Frontier ATL → AUS',
          type: 'transport',
          location: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
          notes: 'Canceled by the airline. Rebooked as Frontier 4211, departing Sep. 10 at 4:19 PM — see the new flight on Sep. 10.',
          cancelled: true,
          websiteUrl: 'https://www.flyfrontier.com',
          privateDocumentKey: 'austin-frontier-outbound-confirmation',
          privateDocumentType: 'confirmation',
        },
        {
          id: 'd1-3',
          time: '17:48',
          label: 'Arrive Austin (AUS)',
          type: 'transport',
          location: 'Austin-Bergstrom International Airport (AUS)',
          cancelled: true,
        },
        // The old "Uber: AUS → Franklin Barbecue" leg (d1-4) is removed
        // outright, not just flagged — the new arrival plan on Sep. 10
        // goes straight from the airport to the hotel instead (see
        // tr-uber-aus-hyatt / d2-4), so keeping both around would show
        // two competing "active" versions of the same ground transport.
        // The downstream "Uber: Franklin Barbecue → Hyatt House" leg
        // (formerly d1-6 / tr-uber-franklin-hyatt) is removed the same
        // way, for the same reason: it was never actually taken (the
        // trip no longer arrives in Austin the evening of the 9th), so
        // it's obsolete transportation, not a plan still in effect —
        // unlike Franklin Barbecue itself, which is a real event whose
        // fate is merely undecided, not a booking that fell through.
        //
        // Franklin Barbecue itself is NOT auto-moved to Sep. 10 or any
        // other date — the plan is undecided now that the flight moved,
        // so it's kept exactly where it was (Sep. 9, no date/time
        // invented) and flagged via `tip` for separate review, per the
        // same "never silently delete or guess" rule as the flight
        // itself.
        {
          id: 'd1-5',
          label: 'Franklin Barbecue',
          type: 'meal',
          location: 'Franklin Barbecue, Austin, TX',
          sortOrder: 1090,
          tip: "Affected by the Sep. 9 flight cancellation — not yet rescheduled. Review this plan separately; don't assume it still happens today.",
        },
      ],
    },
    {
      id: 'd2',
      date: '2026-09-10',
      dayNumber: 2,
      legId: 'austin',
      // Sep. 10 is now the real travel/arrival day — takes over the
      // "Travel to Austin" title and outfit that Sep. 9 originally had.
      title: 'Travel to Austin',
      outfitNote: 'Comfortable travel clothes for the flight.',
      scheduleItems: [
        { id: 'd2-1', label: 'Travel to ATL', type: 'transport', sortOrder: 720 },
        {
          id: 'd2-2',
          time: '16:19',
          label: 'Frontier ATL → AUS',
          type: 'transport',
          location: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
          notes: 'Rebooked after the original Sep. 9 flight was canceled by the airline. Flight 4211, nonstop, 2h 29m, economy.',
          websiteUrl: 'https://www.flyfrontier.com',
          privateDocumentKey: 'austin-frontier-outbound-sep10-confirmation',
          privateDocumentType: 'confirmation',
        },
        { id: 'd2-3', time: '17:48', label: 'Arrive Austin (AUS)', type: 'transport', location: 'Austin-Bergstrom International Airport (AUS)' },
        {
          id: 'd2-4',
          label: 'Uber: AUS Airport → Hyatt House Austin/Downtown',
          type: 'transport',
          location: 'Austin-Bergstrom International Airport (AUS)',
          sortOrder: 1075, // just after the 17:48 arrival
        },
        {
          id: 'd2-5',
          label: 'Check in at Hyatt House Austin/Downtown',
          type: 'lodging',
          location: 'Hyatt House Austin/Downtown, 901 Neches Street, Austin, TX 78701',
          phone: '+1 512 391 0000',
          notes: 'King Room, 2 adults, breakfast included. Covers Sept. 9–11 only — booked via Booking.com.',
          privateDocumentKey: 'austin-hyatt-booking-confirmation',
          privateDocumentType: 'confirmation',
          sortOrder: 1130,
        },
      ],
    },
    {
      id: 'd3',
      date: '2026-09-11',
      dayNumber: 3,
      legId: 'waco',
      title: 'Austin → Waco',
      outfitNote: 'Comfortable clothes for checkout and travel.',
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
          personalScheduleLabel: 'My Summit Schedule',
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
      // The original outbound flight — canceled by the airline. Kept
      // (never deleted) as the historical record, along with its own
      // privateDocumentKey, so a confirmation already saved on-device
      // stays reachable. status: 'cancelled' already excludes this from
      // Trip Ready, the "travel day today" alert, and missing-document
      // nagging (see lib/readiness.ts, lib/alerts.ts, lib/walletDocs.ts).
      id: 'tr-frontier-outbound',
      mode: 'flight',
      from: 'ATL',
      to: 'AUS',
      date: '2026-09-09',
      departTime: '16:19',
      arriveTime: '17:48',
      carrier: 'Frontier Airlines',
      status: 'cancelled',
      cost: null,
      notes: 'Canceled by the airline. Rebooked as Frontier 4211 on Sep. 10 (see tr-frontier-outbound-sep10).',
      websiteUrl: 'https://www.flyfrontier.com',
      privateDocumentKey: 'austin-frontier-outbound-confirmation',
      privateDocumentType: 'confirmation',
    },
    {
      // The active, rebooked outbound flight — the real confirmed
      // outbound transportation for this trip. Uses its own
      // privateDocumentKey (separate from the canceled flight above) so
      // the new confirmation photo/PDF the traveler adds here never
      // overwrites the old one.
      id: 'tr-frontier-outbound-sep10',
      mode: 'flight',
      from: 'ATL',
      to: 'AUS',
      date: '2026-09-10',
      departTime: '16:19',
      arriveTime: '17:48',
      carrier: 'Frontier Airlines',
      number: '4211',
      status: 'confirmed',
      cost: null,
      confirmationCode: 'UFTKYP',
      notes: 'Rebooked after the original Sep. 9 flight was canceled. Nonstop, 2h 29m, economy.',
      websiteUrl: 'https://www.flyfrontier.com',
      privateDocumentKey: 'austin-frontier-outbound-sep10-confirmation',
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
      // Replaces the old AUS → Franklin Barbecue Uber (removed below) —
      // the new Sep. 10 arrival goes straight from the airport to the
      // hotel; Franklin Barbecue itself is undecided, not auto-moved.
      id: 'tr-uber-aus-hyatt',
      mode: 'local',
      from: 'Austin-Bergstrom International Airport (AUS)',
      to: 'Hyatt House Austin/Downtown',
      date: '2026-09-10',
      carrier: 'Uber',
      status: 'confirmed',
      cost: null,
      location: 'Austin-Bergstrom International Airport (AUS)',
    },
    // The "Franklin Barbecue → Hyatt House" Uber (formerly
    // tr-uber-franklin-hyatt) is removed outright, not just left
    // 'pending' — it was never actually taken once the outbound flight
    // moved to Sep. 10, so it's obsolete transportation rather than a
    // plan still awaiting confirmation. Franklin Barbecue's own
    // schedule item (d1-5) and outfit (outfit-franklins-bbq) are kept
    // untouched — this removal is scoped to the transportation leg
    // only, per the same distinction drawn on d1 above.
  ],

  // Named wardrobe reference for the trip — same generic CapsuleItem
  // shape France uses, but deliberately no imageUrl on any entry: these
  // are the traveler's own clothes, and per Trip OS's privacy rules a
  // private photo can only ever live on-device in IndexedDB (see
  // lib/visualBoards.ts), never committed to git or the JS bundle. The
  // traveler attaches her own photos via Pack's Wardrobe tab
  // (CapsuleItemImage); the outfits below reference these items by id,
  // so a photo uploaded once here shows up everywhere that outfit is
  // shown, with no separate re-upload.
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
    { id: 'c11', category: 'bag', name: 'Black Shoulder Bag', note: 'Structured, gold-tone hardware.' },
    { id: 'c12', category: 'accessory', name: 'Black Oval Sunglasses' },
    { id: 'c13', category: 'accessory', name: 'Neck Scarf' },
  ],

  // Kept empty — Austin is fully migrated to the reference-based Outfit
  // system below; OutfitBoardSection renders nothing when this is empty,
  // so France's older text-scaffold rendering is unaffected.
  outfitBoards: [],

  // Six looks total. Four are assigned to a specific day (dayId); two —
  // Franklin's BBQ and Austin Exploring — are unassigned right now
  // because the plans they belonged to are undecided since the Sep. 9
  // flight was canceled and rebooked for Sep. 10 (see the days array
  // above and each outfit's own comment below). Each itemIds entry
  // references an id from capsule above; no imageUrl or itemNames text
  // here at all — WardrobeOutfitBoardSection resolves every item's
  // photo (seeded or privately uploaded) at render time.
  outfits: [
    {
      // Moved from d1 to d2 — the flight (and this outfit) is now worn
      // on the actual rebooked travel day, Sep. 10. Pieces unchanged.
      id: 'outfit-travel-day',
      tripId: 'austin-2026',
      name: 'Travel Day to Austin',
      dayId: 'd2',
      sortOrder: 0,
      itemIds: ['c2', 'c3', 'c8'],
      notes: 'Comfortable airport/flight outfit.',
    },
    {
      // No longer assigned to a day — the Franklin Barbecue plan itself
      // is undecided now that the flight moved (see d1-5/d1-6 above),
      // so this outfit isn't auto-moved to a new date either. The
      // record (and its pieces) stays intact for whenever Franklin is
      // rescheduled.
      id: 'outfit-franklins-bbq',
      tripId: 'austin-2026',
      name: "Franklin's BBQ",
      sortOrder: 1,
      itemIds: ['c2', 'c4', 'c8'],
      notes: "Same shirt and sneakers as the flight — only the bottoms change, from red leggings to a mini denim skirt, for Franklin's BBQ right after arriving.",
    },
    {
      // Was assigned to the old d2 ("Austin Exploring," a full day in
      // Austin) — that day is now the Sep. 10 travel/arrival day
      // instead, with no daytime Austin exploring on it (they don't
      // land until 5:48 PM). Unassigned rather than deleted or moved to
      // a guessed date, same treatment as outfit-franklins-bbq above.
      id: 'outfit-austin-exploring',
      tripId: 'austin-2026',
      name: 'Austin Exploring',
      sortOrder: 2,
      itemIds: ['c5', 'c8', 'c13'],
      notes: 'Casual Austin daytime look.',
    },
    {
      id: 'outfit-magnolia-waco',
      tripId: 'austin-2026',
      name: 'Magnolia + Dinner in Waco',
      dayId: 'd3',
      sortOrder: 0,
      itemIds: ['c6', 'c10'],
      notes: 'One look for the whole day — the Austin → Waco travel, Magnolia Silos, and dinner in Waco.',
    },
    {
      id: 'outfit-summit',
      tripId: 'austin-2026',
      name: 'You × AI Summit',
      dayId: 'd4',
      sortOrder: 0,
      itemIds: ['c1', 'c7', 'c2', 'c9', 'c11', 'c12'],
      notes: 'Swap the heels for sneakers any time — create a new outfit for Summit day to try a different combo.',
    },
    {
      id: 'outfit-return-day',
      tripId: 'austin-2026',
      name: 'Return Travel Day',
      dayId: 'd5',
      sortOrder: 0,
      itemIds: ['c2', 'c3', 'c8'],
      notes: 'Same core outfit as the outbound travel day.',
    },
  ],

  // Cecilia's personally selected You × AI Summit sessions (see
  // types/trip.ts EventSession) — the public event's full multi-track
  // agenda is never modeled here, only what she's actually chosen to
  // attend, tied to the parent 'd4-3' Summit ScheduleItem above. Times
  // reflect the Summit's current published agenda (confirmed against the
  // traveler-supplied agenda screenshots), which shifted its afternoon
  // slots earlier than an older cached version of the schedule.
  eventSessions: [
    {
      id: 'summit-s1',
      parentItemId: 'd4-3',
      startTime: '09:05',
      endTime: '09:45',
      title: 'Mind Your Business: Find Money in Your Daily Work with AI',
      room: 'Main Stage',
    },
    {
      id: 'summit-s2',
      parentItemId: 'd4-3',
      startTime: '09:50',
      endTime: '10:30',
      title: 'Your Data, Your AI, and Your Future',
      room: 'Main Stage',
    },
    {
      id: 'summit-s3',
      parentItemId: 'd4-3',
      startTime: '11:00',
      endTime: '11:40',
      title: 'From the Pen to the Prompt: Making AI Work for You',
      room: 'Room 1',
    },
    {
      id: 'summit-s4',
      parentItemId: 'd4-3',
      startTime: '11:45',
      endTime: '12:25',
      title: 'AI Across Industries: Transforming Work, Skills, and Innovation',
      room: 'Room 1',
    },
    {
      id: 'summit-s5',
      parentItemId: 'd4-3',
      startTime: '13:40',
      endTime: '14:20',
      title: 'Build an AI-First Company',
      room: 'Room 1',
    },
    {
      id: 'summit-s6',
      parentItemId: 'd4-3',
      startTime: '14:25',
      endTime: '15:05',
      title: 'Uncovering Your Unique Genius: The Key to AI Visibility',
      room: 'Room 1',
      speaker: 'Fernando Labastida',
    },
    {
      id: 'summit-s7',
      parentItemId: 'd4-3',
      startTime: '15:25',
      endTime: '16:05',
      title: 'Build an AI Assistant',
      room: 'Room 2',
      speaker: 'Chrissy McDannell',
    },
    {
      id: 'summit-s8',
      parentItemId: 'd4-3',
      startTime: '16:10',
      endTime: '16:45',
      title: 'Human Opportunity and a Period of Exponential Change',
      room: 'Main Stage',
      speaker: 'Dr. Hope Koch',
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
      relatedDayId: 'd2', // moved with the rebooked flight
    },
    {
      id: 'open-aus-hotel-transport',
      tripId: 'austin-2026',
      label: 'Austin arrival ground transportation',
      category: 'transport',
      // Decided: Uber AUS → Hyatt House directly (see
      // tr-uber-aus-hyatt in transport, and d2-4 in the Sep 10
      // schedule) — modeled as already-resolved seed data rather than
      // left in the unresolved list. Still a real, toggleable checklist
      // item: getEffectiveTrip lets the traveler reopen it via the
      // checklist if the plan changes. Updated from the original
      // Uber AUS → Franklin Barbecue → Hyatt House plan after the Sep.
      // 9 flight was canceled and rebooked for Sep. 10.
      detail: 'Uber AUS Airport → Hyatt House Austin/Downtown',
      status: 'done',
      relatedDayId: 'd2',
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
