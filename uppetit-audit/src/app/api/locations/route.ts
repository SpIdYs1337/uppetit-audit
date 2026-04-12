import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ПОЛУЧЕНИЕ СПИСКА ТОЧЕК
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' } // Сортируем по алфавиту
    });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 });
  }
}

// СОЗДАНИЕ НОВОЙ ТОЧКИ
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

// ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕЙ ТОЧКИ (Добавленный метод)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, address } = body;

    const updatedLocation = await prisma.location.update({
      where: { id },
      data: { 
        name,
        address 
      },
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка при обновлении точки' }, { status: 500 });
  }
}

// УДАЛЕНИЕ ТОЧКИ
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