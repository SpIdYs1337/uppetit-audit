import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { locationPatchSchema, locationUpdateData, validateLocationPeriod, validateManagers, LocationInputError } from '@/lib/locationManagement';

export const dynamic = 'force-dynamic';
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;
  try {
    const { id } = await context.params;
    const data = locationPatchSchema.parse(await req.json());
    const updated = await prisma.$transaction(async tx => {
      const current = await tx.location.findUnique({ where: { id } });
      if (!current) throw new LocationInputError('Точка не найдена.');
      validateLocationPeriod(data.activeFrom === undefined ? current.activeFrom : data.activeFrom, data.activeTo === undefined ? current.activeTo : data.activeTo);
      if (data.tuIds) await validateManagers(tx, data.tuIds);
      return tx.location.update({ where: { id }, data: locationUpdateData(data), include: { tus: { select: { id: true, name: true, login: true } }, tu: { select: { id: true, name: true, login: true } } } });
    }, { isolationLevel: 'Serializable' });
    return NextResponse.json(updated);
  } catch (cause) {
    if (cause instanceof z.ZodError || cause instanceof LocationInputError) return NextResponse.json({ error: cause instanceof LocationInputError ? cause.message : 'Проверьте данные и даты.' }, { status: 400 });
    if ((cause as { code?: string }).code === 'P2034') return NextResponse.json({ error: 'Точка изменилась одновременно. Обновите список и повторите сохранение.' }, { status: 409 });
    return NextResponse.json({ error: 'Не удалось сохранить точку.' }, { status: 500 });
  }
}
