import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const secureCookie = process.env.AUTH_URL?.startsWith('https://')
    || process.env.NEXTAUTH_URL?.startsWith('https://') || req.nextUrl.protocol === 'https:';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith('/api/');
  const isAuthApi = path.startsWith('/api/auth/');
  const isPublic = path === '/' || path === '/setup-password';
  const validToken = token?.sessionId && token.absoluteExpiresAt > Date.now();
  // Handlers perform authoritative database checks. A revoked JWT must not
  // redirect users away from the public login or password recovery page.
  let response: NextResponse;
  if (isApi && !isAuthApi && path !== '/api/setup-password' && !path.startsWith('/api/cron/') && !validToken) {
    response = NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  } else if (!isApi && !isPublic && !validToken) {
    response = NextResponse.redirect(new URL('/', req.url));
  } else if (validToken && !isApi && !isPublic && token.mfaRequired && path !== '/setup-mfa') {
    response = NextResponse.redirect(new URL('/setup-mfa', req.url));
  } else if (validToken && path.startsWith('/admin') && token.role !== 'ADMIN') {
    response = NextResponse.redirect(new URL('/audit', req.url));
  } else {
    response = NextResponse.next();
  }
  if (isApi || !isPublic || path === '/setup-password') {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
  }
  if (isApi && !isAuthApi && path !== '/api/setup-password' && !path.startsWith('/api/cron/')) {
    const origin = req.headers.get('origin');
    const expectedOrigin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || req.url).origin;
    if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expectedOrigin)) {
      return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webmanifest)$|sw\\.js|workbox-.*).*)'],
};
