import { Link } from 'react-router-dom'

export function Privacy() {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto max-w-md px-5 pb-12 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link to="/" className="text-sm font-medium text-blue">← Trip OS</Link>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue">Privacy</p>
        <h1 className="font-display text-3xl text-ink">Privacy Policy</h1>
        <p className="mt-1 text-xs text-ink-soft">Effective October 6, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-6 text-ink">
          <section>
            <h2 className="font-display text-xl">Designed to keep trip data on your device</h2>
            <p className="mt-2 text-ink-soft">
              Trip OS is a travel-planning app designed primarily around device-local storage. The current app does not require an account and does not send your saved itineraries, packing state, uploaded travel documents, or wardrobe images to a Trip OS server.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">What is stored locally</h2>
            <p className="mt-2 text-ink-soft">
              Trip preferences, checklist state, traveler-added itinerary items, alert choices, and similar app state are stored in your browser or app storage. Private confirmations, tickets, receipts, PDFs, and traveler-uploaded images are stored locally using IndexedDB. These files remain on that device unless you choose to export a backup.
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
              Trip OS may request public weather data from Open-Meteo for destinations included in an itinerary. It may also load web fonts from Google Fonts in the web version. Tapping directions, reservation, ticket, website, or other external links opens third-party services you choose to visit. Those services operate under their own privacy policies.
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
              Device-local data remains until you delete it through Trip OS where a delete control is provided, clear the app or browser storage, or uninstall the app. Backup files remain wherever you chose to save them until you delete those copies yourself. Because the current version has no Trip OS user account or server-side personal-data store, there is no separate server account to delete.
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
