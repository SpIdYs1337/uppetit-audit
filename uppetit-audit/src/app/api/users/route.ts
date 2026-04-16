import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Оставляем только наш мощный хелпер

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const userPostSchema = z.object({
  login: z.string().min(2, 'Логин должен быть длиннее 2 символов'),
  phone: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'TU', 'AUDITOR']).default('AUDITOR'),
});

const userPutSchema = z.object({
  id: z.string(),
  login: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'TU', 'AUDITOR']).optional(),
  resetPassword: z.boolean().optional(),
});

export async function GET() {
  // 1. ХЕЛПЕР САМ проверяет авторизацию и возвращает готовую сессию
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const users = await prisma.user.findMany({ orderBy: { login: 'asc' } });
    
    // 2. Берем сессию, которую любезно вернул хелпер
    const isAdmin = (session.user as any)?.role === 'ADMIN';

    const safeUsers = users.map(u => ({
      id: u.id,
      login: u.login,
      phone: u.phone,
      role: u.role,
      inviteToken: isAdmin ? u.inviteToken : null,
      hasPassword: !!u.passwordHash 
    }));

    return NextResponse.json(safeUsers);
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  // 1. ОДНА СТРОЧКА ЗАЩИТЫ: Хелпер проверяет и сессию, и наличие роли ADMIN
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error; // Если что-то не так, хелпер сам отдаст 401 или 403

  // 2. Сразу переходим к бизнес-логике
  try {
    const body = await request.json();
    const parsedData = userPostSchema.parse(body);
    const token = crypto.randomUUID();

    const newUser = await prisma.user.create({
      data: {
        login: parsedData.login,
        phone: parsedData.phone || null,
        role: parsedData.role,
        passwordHash: null,
        inviteToken: token,
      }
    });
    return NextResponse.json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 }); 
  }
}

export async function PUT(request: Request) {
  // ОДНА СТРОЧКА ЗАЩИТЫ
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    const parsedData = userPutSchema.parse(body);

    if (parsedData.resetPassword) {
      const token = crypto.randomUUID();
      const updated = await prisma.user.update({
        where: { id: parsedData.id },
        data: { passwordHash: null, inviteToken: token } 
      });
      return NextResponse.json({ token });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parsedData.id },
      data: { 
        login: parsedData.login, 
        phone: parsedData.phone || null, 
        role: parsedData.role 
      }
    });
    return NextResponse.json(updatedUser);
  } catch (error) { 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 }); 
  }
}

export async function DELETE(request: Request) {
  // ОДНА СТРОЧКА ЗАЩИТЫ
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID не указан' }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); 
  }
}