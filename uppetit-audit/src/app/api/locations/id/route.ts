import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Ждем получения ID из параметров (важно для Next.js 15)
    const { id } = await props.params;
    
    // 2. Читаем тело запроса только ОДИН раз
    const body = await request.json();
    
    // 3. Собираем данные для обновления
    const updateData: any = {};
    
    if (body.tuId !== undefined) {
      updateData.tuId = body.tuId; // Позволяет передать null для отвязки
    }
    
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    
    if (body.activeFrom !== undefined) {
      updateData.activeFrom = body.activeFrom ? new Date(body.activeFrom) : null;
    }
    
    if (body.activeTo !== undefined) {
      updateData.activeTo = body.activeTo ? new Date(body.activeTo) : null;
    }

    // 4. Обновляем запись в базе
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

// Если потребуется метод DELETE, добавь его по аналогии:
/*
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  // логика удаления...
}
*/