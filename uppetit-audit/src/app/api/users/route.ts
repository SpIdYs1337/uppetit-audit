import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const userPostSchema = z.object({
  name: z.string().nullable().optional(),
  // Разрешаем либо валидный email, либо пустую строку (для случаев, когда email не указан)
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  login: z.string().min(2, 'Логин должен быть длиннее 2 символов'),
  phone: z.string().nullable().optional(),
  role: z.nativeEnum(Role).default(Role.AUDITOR),
});

const userPutSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  login: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
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
      name: u.name,      // <-- Добавили имя
      email: u.email,    // <-- Добавили email
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
        name: parsedData.name || null,
        // Защита от конфликта @unique: пустую строку превращаем в null
        email: parsedData.email?.trim() || null, 
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
    // Prisma вернет ошибку P2002, если логин или email уже существуют
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'Пользователь с таким логином или email уже существует' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 }); 
  }
}

export async function PUT(request: Request) {
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
        name: parsedData.name || null,
        email: parsedData.email?.trim() || null,
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
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: 'Такой логин или email уже занят другим пользователем' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 }); 
  }
}

export async function DELETE(request: Request) {
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