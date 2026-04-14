import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

// Настраиваем библиотеку web-push нашими ключами из .env
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@uppetit.ru',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET() {
  try {
    // 🧹 АВТООЧИСТКА: Вычисляем дату, которая была ровно 6 месяцев назад
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Запускаем удаление в фоновом режиме (без await)
    prisma.audit.deleteMany({
      where: {
        date: {
          lt: sixMonthsAgo
        }
      }
    }).catch(err => console.error("Ошибка фоновой автоочистки:", err));
    // ---------------------------------------------------------

    // Основная логика: отдаем свежие аудиты
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
  } catch (error) {
    console.error("Ошибка API аудитов:", error);
    return NextResponse.json({ error: 'Ошибка загрузки данных' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      userId, 
      locationId, 
      checklistId, 
      score, 
      maxScore, 
      shiftEmployees, 
      generalComment, 
      answers 
    } = body;

    // 1. Создаем сам аудит
    const newAudit = await prisma.audit.create({
      data: {
        userId,
        locationId,
        checklistId,
        score: Number(score),
        maxScore: maxScore !== undefined && maxScore !== null ? Number(maxScore) : null,
        
        shiftEmployees: shiftEmployees || [],
        generalComment: generalComment || null,

        answers: {
          create: answers.map((ans: any) => ({
            zone: ans.zone || 'Основной раздел',
            question: ans.questionText || 'Без текста',
            
            // Жесткая проверка. Если isOk равно undefined, ставим false, чтобы база не падала
            isOk: typeof ans.isOk === 'boolean' ? ans.isOk : false, 
            
            penalty: ans.penalty || 0,
            
            // 🔥 ИСПРАВЛЕНИЕ: Теперь принимаем и сохраняем МАССИВ фотографий
            photos: Array.isArray(ans.photos) ? ans.photos : [], 
            
            comment: ans.comment || null
          }))
        }
      },
      // Подтягиваем связи, чтобы знать, КОМУ отправлять Push
      include: {
        location: {
          include: { tu: true }
        },
        checklist: true,
        user: true,
      }
    });

    // 2. АВТОМАТИЧЕСКОЕ ЗАКРЫТИЕ ПЛАНА
    try {
      await prisma.visitPlan.updateMany({
        where: {
          userId: userId,           
          locationId: locationId,   
          status: 'PLANNED'         
        },
        data: {
          status: 'DONE'            
        }
      });
    } catch (planError) {
      console.error('Ошибка при автоматическом закрытии плана:', planError);
    }

    // 3. ОТПРАВКА PUSH УВЕДОМЛЕНИЙ (Запускаем в фоне, чтобы не тормозить ответ пользователю)
    sendWebPushNotifications(newAudit).catch(err => console.error("Ошибка Push:", err));

    return NextResponse.json(newAudit);
  } catch (error) {
    console.error("Ошибка сохранения аудита:", error);
    return NextResponse.json({ error: 'Ошибка при сохранении' }, { status: 500 });
  }
}

// --- ФУНКЦИЯ ОТПРАВКИ WEB PUSH УВЕДОМЛЕНИЙ ---
async function sendWebPushNotifications(audit: any) {
  console.log("Готовим Web Push уведомления...");

  const isPerfect = audit.score === audit.maxScore;
  const emoji = isPerfect ? '✅' : '⚠️';
  const locationName = audit.location?.name || 'Неизвестно';
  const scoreText = audit.maxScore ? `${audit.score}/${audit.maxScore}` : `${audit.score}`;

  // Тело уведомления
  const payload = JSON.stringify({
    title: `${emoji} Новый аудит: ${locationName}`,
    body: `Оценка: ${scoreText} б. Проверил: ${audit.user?.login || 'Аудитор'}. Комментарий: ${audit.generalComment || 'Нет'}`,
    url: '/audit/history' // При клике по пушу откроется история проверок
  });

  // 1. Ищем подписки АДМИНОВ
  const admins = await prisma.user.findMany({ 
    where: { role: 'ADMIN', pushSubscription: { not: null } } 
  });

  // 2. Ищем подписку ТУ (Территориального управляющего)
  const tuSubscription = audit.location?.tu?.pushSubscription;

  // Собираем все уникальные подписки в Set, чтобы избежать дублей
  const subscriptionsToNotify = new Set<string>();
  
  admins.forEach(admin => {
    if (admin.pushSubscription) subscriptionsToNotify.add(admin.pushSubscription);
  });
  
  if (tuSubscription) {
    subscriptionsToNotify.add(tuSubscription);
  }

  // 3. Рассылаем уведомления
  for (const subString of subscriptionsToNotify) {
    try {
      const sub = JSON.parse(subString);
      await webpush.sendNotification(sub, payload);
    } catch (e) {
      console.error('Не удалось отправить пуш (возможно подписка устарела или отозвана браузером):', e);
    }
  }
  
  console.log(`Push-уведомления успешно отправлены (${subscriptionsToNotify.size} шт.)`);
}