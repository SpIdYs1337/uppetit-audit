import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш центральный щит

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const locationPostSchema = z.object({
  name: z.string().min(1, 'Название точки обязательно'),
  address: z.string().nullable().optional(),
});

const locationPutSchema = z.object({
  id: z.string().min(1, 'ID точки обязательно'),
  name: z.string().optional(),
  address: z.string().nullable().optional(),
  tuId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  activeFrom: z.string().nullable().optional(),
  activeTo: z.string().nullable().optional(),
});

const locationDeleteSchema = z.object({
  id: z.string().min(1, 'ID точки обязательно'),
});


// ПОЛУЧЕНИЕ СПИСКА ТОЧЕК
export async function GET() {
  // 1. Просмотр доступен всем авторизованным
  const { error } = await requireAuth();
  if (error) return error;
  
  try {
    const locations = await prisma.location.findMany({
      include: {
        tu: true, // Подтягиваем данные территориального управляющего
        audits: {
          orderBy: { date: 'desc' }, // Сортируем от новых к старым
          take: 1, // Берем только самый последний аудит
          include: { checklist: true } // Подтягиваем чек-лист этого аудита
        }
      },
      orderBy: { name: 'asc' } // Сортируем по алфавиту
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 });
  }
}


// СОЗДАНИЕ НОВОЙ ТОЧКИ
export async function POST(request: Request) {
  // 1. Создание доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = locationPostSchema.parse(body);

    const newLocation = await prisma.location.create({
      data: {
        name: parsedData.name,
        address: parsedData.address || null,
      },
    });

    return NextResponse.json(newLocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Ошибка при создании точки' }, { status: 500 });
  }
}


// ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕЙ ТОЧКИ
export async function PUT(request: Request) {
  // 1. Обновление доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = locationPutSchema.parse(body);

    // Собираем объект обновления только из тех полей, которые прислал клиент
    const updateData: any = {};
    
    if (parsedData.name !== undefined) updateData.name = parsedData.name;
    if (parsedData.address !== undefined) updateData.address = parsedData.address;
    if (parsedData.tuId !== undefined) updateData.tuId = parsedData.tuId;
    if (parsedData.isActive !== undefined) updateData.isActive = parsedData.isActive;
    if (parsedData.activeFrom !== undefined) updateData.activeFrom = parsedData.activeFrom ? new Date(parsedData.activeFrom) : null;
    if (parsedData.activeTo !== undefined) updateData.activeTo = parsedData.activeTo ? new Date(parsedData.activeTo) : null;

    const updatedLocation = await prisma.location.update({
      where: { id: parsedData.id },
      data: updateData,
    });

    return NextResponse.json(updatedLocation);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Ошибка при обновлении точки' }, { status: 500 });
  }
}


// УДАЛЕНИЕ ТОЧКИ
export async function DELETE(request: Request) {
  // 1. Удаление доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = locationDeleteSchema.parse(body);

    await prisma.location.delete({
      where: { id: parsedData.id },
    });

    return NextResponse.json({ message: 'Точка успешно удалена' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Ошибка при удалении' }, { status: 500 });
  }
}