import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // <-- Подтягиваем нашу новую авторизацию

export async function requireAuth(allowedRoles?: string[]) {
  const session = await auth();

  // 1. Проверка наличия сессии (анонимы отсекаются здесь)
  if (!session) {
    return { 
      error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }), 
      session: null 
    };
  }

  // 2. Проверка ролей (если они переданы в функцию)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (session.user as any)?.role;
    
    if (!allowedRoles.includes(userRole)) {
      return { 
        error: NextResponse.json({ error: 'Доступ запрещен. Недостаточно прав.' }, { status: 403 }), 
        session: null 
      };
    }
  }

  // Если всё ок, возвращаем сессию без ошибок
  return { error: null, session };
}