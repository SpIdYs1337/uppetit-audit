import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import { Role } from '@prisma/client'; 
import webpush from 'web-push'; // Импортируем библиотеку пушей

export const dynamic = 'force-dynamic';

// Настройка ключей Web-Push (берутся из вашего .env)
webpush.setVapidDetails(
  'mailto:admin@uppetit.ru',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---
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

const auditDeleteSchema = z.object({
  id: z.string().optional().nullable(),
  clearAll: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = auditPostSchema.parse(body);

    const activeVersion = await prisma.checklistVersion.findFirst({
      where: { checklistId: data.checklistId, isActive: true },
      include: { items: true } 
    });

    if (!activeVersion) {
      return NextResponse.json({ error: 'Не найдена активная версия чек-листа' }, { status: 400 });
    }

    const [user, location] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId }, select: { login: true, name: true } }),
      prisma.location.findUnique({ 
        where: { id: data.locationId }, 
        include: { 
          tu: { select: { id: true, name: true, login: true } },
          tus: { select: { id: true, name: true, login: true } } 
        } 
      })
    ]);

    let actingTuName = 'Не был назначен';
    if (location?.tus && location.tus.length > 0) {
      actingTuName = location.tus.map(t => t.name || t.login).join(', ');
    } else if (location?.tu) {
      actingTuName = location.tu.name || location.tu.login;
    }

    const actingAuditorName = user ? (user.name || user.login) : 'Неизвестный аудитор';

    // 1. Создаем аудит в базе данных
    const newAudit = await prisma.audit.create({
      data: {
        userId: data.userId,
        locationId: data.locationId,
        auditorName: actingAuditorName,
        locationName: location?.name || 'Неизвестная точка', 
        tuName: actingTuName, 
        checklistVersionId: activeVersion.id, 
        score: data.score,
        maxScore: data.maxScore,
        shiftEmployees: data.shiftEmployees,
        generalComment: data.generalComment,
        
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

    // 2. Автоматически закрываем текущий план визита
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      await prisma.visitPlan.updateMany({
        where: {
          userId: data.userId,
          locationId: data.locationId,
          status: 'PLANNED',
          date: { gte: todayStart, lte: todayEnd }
        },
        data: { status: 'DONE' }
      });
    } catch (planError) {
      console.error('Не удалось автоматически закрыть план визита:', planError);
    }

    // 3. РАСПРЕДЕЛЕНИЕ И ОТПРАВКА PUSH-УВЕДОМЛЕНИЙ
    try {
      // Собираем всех ADMIN + ТУ, которые закреплены за точкой
      const targetUsers = await prisma.user.findMany({
        where: {
          pushSubscription: { not: null }, // Только пользователи с активной подпиской
          OR: [
            { role: Role.ADMIN }, // Администраторы получают ВСЁ
            { id: location?.tuId || undefined }, // Старая одиночная связь ТУ
            { locations: { some: { id: data.locationId } } } // Новая множественная связь ТУ
          ]
        },
        select: { id: true, pushSubscription: true }
      });

      if (targetUsers.length > 0) {
        const notificationPayload = JSON.stringify({
          title: 'Завершен аудит точки! 📍',
          body: `Точка: ${location?.name || 'Неизвестная'}\nРезультат: ${data.score} из ${data.maxScore || 100} б.\nАудитор: ${actingAuditorName}`,
          icon: '/logo3.png',
          badge: '/logo3.png',
        });

        // Веерная рассылка по устройствам
        for (const targetUser of targetUsers) {
          if (!targetUser.pushSubscription) continue;
          try {
            const subscriptionObj = JSON.parse(targetUser.pushSubscription);
            await webpush.sendNotification(subscriptionObj, notificationPayload);
          } catch (pushSendErr: any) {
            console.error(`Ошибка отправки пуша пользователю ${targetUser.id}:`, pushSendErr);
            // Если подписка протухла (410 или 404), удаляем токен, чтобы не грузить сервер в следующий раз
            if (pushSendErr.statusCode === 410 || pushSendErr.statusCode === 404) {
              await prisma.user.update({
                where: { id: targetUser.id },
                data: { pushSubscription: null }
              });
            }
          }
        }
      }
    } catch (pushGlobalError) {
      console.error('Ошибка в блоке отправки пуш-уведомлений:', pushGlobalError);
    }

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
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const currentUserId = session?.user?.id;
    const currentUserRole = (session?.user as any)?.role;

    // Безопасный серверный фильтр: ТУ видит строго свою зону ответственности
    const whereClause: any = {};
    if (currentUserRole === Role.TU && currentUserId) {
      whereClause.location = {
        OR: [
          { tuId: currentUserId },
          { tus: { some: { id: currentUserId } } }
        ]
      };
    }

    const audits = await prisma.audit.findMany({
      where: whereClause, 
      include: {
        user: { select: { id: true, login: true, name: true } },
        location: { 
          select: { 
            id: true, 
            name: true,
            tus: { select: { id: true, name: true, login: true } } 
          } 
        },
        checklistVersion: {
          include: {
            checklist: { select: { id: true, title: true } }
          }
        },
        answers: true
      },
      orderBy: { date: 'desc' }
    });

    const formattedAudits = audits.map(audit => ({
      ...audit,
      location: audit.location ? audit.location : { id: 'deleted', name: audit.locationName || 'Удаленная точка', tus: [] },
      
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
    
    const queryData = auditDeleteSchema.parse({
      id: searchParams.get('id'),
      clearAll: searchParams.get('clearAll')
    });
    
    if (queryData.clearAll === 'true') {
      await prisma.audit.deleteMany({});
    } else if (queryData.id) {
      await prisma.audit.delete({ where: { id: queryData.id } });
    } else {
      return NextResponse.json({ error: 'Нет ID для удаления' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные параметры запроса', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка DELETE /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}