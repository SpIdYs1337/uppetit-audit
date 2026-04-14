import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET 
  });

  const url = req.nextUrl.clone();
  const isAuthPage = url.pathname === '/';
  const isSetupPasswordPage = url.pathname.startsWith('/setup-password');

  if (!token && !isAuthPage && !isSetupPasswordPage) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (token && (isAuthPage || isSetupPasswordPage)) {
    // И ТУ, и Аудиторы идут на /audit
    url.pathname = token.role === 'ADMIN' ? '/admin/users' : '/audit';
    return NextResponse.redirect(url);
  }

  if (token) {
    const isAdminRoute = url.pathname.startsWith('/admin/users');
    const isAuditRoute = url.pathname.startsWith('/audit');

    if (isAdminRoute && token.role !== 'ADMIN') {
      url.pathname = '/audit';
      return NextResponse.redirect(url);
    }

    if (isAuditRoute && token.role === 'ADMIN') {
      url.pathname = '/admin/users';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Добавил logo.png в исключения, чтобы он скачивался для PDF без авторизации
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.jpg|logo.png).*)',
  ],
};