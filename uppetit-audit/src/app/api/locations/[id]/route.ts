import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш хелпер безопасности

// Описываем тип параметров именно так, как хочет сервер Next.js 15+
type RouteContext = {
  params: Promise<{ id: string }>
}

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const locationPatchSchema = z.object({
  tuId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  activeFrom: z.string().nullable().optional(),
  activeTo: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  // 1. ЗАЩИТА: Только АДМИН может редактировать параметры точек (назначать ТУ, менять статус)
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    // 2. Разворачиваем параметры
    const { id } = await context.params;
    
    // 3. Читаем тело запроса и валидируем через Zod
    const body = await request.json();
    const parsedData = locationPatchSchema.parse(body);
    
    // 4. Собираем данные
    const updateData: any = {};
    if (parsedData.tuId !== undefined) updateData.tuId = parsedData.tuId;
    if (parsedData.isActive !== undefined) updateData.isActive = parsedData.isActive;
    if (parsedData.activeFrom !== undefined) updateData.activeFrom = parsedData.activeFrom ? new Date(parsedData.activeFrom) : null;
    if (parsedData.activeTo !== undefined) updateData.activeTo = parsedData.activeTo ? new Date(parsedData.activeTo) : null;

    // 5. Обновляем базу
    const updatedLocation = await prisma.location.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error("Ошибка обновления точки:", error);
    return NextResponse.json(
      { error: "Не удалось обновить точку" }, 
      { status: 500 }
    );
  }
}