import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; 
import { Role } from '@prisma/client'; 

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ POST ---
const schedulePostSchema = z.object({
  userId: z.string().min(1, 'Укажите сотрудника'),
  locationId: z.string().min(1, 'Укажите точку'),
  date: z.string().min(1, 'Укажите дату'),
});


export async function GET(request: Request) {
  // 1. ЩИТ БЕЗОПАСНОСТИ: Проверяем, авторизован ли пользователь в принципе
  const { error, session } = await requireAuth();
  if (error || !session?.user) {
    return error || NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;
  const currentUserRole = (session.user as any).role;

  const { searchParams } = new URL(request.url);
  let targetUserId = searchParams.get('userId');

  // 2. ОГРАНИЧЕНИЕ ДОСТУПА НА УРОВНЕ СТРОКИ (DATA-LEVEL SECURITY):
  // Если пользователь НЕ является администратором, он имеет право смотреть ТОЛЬКО свои планы.
  // Если он пытается передать чужой userId в параметрах, мы принудительно переписываем его на его собственный ID.
  if (currentUserRole !== Role.ADMIN) {
    targetUserId = currentUserId;
  }

  try {
    const plans = await prisma.visitPlan.findMany({
      where: {
        // Если это админ и он не передал конкретный userId, выгружаем планы всех сотрудников компании.
        // Если это обычный сотрудник, тут всегда будет строго его личный targetUserId.
        ...(targetUserId ? { userId: targetUserId } : {}), 
      },
      include: { 
        location: true, 
        user: true,
        assigner: true 
      },
      orderBy: { date: 'asc' }
    });
    
    return NextResponse.json(plans);
  } catch (err) { 
    console.error('Ошибка при получении расписания:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при чтении данных' }, { status: 500 }); 
  }
}


export async function POST(request: Request) {
  const { error, session } = await requireAuth([Role.ADMIN, Role.AUDITOR, Role.TU]);
  if (error) return error;

  try {
    const body = await request.json();
    const parsedData = schedulePostSchema.parse(body);

    const currentUserId = (session.user as any).id;
    const isPersonalPlan = currentUserId === parsedData.userId;
    const assignerId = isPersonalPlan ? null : currentUserId;

    const newPlan = await prisma.visitPlan.create({
      data: { 
        userId: parsedData.userId, 
        locationId: parsedData.locationId, 
        date: new Date(parsedData.date),
        assignerId: assignerId 
      } 
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
  const { error } = await requireAuth([Role.ADMIN, Role.AUDITOR, Role.TU]);
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