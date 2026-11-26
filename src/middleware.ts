import { type NextRequest, NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  school_admin: '/dashboard',
  admin_officer: '/dashboard',
  super_admin: '/admin',
  principal: '/principal',
  teacher: '/teacher',
  bursary: '/bursary',
  student: '/student',
  parent: '/guardian/dashboard',
};

// The domain schools get their own address on, such as queens.<this domain>.
const PLATFORM_DOMAIN = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || '').toLowerCase();

// Names that belong to the product, never to a school.
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'portal', 'dashboard', 'login', 'signup',
  'mail', 'smtp', 'cdn', 'static', 'assets', 'docs', 'help', 'support',
  'status', 'billing', 'pay', 'payments', 'school', 'schools', 'clariva', 'clarriva',
  'test', 'api-test', 'staging', 'dev',
]);

/** The school named by the address the browser used, or '' for the main site. */
function subdomainOf(host: string): string {
  const bare = (host || '').split(':')[0].toLowerCase();
  if (!bare) return '';
  // In development every *.localhost address already points at this computer.
  if (bare.endsWith('.localhost')) {
    const sub = bare.slice(0, -'.localhost'.length);
    return sub && !RESERVED_SUBDOMAINS.has(sub) ? sub : '';
  }
  if (PLATFORM_DOMAIN && bare.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const sub = bare.slice(0, -(PLATFORM_DOMAIN.length + 1));
    return sub && !sub.includes('.') && !RESERVED_SUBDOMAINS.has(sub) ? sub : '';
  }
  return '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// NOTE: This middleware provides CLIENT-SIDE UX routing hints only.
// It does NOT enforce authorization. All API endpoints must verify
// permissions server-side via DRF permission classes.
// The JWT is decoded (not verified) here for redirect purposes.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const school = subdomainOf(request.headers.get('host') || '');

  // Tell the app which school's address this is, so the page can brand itself.
  const headers = new Headers(request.headers);
  if (school) headers.set('x-school-subdomain', school);

  /** Carry on, optionally showing another page under the address that was typed. */
  const pass = (rewriteTo?: string) => {
    const url = request.nextUrl.clone();
    if (rewriteTo) url.pathname = rewriteTo;
    const response = rewriteTo
      ? NextResponse.rewrite(url, { request: { headers } })
      : NextResponse.next({ request: { headers } });
    if (school && !request.cookies.get('school_subdomain')) {
      response.cookies.set('school_subdomain', school, {
        path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  };

  // `/guardian` is the guardian login page and `/admin/login` the console sign-in page;
  // `/guardian/dashboard` and the rest of `/admin` stay protected.
  if (pathname.startsWith('/portal') || pathname === '/' || pathname === '/login' || pathname === '/admin/login' || pathname.startsWith('/opengraph-image') || pathname.startsWith('/onboard') || pathname === '/guardian' || pathname === '/terms') {
    // On a school's own address the root is that school's sign-in page.
    return pass(pathname === '/' && school ? '/login' : undefined);
  }

  const token = request.cookies.get('access_token')?.value;

  // The console has its own door; everything else uses the school login.
  const loginPath = pathname.startsWith('/admin') ? '/admin/login' : '/login';

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role as string | undefined;

  if (!role || !ROLE_HOME[role]) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    return NextResponse.redirect(url);
  }

  const home = ROLE_HOME[role];

  const portalRoots = ['/dashboard', '/admin', '/principal', '/teacher', '/bursary', '/student', '/guardian/dashboard'];
  const onWrongPortal = portalRoots.some(
    p => pathname.startsWith(p) && !pathname.startsWith(home)
  );
  if (onWrongPortal) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return pass();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
