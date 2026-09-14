import { type NextRequest, NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  school_admin: '/dashboard',
  admin_officer: '/dashboard',
  super_admin: '/super_admin',
  principal: '/principal',
  teacher: '/teacher',
  bursary: '/bursary',
  student: '/student',
  parent: '/guardian/dashboard',
};

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

  if (pathname.startsWith('/portal') || pathname === '/' || pathname.startsWith('/onboard')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role as string | undefined;

  if (!role || !ROLE_HOME[role]) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  const home = ROLE_HOME[role];

  const portalRoots = ['/dashboard', '/super_admin', '/principal', '/teacher', '/bursary', '/student', '/guardian/dashboard'];
  const onWrongPortal = portalRoots.some(
    p => pathname.startsWith(p) && !pathname.startsWith(home)
  );
  if (onWrongPortal) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
