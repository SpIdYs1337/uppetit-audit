import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; 

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ---
const locationPostSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().optional().nullable(),
  // ИЗМЕНЕНО: Теперь ждем массив строк (ID сотрудников) вместо одного ID
  tuIds: z.array(z.string()).optional().default([]),
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
        // Читаем старую привязку (для совместимости)
        tu: { select: { id: true, name: true, login: true } }, 
        // ИЗМЕНЕНО: Читаем новую множественную привязку
        tus: { select: { id: true, name: true, login: true } },
        // ИЗМЕНЕНО: Достаем баллы последнего аудита для карточки
        audits: {
          orderBy: { date: 'desc' },
          take: 1, 
          select: { score: true }
        }
      }
    });
    return NextResponse.json(locations);
  } catch (err) {
    console.error('Ошибка GET /api/locations:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Защита: Создавать могут только Админы
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsedData = locationPostSchema.parse(body);

    const newLocation = await prisma.location.create({
      data: {
        name: parsedData.name,
        address: parsedData.address,
        isActive: parsedData.isActive,
        // ИЗМЕНЕНО: Если в массиве есть ID, привязываем их все сразу при создании
        ...(parsedData.tuIds.length > 0 ? {
          tus: {
            connect: parsedData.tuIds.map(id => ({ id }))
          }
        } : {})
      },
      include: {
        tus: { select: { id: true, name: true, login: true } }
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
  // Защита: Удалять могут только Админы
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