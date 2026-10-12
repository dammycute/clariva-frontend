export function hrefParts(href: string): { path: string; params: URLSearchParams } {
  const q = href.indexOf('?');
  if (q === -1) return { path: href, params: new URLSearchParams() };
  return { path: href.slice(0, q), params: new URLSearchParams(href.slice(q + 1)) };
}

/**
 * Score how well `href` matches the current location. 0 = no match.
 * Non-zero score = path.length * 100 + number of matched query params,
 * so a longer (more specific) path always wins, and on equal paths the
 * href with more required query params wins (e.g. ?tab=classes).
 */
export function navScore(href: string, pathname: string, search: string): number {
  const { path, params } = hrefParts(href);
  if (path === '/') return pathname === '/' ? 1 : 0;
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  let paramCount = 0;
  for (const [key, value] of params) {
    if (current.get(key) !== value) return 0;
    paramCount++;
  }
  const matches = pathname === path || pathname.startsWith(path + '/');
  if (!matches) return 0;
  return path.length * 100 + paramCount;
}

/** Returns the single best-matching href, or null when nothing matches. */
export function findActiveHref(hrefs: string[], pathname: string, search: string): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const href of hrefs) {
    const score = navScore(href, pathname, search);
    if (score > bestScore) {
      bestScore = score;
      best = href;
    }
  }
  return best;
}
