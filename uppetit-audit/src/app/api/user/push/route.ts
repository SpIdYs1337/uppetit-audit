import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth'; 
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
// Теперь мы строго проверяем структуру объекта PushSubscription
const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Неверный формат URL для endpoint'),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1, 'Отсутствует ключ p256dh'),
      auth: z.string().min(1, 'Отсутствует ключ auth'),
    }),
  }),
});

export async function POST(req: Request) {
  // Подписываться на пуши могут все авторизованные пользователи
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    
    // СТРОГАЯ ВАЛИДАЦИЯ: гарантирует, что в базу попадет только правильный объект
    const parsedData = pushSubscriptionSchema.parse(body);
    
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Не удалось определить ID пользователя' }, { status: 400 });
    }

    // Сохраняем валидный объект в базу как JSON-строку
    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: JSON.stringify(parsedData.subscription) }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверный формат подписки', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка сохранения подписки:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}