import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; // <-- Импортируем Enum ролей

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
const checklistPostSchema = z.object({
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.any(), // Принимаем массив, распарсим внутри
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  // ИЗМЕНЕНО: Ожидаем массив ролей, но допускаем строку, если фронтенд еще присылает JSON.stringify
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional().default([Role.AUDITOR, Role.TU]),
});

const checklistPutSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: z.any(),
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  // ИЗМЕНЕНО: Ожидаем массив ролей
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional(),
});

// Вспомогательная функция для парсинга ролей с фронтенда
function parseRoles(rolesRaw: any): Role[] {
  if (Array.isArray(rolesRaw)) return rolesRaw as Role[];
  if (typeof rolesRaw === 'string') {
    try {
      const parsed = JSON.parse(rolesRaw);
      if (Array.isArray(parsed)) return parsed as Role[];
    } catch (e) {
      // Если это не JSON, а просто строка с одной ролью
      return [rolesRaw as Role];
    }
  }
  return [Role.AUDITOR, Role.TU]; // Значение по умолчанию
}

export async function GET() {
  // 1. Просмотр чек-листов доступен всем авторизованным пользователям
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // Достаем чек-листы вместе с их АКТИВНОЙ версией и вопросами
    const checklists = await prisma.checklist.findMany({
      include: {
        versions: {
          where: { isActive: true },
          include: { 
            items: { orderBy: { order: 'asc' } } // Сортируем вопросы по порядку
          }
        }
      },
      orderBy: { title: 'asc' } 
    });

    // Адаптируем данные для фронтенда (чтобы не ломать старый UI)
    const formattedChecklists = checklists.map(cl => {
      const activeVersion = cl.versions[0];
      
      return {
        id: cl.id,
        title: cl.title,
        redThreshold: cl.redThreshold,
        yellowThreshold: cl.yellowThreshold,
        allowedRoles: cl.allowedRoles,
        
        // Отдаем ID активной версии (важно для сохранения проверок)
        activeVersionId: activeVersion?.id,
        version: activeVersion?.version || 1, 
        
        // Фронтенд ждет массив items, отдаем его прямо из версии
        items: activeVersion?.items || [] 
      };
    });

    return NextResponse.json(formattedChecklists);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // 1. Создание доступно ТОЛЬКО администраторам
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = checklistPostSchema.parse(body);
    
    // Превращаем items в нормальный массив объектов, если пришла строка
    const itemsArray = typeof parsedData.items === 'string' ? JSON.parse(parsedData.items) : parsedData.items;

    // Парсим роли в чистый массив Enum'ов
    const cleanRoles = parseRoles(parsedData.allowedRoles);

    // МАГИЯ PRISMA: Создаем всё дерево за один запрос
    const newChecklist = await prisma.checklist.create({
      data: {
        title: parsedData.title,
        redThreshold: parsedData.redThreshold,
        yellowThreshold: parsedData.yellowThreshold,
        allowedRoles: cleanRoles, // Сохраняем как массив Role[]
        
        // Вложенное создание версии и вопросов
        versions: {
          create: {
            version: 1,
            isActive: true,
            items: {
              create: itemsArray.map((item: any, index: number) => ({
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
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    
    // ВАЛИДАЦИЯ ZOD
    const parsedData = checklistPutSchema.parse(body);
    const itemsArray = typeof parsedData.items === 'string' ? JSON.parse(parsedData.items) : parsedData.items;

    const cleanRoles = parsedData.allowedRoles ? parseRoles(parsedData.allowedRoles) : undefined;

    // Используем транзакцию для атомарного обновления
    const updated = await prisma.$transaction(async (tx) => {
      // Шаг 1: Обновляем базовые настройки чек-листа
      const cl = await tx.checklist.update({
        where: { id: parsedData.id },
        data: {
          title: parsedData.title,
          redThreshold: parsedData.redThreshold,
          yellowThreshold: parsedData.yellowThreshold,
          // Обновляем роли только если они были переданы
          ...(cleanRoles && { allowedRoles: cleanRoles }),
        }
      });

      // Шаг 2: Выпускаем новую версию, если переданы вопросы
      if (itemsArray && Array.isArray(itemsArray)) {
        // Узнаем номер текущей версии
        const currentActive = await tx.checklistVersion.findFirst({
          where: { checklistId: parsedData.id, isActive: true },
          orderBy: { version: 'desc' }
        });
        
        const nextVersionNum = currentActive ? currentActive.version + 1 : 1;

        // Деактивируем все старые версии
        await tx.checklistVersion.updateMany({
          where: { checklistId: parsedData.id },
          data: { isActive: false }
        });

        // Создаем новую активную версию со свежими вопросами
        await tx.checklistVersion.create({
          data: {
            checklistId: parsedData.id,
            version: nextVersionNum,
            isActive: true,
            items: {
              create: itemsArray.map((item: any, index: number) => ({
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
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Нет ID' }, { status: 400 });

    // Благодаря onDelete: Cascade в Prisma, удаление чек-листа
    // автоматически удалит все его версии и все вопросы!
    await prisma.checklist.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}