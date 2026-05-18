import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import { Role } from '@prisma/client'; 

export const dynamic = 'force-dynamic';

// --- СХЕМА ВАЛИДАЦИИ ---
const auditPostSchema = z.object({
  userId: z.string().min(1, "Требуется ID пользователя"),
  locationId: z.string().min(1, "Требуется ID точки"),
  checklistId: z.string().min(1, "Требуется ID чек-листа"),
  score: z.number(),
  maxScore: z.number().optional(),
  shiftEmployees: z.array(z.string()).default([]),
  generalComment: z.string().optional(),
  answers: z.array(z.object({
    zone: z.string().optional(),
    questionText: z.string(),
    isOk: z.boolean(),
    penalty: z.number().default(0),
    photos: z.array(z.string()).default([]),
    comment: z.string().optional()
  }))
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = auditPostSchema.parse(body);

    // 1. ИЩЕМ АКТИВНУЮ ВЕРСИЮ ЧЕК-ЛИСТА
    const activeVersion = await prisma.checklistVersion.findFirst({
      where: { checklistId: data.checklistId, isActive: true },
      include: { items: true } 
    });

    if (!activeVersion) {
      return NextResponse.json({ error: 'Не найдена активная версия чек-листа' }, { status: 400 });
    }

    // 1.5 ПОЛУЧАЕМ ДАННЫЕ ДЛЯ СНЭПШОТА
    const [user, location] = await Promise.all([
      // Добавили name: true, чтобы сохранять нормальное имя аудитора
      prisma.user.findUnique({ where: { id: data.userId }, select: { login: true, name: true } }),
      prisma.location.findUnique({ 
        where: { id: data.locationId }, 
        include: { tu: { select: { name: true, login: true } } } 
      })
    ]);

    // Формируем слепки (Имя, а если нет имени - логин)
    const actingTuName = location?.tu ? (location.tu.name || location.tu.login) : 'Не был назначен';
    const actingAuditorName = user ? (user.name || user.login) : 'Неизвестный аудитор';

    // 2. СОХРАНЯЕМ АУДИТ
    const newAudit = await prisma.audit.create({
      data: {
        userId: data.userId,
        locationId: data.locationId,
        auditorName: actingAuditorName, // Впечатываем имя аудитора
        locationName: location?.name || 'Неизвестная точка', 
        tuName: actingTuName, // Впечатываем ТУ
        checklistVersionId: activeVersion.id, 
        score: data.score,
        maxScore: data.maxScore,
        shiftEmployees: data.shiftEmployees,
        generalComment: data.generalComment,
        
        // 3. СОХРАНЯЕМ ОТВЕТЫ С ПРИВЯЗКОЙ К ВОПРОСАМ
        answers: {
          create: data.answers.map(ans => {
            const matchedItem = activeVersion.items.find(i => i.text === ans.questionText);
            
            return {
              itemId: matchedItem?.id, 
              zone: ans.zone || 'Основной раздел',
              question: ans.questionText,
              isOk: ans.isOk,
              penalty: ans.penalty,
              photos: ans.photos,
              comment: ans.comment
            };
          })
        }
      }
    });

    // =================================================================
    // 4. АВТОМАТИЧЕСКОЕ ЗАКРЫТИЕ ПЛАНА ВИЗИТОВ В КАЛЕНДАРЕ
    // =================================================================
    try {
      // Устанавливаем границы сегодняшнего дня (от 00:00 до 23:59)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Ищем запланированный визит и меняем статус
      await prisma.visitPlan.updateMany({
        where: {
          userId: data.userId,
          locationId: data.locationId,
          status: 'PLANNED', // Ищем только незакрытые
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        data: {
          status: 'DONE' // Закрываем задачу!
        }
      });
    } catch (planError) {
      console.error('Не удалось автоматически закрыть план визита:', planError);
    }
    // =================================================================

    return NextResponse.json({ success: true, audit: newAudit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные формы', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка POST /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка сохранения аудита' }, { status: 500 });
  }
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const audits = await prisma.audit.findMany({
      include: {
        // Подтягиваем имя юзера
        user: { select: { id: true, login: true, name: true } },
        location: { select: { id: true, name: true } },
        checklistVersion: {
          include: {
            checklist: { select: { id: true, title: true } }
          }
        },
        answers: true
      },
      orderBy: { date: 'desc' }
    });

    // Адаптируем ответ для фронтенда
    const formattedAudits = audits.map(audit => ({
      ...audit,
      location: audit.location ? audit.location : { id: 'deleted', name: audit.locationName || 'Удаленная точка' },
      
      // Отдаем на фронтенд Имя вместо логина (если юзер удален, отдаем слепок)
      user: audit.user ? {
        id: audit.user.id,
        login: audit.user.name || audit.user.login
      } : { 
        id: 'deleted', 
        login: audit.auditorName || 'Удаленный аудитор' 
      },
      
      checklist: {
        id: audit.checklistVersion.checklist.id,
        title: audit.checklistVersion.checklist.title,
        version: audit.checklistVersion.version
      }
    }));

    return NextResponse.json(formattedAudits);
  } catch (err) {
    console.error('Ошибка GET /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка загрузки аудитов' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');
    
    if (clearAll === 'true') {
      await prisma.audit.deleteMany({});
    } else if (id) {
      await prisma.audit.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Нет ID для удаления' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Ошибка DELETE /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}