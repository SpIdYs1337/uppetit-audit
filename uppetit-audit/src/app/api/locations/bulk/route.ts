import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { applyLocationBulk, locationBulkSchema, LocationInputError } from '@/lib/locationManagement';

export async function PATCH(request: Request) {
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;
  try {
    const input = locationBulkSchema.parse(await request.json());
    const count = await prisma.$transaction(tx => applyLocationBulk(tx, input), { isolationLevel: 'Serializable', timeout: 20000 });
    return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    if (cause instanceof z.ZodError || cause instanceof LocationInputError) return NextResponse.json({ error: cause instanceof LocationInputError ? cause.message : 'Проверьте выбранные точки и параметры.' }, { status: 400 });
    if ((cause as { code?: string }).code === 'P2034') return NextResponse.json({ error: 'Назначения изменились одновременно. Обновите список и повторите действие.' }, { status: 409 });
    return NextResponse.json({ error: 'Не удалось изменить точки. Изменения отменены.' }, { status: 500 });
  }
}
