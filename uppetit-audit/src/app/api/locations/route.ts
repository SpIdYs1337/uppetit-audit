import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ПОЛУЧЕНИЕ СПИСКА ТОЧЕК (Научили отдавать ТУ и последний аудит)
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: {
        tu: true, // Подтягиваем данные территориального управляющего
        audits: {
          orderBy: { date: 'desc' }, // Сортируем от новых к старым
          take: 1, // Берем только самый последний аудит
          include: { checklist: true } // Подтягиваем чек-лист этого аудита
        }
      },
      orderBy: { name: 'asc' } // Сортируем по алфавиту
    });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 });
  }
}

// СОЗДАНИЕ НОВОЙ ТОЧКИ (Оставляем как есть, точка по умолчанию будет активной и без ТУ)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address } = body;

    const newLocation = await prisma.location.create({
      data: {
        name,
        address,
      },
    });

    return NextResponse.json(newLocation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка при создании точки' }, { status: 500 });
  }
}

// ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕЙ ТОЧКИ (Научили понимать Drag-and-Drop и даты)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, address, tuId, isActive, activeFrom, activeTo } = body;

    // Собираем объект обновления только из тех полей, которые прислал клиент
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (tuId !== undefined) updateData.tuId = tuId; // Позволяет привязать к ТУ или отвязать (передав null)
    if (isActive !== undefined) updateData.isActive = isActive;
    if (activeFrom !== undefined) updateData.activeFrom = activeFrom ? new Date(activeFrom) : null;
    if (activeTo !== undefined) updateData.activeTo = activeTo ? new Date(activeTo) : null;

    const updatedLocation = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка при обновлении точки' }, { status: 500 });
  }
}

// УДАЛЕНИЕ ТОЧКИ (Оставляем как есть)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Точка успешно удалена' });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при удалении' }, { status: 500 });
  }
}