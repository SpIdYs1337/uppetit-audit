import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш единый центр безопасности

export async function POST(req: Request) {
  // 1. Пропускаем только авторизованных пользователей (любая роль)
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const { subscription } = await req.json();
    
    // Получаем ID пользователя из проверенной сессии
    const userId = (session.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Не удалось определить ID пользователя' }, { status: 400 });
    }

    // 2. Обновляем подписку в базе данных
    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: JSON.stringify(subscription) }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения подписки:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}