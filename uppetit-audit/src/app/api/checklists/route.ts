import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш единый центр защиты

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const checklistPostSchema = z.object({
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.any(), // Массив вопросов, который мы превратим в JSON-строку
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.string().optional(),
});

const checklistPutSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.any(),
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.string().optional(),
});

export async function GET() {
  // 1. Просмотр чек-листов доступен всем авторизованным пользователям
  const { error } = await requireAuth();
  if (error) return error;

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

export async function POST(request: Request) {
  // 1. Создание доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = checklistPostSchema.parse(body);
    
    // Надежно превращаем массив/объект в строку для базы
    const itemsData = typeof parsedData.items === 'string' ? parsedData.items : JSON.stringify(parsedData.items);

    const newChecklist = await prisma.checklist.create({
      data: {
        title: parsedData.title,
        items: itemsData,
        redThreshold: parsedData.redThreshold,
        yellowThreshold: parsedData.yellowThreshold,
        allowedRoles: parsedData.allowedRoles || JSON.stringify(['AUDITOR', 'TU']),
      }
    });
    return NextResponse.json(newChecklist);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // 1. Обновление доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = checklistPutSchema.parse(body);
    const itemsData = typeof parsedData.items === 'string' ? parsedData.items : JSON.stringify(parsedData.items);

    const updated = await prisma.checklist.update({
      where: { id: parsedData.id },
      data: {
        title: parsedData.title,
        items: itemsData,
        redThreshold: parsedData.redThreshold,
        yellowThreshold: parsedData.yellowThreshold,
        allowedRoles: parsedData.allowedRoles,
      }
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // 1. Удаление доступно ТОЛЬКО администраторам
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Нет ID' }, { status: 400 });

    await prisma.checklist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}