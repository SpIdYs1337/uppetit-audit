import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш щит безопасности
import { Role } from '@prisma/client'; // <-- Импортируем Enum ролей

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const schedulePostSchema = z.object({
  userId: z.string().min(1, 'Укажите сотрудника'),
  locationId: z.string().min(1, 'Укажите точку'),
  date: z.string().min(1, 'Укажите дату'),
});

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // Отдаем ТОЛЬКО активные планы (status: 'PLANNED')
    const plans = await prisma.visitPlan.findMany({
      where: {
        ...(userId ? { userId } : {}), 
        status: 'PLANNED'              
      },
      include: { location: true, user: true },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(plans);
  } catch { 
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  // ИЗМЕНЕНО: Создавать планы могут только АДМИНЫ и ТУ (строгий Enum)
  const { error } = await requireAuth([Role.AUDITOR, Role.TU]);
  if (error) return error;

  try {
    const body = await request.json();
    
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
  // ИЗМЕНЕНО: Удалять планы могут только АДМИНЫ и ТУ (строгий Enum)
  const { error } = await requireAuth([Role.AUDITOR, Role.TU]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID не указан' }, { status: 400 });

    await prisma.visitPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch { 
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); 
  }
}