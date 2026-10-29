import { Link } from 'react-router-dom'

export function Privacy() {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto max-w-md px-5 pb-12 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link to="/" className="text-sm font-medium text-blue">← Trip OS</Link>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">Privacy</p>
        <h1 className="font-display text-3xl text-ink">Privacy Policy</h1>
        <p className="mt-1 text-xs text-ink-soft">Effective October 29, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-6 text-ink">
          <section>
            <h2 className="font-display text-xl">Designed to keep trip data on your device</h2>
            <p className="mt-2 text-ink-soft">
              Trip OS is a travel-planning app designed primarily around device-local storage. The app does not require an account. Your saved trips stay on your device unless you explicitly create a sharing link. Packing progress, private travel documents, and uploaded images are not included in shared links.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">What is stored locally</h2>
            <p className="mt-2 text-ink-soft">
              Trip preferences, checklist state, traveler-added itinerary items, alert choices, and similar app state are stored in your browser or app storage. Private confirmations, tickets, receipts, PDFs, and traveler-uploaded images are stored locally using IndexedDB. These files remain on that device unless you choose to export a backup.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Optional trip-sharing links</h2>
            <p className="mt-2 text-ink-soft">
              Creating a sharing link sends a filtered copy of the selected itinerary to this app’s Netlify hosting and storage service. It can include the trip title, traveler names, destinations, dates, activities, booking costs, transport details, and public venue links. Private notes, confirmation codes, reservation-management links, wallet documents, and uploaded photos are excluded.
            </p>
            <p className="mt-2 text-ink-soft">
              Anyone who has a sharing link can open it until you select Stop sharing or the link expires 90 days after creation. Create separate labeled links if you want to stop access separately. Recipients view a read-only online itinerary; access is checked when opened, on resume, and within 30 seconds while visible. An offline or unverified shared view is hidden. Stopping access cannot erase screenshots or copies someone already made. Hiding a received trip removes it from that device’s list and does not revoke anyone else’s access.
            </p>
            <p className="mt-2 text-ink-soft">
              Sharing controls are saved on the device that creates the link and included in its private backups. The recipient does not receive those controls. Keep your private backups private: they can contain documents and sharing-control keys. Shared links contain the itinerary as it was when created; later edits are not automatically synchronized.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Backups</h2>
            <p className="mt-2 text-ink-soft">
              If you use Trip OS backup and restore, the backup file is created for you to save or move yourself. Trip OS does not automatically upload that backup to a Trip OS account or cloud service. Any copy you save to iCloud Drive, Google Drive, email, or another service is handled under that service's privacy practices.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">External services</h2>
            <p className="mt-2 text-ink-soft">
              Trip OS may request public weather data from Open-Meteo for destinations included in an itinerary. Wallet may request reference exchange rates from ExchangeRate-API using USD as the base currency; booking amounts and itinerary details are not sent with that request. It may also load web fonts from Google Fonts in the web version. Tapping directions, reservation, ticket, website, or other external links opens third-party services you choose to visit. Those services operate under their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Notifications</h2>
            <p className="mt-2 text-ink-soft">
              Trip alerts are generated from itinerary information on your device. If you choose to allow system or browser notifications, your operating system or browser controls that permission. Trip OS does not use notifications for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Advertising and tracking</h2>
            <p className="mt-2 text-ink-soft">
              Trip OS does not sell personal information and does not use third-party advertising or cross-app advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Retention and deletion</h2>
            <p className="mt-2 text-ink-soft">
              Device-local data remains until you delete it through Trip OS where a delete control is provided, clear the app or browser storage, or uninstall the app. Backup files remain wherever you chose to save them until you delete those copies yourself. There is no separate user account to delete. Stop sharing deletes the corresponding itinerary from the active sharing store. Expiration disables a link after 90 days; it does not itself guarantee deletion of the stored copy. Use Stop sharing when you want to remove that shared copy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Contact</h2>
            <p className="mt-2 text-ink-soft">
              For Trip OS privacy or support questions, contact <a className="text-blue underline" href="mailto:tripod.support@gmail.com">tripod.support@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Changes to this policy</h2>
            <p className="mt-2 text-ink-soft">
              If Trip OS later adds accounts, cloud sync, analytics, payments, advertising, or other services that change how information is handled, this policy and the applicable app-store privacy disclosures will be updated before those features are released.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
