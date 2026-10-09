import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; 
import { Role } from '@prisma/client';

export async function requireAuth(allowedRoles?: Role[], options?: { allowMfaEnrollment?: boolean }) {
  const session = await auth();

  if (!session?.user) {
    return { 
      error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }), 
      session: null 
    };
  }

  if (session.user.mfaRequired && !options?.allowMfaEnrollment) {
    return { error: NextResponse.json({ error: 'Настройте двухфакторный вход', code: 'MFA_REQUIRED' }, { status: 403 }), session: null };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = session.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return { 
        error: NextResponse.json({ error: 'Доступ запрещен. Недостаточно прав.' }, { status: 403 }), 
        session: null 
      };
    }
  }

  return { error: null, session };
}
