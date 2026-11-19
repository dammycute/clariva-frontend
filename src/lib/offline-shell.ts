/**
 * Makes the exam page able to reopen with no connection. Called when a student opens the exam
 * room, while they still have internet. It registers the service worker (public/sw.js), then
 * stores this page and the static files it already loaded so a reload can use them.
 * Production only: in development the files change on every edit and must not be cached.
 */
export async function prepareOfflineShell(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('caches' in window)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // This page, saved under its path only (the service worker looks it up the same way).
    const page = await fetch(window.location.pathname, { credentials: 'same-origin' });
    if (page.ok) await (await caches.open('cbt-pages-v1')).put(new Request(window.location.pathname), page);

    // The scripts, styles and fonts this page already loaded, from before the worker took over.
    const statics = await caches.open('cbt-static-v1');
    const names = performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => n.startsWith(`${window.location.origin}/_next/static/`));
    await Promise.all([...new Set(names)].map(async n => {
      if (await statics.match(n)) return;
      try { await statics.add(n); } catch { /* one file failing must not stop the rest */ }
    }));
  } catch { /* offline support is an extra; the exam still works without it */ }
}
