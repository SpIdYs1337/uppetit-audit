import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // Отдаем ТОЛЬКО активные планы (status: 'PLANNED')
    const plans = await prisma.visitPlan.findMany({
      where: {
        ...(userId ? { userId } : {}), // Если есть userId - фильтруем по нему
        status: 'PLANNED'              // Исключаем завершенные ('DONE')
      },
      include: { location: true, user: true },
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(plans);
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 }); 
  }
}

export async function POST(request: Request) {
  try {
    const { userId, locationId, date } = await request.json();
    const newPlan = await prisma.visitPlan.create({
      data: { userId, locationId, date: new Date(date) } // status по умолчанию будет 'PLANNED'
    });
    return NextResponse.json(newPlan);
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 }); 
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await prisma.visitPlan.delete({ where: { id: id as string } });
    return NextResponse.json({ success: true });
  } catch (error) { 
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 }); 
  }
}