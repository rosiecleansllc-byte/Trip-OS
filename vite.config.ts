import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We render our own "Trip OS update available · Refresh" banner
      // (components/layout/UpdateBanner.tsx) via the virtual:pwa-register/react
      // hook rather than reloading silently mid-itinerary — injectRegister:
      // false hands registration entirely to that hook instead of an
      // auto-injected <script>, and registerType 'prompt' (the default)
      // means a new service worker installs but waits for that same
      // explicit tap before it takes over.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Trip OS',
        short_name: 'Trip OS',
        description: 'Trip OS — your personal travel command center.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything Vite actually builds (the app shell). Trip data,
        // manual items, resolved-OpenItem overrides, dismissed/snoozed
        // alerts, and packing-checklist state all live in localStorage
        // (already on-device, nothing to precache); private documents and
        // visual boards live in IndexedDB and are read via blob: URLs the
        // service worker never sees at all — see the PR notes for why
        // that makes them inherently safe from ending up in this
        // manifest.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // The OCR engine (tesseract.js's wasm core + language data),
        // seeded trip photos, and the transit-map PDF are large and
        // fetched lazily, not needed for the app shell to boot — the
        // runtimeCaching CacheFirst rule below still makes them available
        // offline after their first real use, just not baked into the
        // initial install (one of the wasm chunks alone is well past
        // Workbox's default 2 MiB precache-per-file limit).
        globIgnores: ['ocr/**', 'images/**', 'documents/**'],
        // Deep-linking straight to e.g. /today or reloading while offline
        // still needs to resolve to the app shell so React Router can
        // take over client-side.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Seeded, public, non-content-hashed assets (capsule/outfit
          // photos, trip covers, the France transit-map PDF, the OCR
          // worker + language data) — fetched once, then served from
          // cache indefinitely rather than precached at install time.
          {
            urlPattern: /\/(images|documents|ocr)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'trip-os-static-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Weather is deliberately NOT cached here — api.open-meteo.com
          // requests simply pass through to the network and fail
          // naturally when offline, which lib/weather.ts's useWeather
          // already handles (falls back to the last cached snapshot from
          // its own localStorage cache, labeled with how stale it is).
        ],
      },
    }),
  ],
})
