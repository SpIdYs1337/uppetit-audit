import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    // Находим все точки, где старое поле tuId еще заполнено, и зануляем его
    const result = await prisma.location.updateMany({
      where: { tuId: { not: null } },
      data: { tuId: null }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Очистка завершена. Освобождено точек от фантомов: ${result.count}` 
    });
  } catch (err) {
    console.error('Ошибка очистки фантомов:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}