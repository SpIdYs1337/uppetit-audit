import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; 
import { locationAccessWhere, auditAccessWhere } from '@/lib/accessControl';
import { locationCreateSchema, validateLocationPeriod, validateManagers, LocationInputError } from '@/lib/locationManagement';

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ВАЛИДАЦИИ ---
const locationPostSchema = locationCreateSchema;

const locationDeleteSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
});

export async function GET() {
  // Строгая аутентификация: только авторизованные пользователи
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const locations = await prisma.location.findMany({
      where: locationAccessWhere(session!.user),
      orderBy: { name: 'asc' },
      include: { 
        tu: { select: { id: true, name: true, login: true } }, 
        // Безопасно вытягиваем массив привязанных ТУ
        tus: { select: { id: true, name: true, login: true } },
        audits: {
          where: auditAccessWhere(session!.user),
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
  // Строгая авторизация: Создавать точки могут только Администраторы
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsedData = locationPostSchema.parse(body);
    validateLocationPeriod(parsedData.activeFrom, parsedData.activeTo);
    const newLocation = await prisma.$transaction(async tx => {
      await validateManagers(tx, parsedData.tuIds);
      return tx.location.create({
      data: {
        name: parsedData.name,
        address: parsedData.address,
        isActive: parsedData.isActive,
        activeFrom: parsedData.activeFrom ? new Date(parsedData.activeFrom) : null,
        activeTo: parsedData.activeTo ? new Date(parsedData.activeTo) : null,
        // Атомарно подключаем всех переданных ТУ через промежуточную таблицу
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
    });

    return NextResponse.json(newLocation);
  } catch (err) {
    if (err instanceof LocationInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные формы', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка POST /api/locations:', err);
    return NextResponse.json({ error: 'Ошибка создания точки' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // Строгая авторизация: Удалять точки могут только Администраторы
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
