import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Описываем тип параметров именно так, как хочет сервер
type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Разворачиваем параметры
    const { id } = await context.params;
    
    // 2. Читаем тело запроса
    const body = await request.json();
    
    // 3. Собираем данные
    const updateData: any = {};
    if (body.tuId !== undefined) updateData.tuId = body.tuId;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.activeFrom !== undefined) updateData.activeFrom = body.activeFrom ? new Date(body.activeFrom) : null;
    if (body.activeTo !== undefined) updateData.activeTo = body.activeTo ? new Date(body.activeTo) : null;

    // 4. Обновляем базу
    const updatedLocation = await prisma.location.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Ошибка обновления точки:", error);
    return NextResponse.json(
      { error: "Не удалось обновить точку" }, 
      { status: 500 }
    );
  }
}