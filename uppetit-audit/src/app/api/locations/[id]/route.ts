import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; // <-- Импортируем Enum

export const dynamic = 'force-dynamic';

// Универсальная схема для частичного обновления (PATCH)
const locationUpdateSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  address: z.string().optional().nullable(),
  // Магия: разрешаем null, undefined и пустые строки, превращая их в null для БД
  tuId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  isActive: z.boolean().optional(),
});

// ИЗМЕНЕНО: Типизируем params как Promise, как того требует новый Next.js
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ИЗМЕНЕНО: Строгий Role.ADMIN
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    // ИЗМЕНЕНО: Достаем id через await
    const { id } = await params;

    const body = await req.json();
    const parsedData = locationUpdateSchema.parse(body);

    const updatedLocation = await prisma.location.update({
      where: { id }, // Используем извлеченный id
      data: parsedData,
    });

    return NextResponse.json(updatedLocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка PATCH /api/locations/[id]:', err);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}