import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш щит безопасности

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const schedulePostSchema = z.object({
  userId: z.string().min(1, 'Укажите сотрудника'),
  locationId: z.string().min(1, 'Укажите точку'),
  date: z.string().min(1, 'Укажите дату'),
});

export async function GET(request: Request) {
  // 1. Просмотр расписания доступен всем авторизованным пользователям
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // Отдаем ТОЛЬКО активные планы (status: 'PLANNED')
    const plans = await prisma.visitPlan.findMany({
      where: {
        ...(userId ? { userId } : {}), // Если есть userId - фильтруем по нему
        status: 'PLANNED'              // Исключаем завершенные ('DONE')
      },
      include: { location: true, user: true },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(plans);
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  // 1. Создавать планы могут только АДМИНЫ и ТУ
  const { error } = await requireAuth(['ADMIN', 'TU']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // 2. ВАЛИДАЦИЯ ZOD
    const parsedData = schedulePostSchema.parse(body);

    const newPlan = await prisma.visitPlan.create({
      data: { 
        userId: parsedData.userId, 
        locationId: parsedData.locationId, 
        date: new Date(parsedData.date) 
      } // status по умолчанию будет 'PLANNED'
    });
    return NextResponse.json(newPlan);
  } catch (error) { 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 }); 
  }
}

export async function DELETE(request: Request) {
  // 1. Удалять планы могут только АДМИНЫ и ТУ
  const { error } = await requireAuth(['ADMIN', 'TU']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID не указан' }, { status: 400 });

    await prisma.visitPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); 
  }
}