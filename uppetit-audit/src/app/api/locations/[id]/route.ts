import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ОБНОВЛЕНИЯ ТОЧКИ ---
const locationPatchSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  address: z.string().nullable().optional(),
  tuIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  // Разрешаем строку, дату или null
  activeFrom: z.union([z.string(), z.date()]).nullable().optional(),
  activeTo: z.union([z.string(), z.date()]).nullable().optional(),
});

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
    
    // 2. ВАЛИДАЦИЯ ЧЕРЕЗ ZOD
    const parsedData = locationPatchSchema.parse(body);

    // 3. ФОРМИРУЕМ ДАННЫЕ ДЛЯ ОБНОВЛЕНИЯ (Без использования any)
    const updateData: Record<string, any> = {};
    
    if (parsedData.name !== undefined) updateData.name = parsedData.name;
    if (parsedData.address !== undefined) updateData.address = parsedData.address;
    if (parsedData.isActive !== undefined) updateData.isActive = parsedData.isActive;
    
    // Безопасное приведение дат для Prisma
    if (parsedData.activeFrom !== undefined) {
      updateData.activeFrom = parsedData.activeFrom ? new Date(parsedData.activeFrom) : null;
    }
    if (parsedData.activeTo !== undefined) {
      updateData.activeTo = parsedData.activeTo ? new Date(parsedData.activeTo) : null;
    }

    // 4. МАГИЯ PRISMA ДЛЯ МАССИВА ТУ
    if (parsedData.tuIds) {
      updateData.tus = {
        set: parsedData.tuIds.map((id) => ({ id }))
      };
    }

    // 5. СОХРАНЯЕМ В БАЗУ
    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
      include: {
        tus: { select: { id: true, name: true, login: true } }
      }
    });

    return NextResponse.json(updatedLocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка PATCH /api/locations/[id]:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при обновлении точки' }, { status: 500 });
  }
}