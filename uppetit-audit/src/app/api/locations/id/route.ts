import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Вытаскиваем только те данные, которые пришли в запросе
    const updateData: any = {};
    if (body.tuId !== undefined) updateData.tuId = body.tuId; // Может быть null (отвязка)
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.activeFrom !== undefined) updateData.activeFrom = body.activeFrom ? new Date(body.activeFrom) : null;
    if (body.activeTo !== undefined) updateData.activeTo = body.activeTo ? new Date(body.activeTo) : null;

    const updatedLocation = await prisma.location.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Ошибка обновления точки:", error);
    return NextResponse.json({ error: "Не удалось обновить точку" }, { status: 500 });
  }
}

// Если у тебя тут был метод DELETE для точки, оставь его ниже