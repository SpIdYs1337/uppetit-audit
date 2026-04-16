import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth'; // <-- Наш единый хелпер безопасности

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@uppetit.ru',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const auditPostSchema = z.object({
  userId: z.string(),
  locationId: z.string(),
  checklistId: z.string(),
  score: z.number(),
  maxScore: z.number().nullable().optional(),
  shiftEmployees: z.array(z.string()).optional().default([]),
  generalComment: z.string().nullable().optional(),
  answers: z.array(z.object({
    zone: z.string().optional(),
    questionText: z.string().optional(),
    isOk: z.boolean().optional(),
    penalty: z.number().optional(),
    photos: z.array(z.string()).optional(),
    comment: z.string().nullable().optional()
  }))
});

export async function GET() {
  // 1. Доступно всем авторизованным
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    prisma.audit.deleteMany({
      where: { date: { lt: sixMonthsAgo } }
    }).catch(err => console.error("Ошибка фоновой автоочистки:", err));

    const audits = await prisma.audit.findMany({
      orderBy: { date: 'desc' },
      include: {
        user: true,
        location: true,
        checklist: true,
        answers: true 
      }
    });
    
    return NextResponse.json(audits);
  } catch (err) {
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // 1. Проверяем авторизацию и получаем сессию
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const parsedData = auditPostSchema.parse(body);

    const currentUser = session?.user as any;

    // 2. СПЕЦИАЛЬНАЯ ЗАЩИТА: Блокируем подделку автора аудита
    // Аудитор может отправлять только СВОИ проверки. Админ может отправлять за других.
    if (currentUser?.id !== parsedData.userId && currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Попытка подделки автора аудита запрещена!' }, { status: 403 });
    }

    const newAudit = await prisma.audit.create({
      data: {
        userId: parsedData.userId,
        locationId: parsedData.locationId,
        checklistId: parsedData.checklistId,
        score: parsedData.score,
        maxScore: parsedData.maxScore || null,
        shiftEmployees: parsedData.shiftEmployees,
        generalComment: parsedData.generalComment || null,
        answers: {
          create: parsedData.answers.map(ans => ({
            zone: ans.zone || 'Основной раздел',
            question: ans.questionText || 'Без текста',
            isOk: typeof ans.isOk === 'boolean' ? ans.isOk : false, 
            penalty: ans.penalty || 0,
            photos: Array.isArray(ans.photos) ? ans.photos : [], 
            comment: ans.comment || null
          }))
        }
      },
      include: {
        location: { include: { tu: true } },
        checklist: true,
        user: true,
      }
    });

    try {
      await prisma.visitPlan.updateMany({
        where: {
          userId: parsedData.userId,          
          locationId: parsedData.locationId,  
          status: 'PLANNED'         
        },
        data: { status: 'DONE' }
      });
    } catch (planError) {
      console.error('Ошибка при автоматическом закрытии плана:', planError);
    }

    sendWebPushNotifications(newAudit).catch(err => console.error("Ошибка Push:", err));

    return NextResponse.json(newAudit);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные аудита', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка при сохранении' }, { status: 500 });
  }
}

async function sendWebPushNotifications(audit: any) {
  console.log("Готовим Web Push уведомления...");

  const isPerfect = audit.score === audit.maxScore;
  const emoji = isPerfect ? '✅' : '⚠️';
  const locationName = audit.location?.name || 'Неизвестно';
  const scoreText = audit.maxScore ? `${audit.score}/${audit.maxScore}` : `${audit.score}`;

  const payload = JSON.stringify({
    title: `${emoji} Новый аудит: ${locationName}`,
    body: `Оценка: ${scoreText} б. Проверил: ${audit.user?.login || 'Аудитор'}. Комментарий: ${audit.generalComment || 'Нет'}`,
    url: '/audit/history' 
  });

  const admins = await prisma.user.findMany({ 
    where: { role: 'ADMIN', pushSubscription: { not: null } } 
  });

  const tuSubscription = audit.location?.tu?.pushSubscription;

  const subscriptionsToNotify = new Set<string>();
  
  admins.forEach(admin => {
    if (admin.pushSubscription) subscriptionsToNotify.add(admin.pushSubscription);
  });
  
  if (tuSubscription) subscriptionsToNotify.add(tuSubscription);

  for (const subString of subscriptionsToNotify) {
    try {
      const sub = JSON.parse(subString);
      await webpush.sendNotification(sub, payload);
    } catch (e) {
      console.error('Не удалось отправить пуш:', e);
    }
  }
}

export async function DELETE(request: Request) {
  // 1. ОДНА СТРОЧКА ЗАЩИТЫ: Только АДМИН может удалять аудиты или очищать базу
  const { error } = await requireAuth(['ADMIN']);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      await prisma.audit.deleteMany({});
      return NextResponse.json({ success: true, message: 'История полностью очищена' });
    }

    if (id) {
      await prisma.audit.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Аудит успешно удален' });
    }

    return NextResponse.json({ error: 'Не указан ID для удаления' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при удалении' }, { status: 500 });
  }
}