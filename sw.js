// 4CITE.ai Service Worker
// Phase 0.5 — Cache-first strategy for static assets; network-first for API calls
// Bump CACHE_VERSION when deploying a new build to force cache refresh

const CACHE_VERSION = 'v2';
const CACHE_NAME    = `4cite-${CACHE_VERSION}`;

const PRECACHE = [
  '/',
  '/index.html',
  '/app',
  '/app.html',
  '/manifest.json'
];

// ── Install: precache core shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('4cite-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate for pages/assets ───────────
// API calls (Phase 0.5 /api/*) always go to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pass API calls straight through — never cache
  if (url.pathname.startsWith('/api/')) {
    return; // let browser handle normally
  }

  // For navigation requests and static assets: cache-first, revalidate in background
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request)
          .then(response => {
            // Cache fresh copy if it's a valid response
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        // Return cached version immediately; network revalidates in background
        return cached || networkFetch;
      })
    )
  );
});
