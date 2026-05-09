/**
 * service-worker.js — CxMxC Training PWA cache layer.
 *
 * Two responsibilities:
 *
 *   1. Install-time precache of the app shell, the data files, and the engine
 *      modules. The full set is small (a few KB), so we precache everything
 *      and ship a self-contained app to the device. This is what makes the
 *      Lighthouse PWA install audit pass.
 *
 *   2. Runtime "stale-while-revalidate" handling: serve from cache
 *      immediately for instant load, kick off a network refresh in the
 *      background, and update the cache for the next visit. If the network
 *      is unavailable, we keep serving the cached copy.
 *
 * Cache versioning: bump CACHE when the asset list changes so the activate
 * step purges the old cache. See CLAUDE.md rule 8 — verify install on
 * Android Chrome whenever this file changes.
 */

/** Cache name. Bump on any ASSETS change so old caches get purged. */
const CACHE = 'cxmxc-v3';

/**
 * Files precached at install. Keep this list aligned with what `index.html`
 * loads on first paint. Anything not in this list will fall through to the
 * runtime handler and only be cached after a successful network fetch.
 * @type {string[]}
 */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './src/data/athlete-profile.json',
  './src/data/training-plan.json',
  './src/data/rouvy-routes.json',
  './src/engine/stability.js',
  './src/engine/adaptation.js',
  './src/engine/ai-coach.js',
  './src/engine/unplanned.js',
];

// --- install: precache the app shell ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      // Take over from the previous SW immediately so the user doesn't have
      // to close the tab to pick up a new build.
      .then(() => self.skipWaiting())
  );
});

// --- activate: drop old caches ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      // Claim open clients so the new SW controls them without a reload.
      .then(() => self.clients.claim())
  );
});

// --- fetch: stale-while-revalidate for same-origin GETs ---
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Same-origin only. We never proxy or cache cross-origin requests — the
  // Anthropic API call deliberately bypasses this handler.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          // Only cache successful 200s. Avoid caching opaque 0/redirects.
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        // Offline fall-through: hand back whatever was already cached.
        .catch(() => cached);
      return cached || network;
    })
  );
});
