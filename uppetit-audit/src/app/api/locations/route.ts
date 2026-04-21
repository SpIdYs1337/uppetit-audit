import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; // Импортируем Enum

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ---
const locationPostSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().optional().nullable(),
  tuId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  isActive: z.boolean().optional().default(true),
});

const locationDeleteSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: { 
        tu: { select: { id: true, login: true } } 
      }
    });
    return NextResponse.json(locations);
  } catch (err) {
    console.error('Ошибка GET /api/locations:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsedData = locationPostSchema.parse(body);

    const newLocation = await prisma.location.create({
      data: {
        name: parsedData.name,
        address: parsedData.address,
        tuId: parsedData.tuId,
        isActive: parsedData.isActive,
      }
    });

    return NextResponse.json(newLocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные формы', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка POST /api/locations:', err);
    return NextResponse.json({ error: 'Ошибка создания точки' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await req.json();
    const { id } = locationDeleteSchema.parse(body);

    await prisma.location.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка DELETE /api/locations:', err);
    return NextResponse.json({ error: 'Ошибка удаления точки' }, { status: 500 });
  }
}