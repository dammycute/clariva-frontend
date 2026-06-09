import { type NextRequest, NextResponse } from 'next/server';

const protectedPaths = ['/dashboard', '/guardian/dashboard', '/teacher', '/student', '/bursary', '/principal'];
const publicPaths = ['/portal'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  const requestHeaders = new Headers(request.headers);
  if (subdomain && subdomain !== 'www' && subdomain !== 'clariva' && !hostname.includes('localhost')) {
    requestHeaders.set('x-school-subdomain', subdomain);
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      if (pathname.startsWith('/guardian')) url.pathname = '/guardian';
      else if (pathname.startsWith('/teacher') || pathname.startsWith('/student')) url.pathname = '/';
      else url.pathname = '/';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
