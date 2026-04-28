import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; // <-- Импортируем наш строгий Enum

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const userPostSchema = z.object({
  login: z.string().min(2, 'Логин должен быть длиннее 2 символов'),
  phone: z.string().nullable().optional(),
  // ИЗМЕНЕНО: Строгая валидация через nativeEnum
  role: z.nativeEnum(Role).default(Role.AUDITOR),
});

const userPutSchema = z.object({
  id: z.string(),
  login: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  // ИЗМЕНЕНО: Строгая валидация через nativeEnum
  role: z.nativeEnum(Role).optional(),
  resetPassword: z.boolean().optional(),
});

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const users = await prisma.user.findMany({ orderBy: { login: 'asc' } });
    
    const isAdmin = (session.user as any)?.role === Role.ADMIN;

    const safeUsers = users.map(u => ({
      id: u.id,
      login: u.login,
      phone: u.phone,
      role: u.role,
      inviteToken: isAdmin ? u.inviteToken : null,
      hasPassword: !!u.passwordHash 
    }));

    return NextResponse.json(safeUsers);
  } catch { 
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

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
  // ИЗМЕНЕНО: Защита через строгий Enum
  const { error } = await requireAuth([Role.ADMIN]);
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
  // ИЗМЕНЕНО: Защита через строгий Enum
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID не указан' }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch { 
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); 
  }
}