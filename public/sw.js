// Lets the exam page open again when the connection is down.
// It only touches two things: the app's static files, and the student exam page.
// Everything else (all API calls, every other page) goes straight to the network.
const STATIC = 'cbt-static-v1';
const PAGES = 'cbt-pages-v1';
const EXAM_PAGE = /^\/student\/exams\/[^/]+\/take\/?$/;
const WAIT_FOR_NETWORK_MS = 5000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Built files have a hash in their name, so a cached copy is always the right one.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // The exam page: use the network, but if it is slow or down, open the copy saved earlier.
  if (req.mode === 'navigate' && EXAM_PAGE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        const network = fetch(req).then((res) => {
          if (res.ok) cache.put(new Request(url.pathname), res.clone());
          return res;
        });
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), WAIT_FOR_NETWORK_MS));
        try {
          const first = await Promise.race([network, timeout]);
          if (first) return first;
          const saved = await cache.match(new Request(url.pathname), { ignoreVary: true });
          return saved || network;
        } catch {
          const saved = await cache.match(new Request(url.pathname), { ignoreVary: true });
          if (saved) return saved;
          throw new Error('offline');
        }
      })(),
    );
  }
});
