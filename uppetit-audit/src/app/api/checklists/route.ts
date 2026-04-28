import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; 

export const dynamic = 'force-dynamic';

// --- ИНТЕРФЕЙС ДЛЯ ВОПРОСОВ С ФРОНТЕНДА ---
interface IncomingChecklistItem {
  text?: string;
  question?: string;
  zone?: string;
  score?: number | string;
  isCritical?: boolean | string | number;
}

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const checklistPostSchema = z.object({
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.unknown(), // Заменили any на unknown
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional().default([Role.AUDITOR, Role.TU]),
});

const checklistPutSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.unknown(), // Заменили any на unknown
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional(),
});

// Вспомогательная функция для парсинга ролей с фронтенда
function parseRoles(rolesRaw: unknown): Role[] { // Заменили any на unknown
  if (Array.isArray(rolesRaw)) return rolesRaw as Role[];
  if (typeof rolesRaw === 'string') {
    try {
      const parsed = JSON.parse(rolesRaw);
      if (Array.isArray(parsed)) return parsed as Role[];
    } catch { 
      // Если это не JSON, а просто строка с одной ролью
      return [rolesRaw as Role];
    }
  }
  return [Role.AUDITOR, Role.TU]; // Значение по умолчанию
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const checklists = await prisma.checklist.findMany({
      include: {
        versions: {
          where: { isActive: true },
          include: { 
            items: { orderBy: { order: 'asc' } } 
          }
        }
      },
      orderBy: { title: 'asc' } 
    });

    const formattedChecklists = checklists.map(cl => {
      const activeVersion = cl.versions[0];
      
      return {
        id: cl.id,
        title: cl.title,
        redThreshold: cl.redThreshold,
        yellowThreshold: cl.yellowThreshold,
        allowedRoles: cl.allowedRoles,
        
        activeVersionId: activeVersion?.id,
        version: activeVersion?.version || 1, 
        
        items: activeVersion?.items || [] 
      };
    });

    return NextResponse.json(formattedChecklists);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    
    const parsedData = checklistPostSchema.parse(body);
    
    const itemsArray = typeof parsedData.items === 'string' ? JSON.parse(parsedData.items) : parsedData.items;

    const cleanRoles = parseRoles(parsedData.allowedRoles);

    const newChecklist = await prisma.checklist.create({
      data: {
        title: parsedData.title,
        redThreshold: parsedData.redThreshold,
        yellowThreshold: parsedData.yellowThreshold,
        allowedRoles: cleanRoles, 
        
        versions: {
          create: {
            version: 1,
            isActive: true,
            items: {
              // Добавили строгий тип IncomingChecklistItem вместо any
              create: itemsArray.map((item: IncomingChecklistItem, index: number) => ({
                text: item.text || item.question || 'Новый вопрос',
                zone: item.zone || 'Основной раздел',
                score: Number(item.score) || 0,
                isCritical: Boolean(item.isCritical),
                order: index
              }))
            }
          }
        }
      }
    });
    
    return NextResponse.json(newChecklist);
  } catch (error: unknown) { // Типизировали error
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    
    const parsedData = checklistPutSchema.parse(body);
    const itemsArray = typeof parsedData.items === 'string' ? JSON.parse(parsedData.items) : parsedData.items;

    const cleanRoles = parsedData.allowedRoles ? parseRoles(parsedData.allowedRoles) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const cl = await tx.checklist.update({
        where: { id: parsedData.id },
        data: {
          title: parsedData.title,
          redThreshold: parsedData.redThreshold,
          yellowThreshold: parsedData.yellowThreshold,
          ...(cleanRoles && { allowedRoles: cleanRoles }),
        }
      });

      if (itemsArray && Array.isArray(itemsArray)) {
        const currentActive = await tx.checklistVersion.findFirst({
          where: { checklistId: parsedData.id, isActive: true },
          orderBy: { version: 'desc' }
        });
        
        const nextVersionNum = currentActive ? currentActive.version + 1 : 1;

        await tx.checklistVersion.updateMany({
          where: { checklistId: parsedData.id },
          data: { isActive: false }
        });

        await tx.checklistVersion.create({
          data: {
            checklistId: parsedData.id,
            version: nextVersionNum,
            isActive: true,
            items: {
              // Добавили строгий тип IncomingChecklistItem вместо any
              create: itemsArray.map((item: IncomingChecklistItem, index: number) => ({
                text: item.text || item.question || 'Новый вопрос',
                zone: item.zone || 'Основной раздел',
                score: Number(item.score) || 0,
                isCritical: Boolean(item.isCritical),
                order: index
              }))
            }
          }
        });
      }

      return cl;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) { // Типизировали error
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Нет ID' }, { status: 400 });

    await prisma.checklist.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) { // Типизировали error
    console.error(error);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}