import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ПОЛУЧИТЬ ВСЕ ЧЕК-ЛИСТЫ
export async function GET() {
  try {
    const checklists = await prisma.checklist.findMany({
      orderBy: { title: 'asc' } 
    });
    return NextResponse.json(checklists);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

// СОЗДАТЬ НОВЫЙ ЧЕК-ЛИСТ
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Подстраховка: если items это массив, делаем из него строку (для базы данных)
    const itemsData = typeof body.items === 'string' ? body.items : JSON.stringify(body.items);

    const newChecklist = await prisma.checklist.create({
      data: {
        title: body.title,
        items: itemsData,
        // ДОБАВЛЕНО: Сохраняем пороги зон (с дефолтными значениями, если их нет)
        redThreshold: body.redThreshold !== undefined ? Number(body.redThreshold) : 70,
        yellowThreshold: body.yellowThreshold !== undefined ? Number(body.yellowThreshold) : 90,
      }
    });
    return NextResponse.json(newChecklist);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}

// ОБНОВИТЬ СУЩЕСТВУЮЩИЙ ЧЕК-ЛИСТ
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const itemsData = typeof body.items === 'string' ? body.items : JSON.stringify(body.items);

    const updated = await prisma.checklist.update({
      where: { id: body.id },
      data: {
        title: body.title,
        items: itemsData,
        // ДОБАВЛЕНО: Обновляем пороги зон
        redThreshold: body.redThreshold !== undefined ? Number(body.redThreshold) : 70,
        yellowThreshold: body.yellowThreshold !== undefined ? Number(body.yellowThreshold) : 90,
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

// УДАЛИТЬ ЧЕК-ЛИСТ
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Нет ID' }, { status: 400 });

    await prisma.checklist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}