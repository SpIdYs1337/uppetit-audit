import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function POST(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.AUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { subscription } = await req.json();

    await prisma.user.update({
      where: { id: token.id as string },
      data: { pushSubscription: JSON.stringify(subscription) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения подписки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}