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

  // 1. Если нет токена и это не открытые страницы — на авторизацию
  if (!token && !isAuthPage && !isSetupPasswordPage) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 2. Если авторизован и пытается зайти на логин — раскидываем по домашним страницам
  if (token && (isAuthPage || isSetupPasswordPage)) {
    url.pathname = token.role === 'ADMIN' ? '/admin/users' : '/audit';
    return NextResponse.redirect(url);
  }

  // 3. Защита маршрутов по ролям
  if (token) {
    const isAdminRoute = url.pathname.startsWith('/admin');
    
    if (isAdminRoute && token.role !== 'ADMIN') {
      url.pathname = '/audit';
      return NextResponse.redirect(url);
    }


  }

  return NextResponse.next();
}

export const config = {
  // Исключения для PWA: manifest.webmanifest, sw.js, workbox, icon-*.png и apple-icon.png
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo\\.jpg|logo\\.png|manifest\\.webmanifest|sw\\.js|workbox-.*|icon-.*\\.png|apple-icon\\.png).*)',
  ],
};