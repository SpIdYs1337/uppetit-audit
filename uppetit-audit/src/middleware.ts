import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // 1. Достаем бейджик (токен) пользователя. 
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET 
  });

  const url = req.nextUrl.clone();
  const isAuthPage = url.pathname === '/'; // Пытается ли он зайти на страницу логина
  const isSetupPasswordPage = url.pathname.startsWith('/setup-password'); // <-- НОВОЕ: Пытается ли зайти по ссылке приглашения

  // 2. ЗАЩИТА ОТ ГОСТЕЙ: Если нет бейджика и он лезет не на страницу входа И НЕ на страницу установки пароля
  if (!token && !isAuthPage && !isSetupPasswordPage) {
    url.pathname = '/'; // Жестко перекидываем на логин
    return NextResponse.redirect(url);
  }

  // 3. ЕСЛИ УЖЕ ВОШЕЛ: Не пускаем его снова на страницу логина ИЛИ установки пароля (он же уже внутри)
  if (token && (isAuthPage || isSetupPasswordPage)) {
    // Распределяем по ролям
    url.pathname = token.role === 'ADMIN' ? '/admin' : '/audit';
    return NextResponse.redirect(url);
  }

  // 4. ЗАЩИТА РОЛЕЙ (штрафуем за проникновение на чужую территорию)
  if (token) {
    const isAdminRoute = url.pathname.startsWith('/admin');
    const isAuditRoute = url.pathname.startsWith('/audit');

    // Если проверяющий лезет в админку — выкидываем его обратно в мобилку
    if (isAdminRoute && token.role !== 'ADMIN') {
      url.pathname = '/audit';
      return NextResponse.redirect(url);
    }

    // Если админ зачем-то лезет в мобилку проверяющего
    if (isAuditRoute && token.role === 'ADMIN') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  // Если все проверки пройдены — пропускаем человека дальше
  return NextResponse.next();
}

// Указываем охраннику, за какими папками следить
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.jpg).*)',
  ],
};