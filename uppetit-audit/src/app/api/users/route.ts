import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { login: 'asc' } });
    return NextResponse.json(users);
  } catch (error) { return NextResponse.json({ error: 'Ошибка' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = crypto.randomUUID(); // Генерируем надежный токен

    const newUser = await prisma.user.create({
      data: {
        login: body.login,
        phone: body.phone || null,
        role: body.role || 'AUDITOR',
        passwordHash: null, // Пароля пока нет
        inviteToken: token, // Записываем токен
      }
    });
    return NextResponse.json(newUser);
  } catch (error) { return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // ЕСЛИ АДМИН ЗАПРОСИЛ СБРОС ПАРОЛЯ
    if (body.resetPassword) {
      const token = crypto.randomUUID();
      const updated = await prisma.user.update({
        where: { id: body.id },
        data: { passwordHash: null, inviteToken: token } // Стираем старый пароль, даем новый токен
      });
      return NextResponse.json({ token });
    }

    // Обычное обновление данных (логин, телефон, роль)
    const updatedUser = await prisma.user.update({
      where: { id: body.id },
      data: { login: body.login, phone: body.phone || null, role: body.role }
    });
    return NextResponse.json(updatedUser);
  } catch (error) { return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await prisma.user.delete({ where: { id: id as string } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); }
}