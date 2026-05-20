import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  // 1. ЩИТ БЕЗОПАСНОСТИ: Только Админы могут редактировать точки
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const params = await context.params;
    const locationId = params.id;
    
    if (!locationId) {
      return NextResponse.json({ error: 'ID локации не указан' }, { status: 400 });
    }

    const body = await req.json();
    const { name, address, tuIds, isActive, activeFrom, activeTo } = body;

    // 2. ФОРМИРУЕМ ДАННЫЕ ДЛЯ ОБНОВЛЕНИЯ
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (activeFrom !== undefined) updateData.activeFrom = activeFrom;
    if (activeTo !== undefined) updateData.activeTo = activeTo;

    // 3. МАГИЯ PRISMA ДЛЯ МАССИВА ТУ
    // Если фронтенд прислал массив tuIds, мы говорим базе: 
    // "Забудь все старые связи и установи строго вот эти"
    if (tuIds && Array.isArray(tuIds)) {
      updateData.tus = {
        set: tuIds.map((id: string) => ({ id }))
      };
    }

    // 4. СОХРАНЯЕМ В БАЗУ
    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
      include: {
        tus: { select: { id: true, name: true, login: true } } // Возвращаем обновленных ТУ на фронт
      }
    });

    return NextResponse.json(updatedLocation);
  } catch (err) {
    console.error('Ошибка PATCH /api/locations/[id]:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при обновлении точки' }, { status: 500 });
  }
}