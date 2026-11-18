/**
 * Returns `raw` only if it is a same-site path like "/dashboard/fees".
 * Anything else (other sites, "//host", backslashes, control characters) gives null,
 * so a crafted ?redirect= link cannot send someone to another website after sign-in.
 */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (/[\\\u0000-\u001f]/.test(raw)) return null;
  // The login page itself is never a useful destination.
  if (raw === '/' || raw.startsWith('/?')) return null;
  return raw;
}
