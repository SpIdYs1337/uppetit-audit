import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 🧹 АВТООЧИСТКА: Вычисляем дату, которая была ровно 6 месяцев назад
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Запускаем удаление в фоновом режиме (без await), 
    // чтобы не заставлять пользователя ждать, пока база чистится
    prisma.audit.deleteMany({
      where: {
        date: {
          lt: sixMonthsAgo // lt означает "less than" (меньше чем / старше чем)
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
    // ДОБАВЛЕНО: Извлекаем maxScore из тела запроса
    const { userId, locationId, checklistId, score, maxScore, answers } = body;

    // 1. Создаем сам аудит
    const newAudit = await prisma.audit.create({
      data: {
        userId,
        locationId,
        checklistId,
        score: Number(score),
        maxScore: maxScore !== undefined && maxScore !== null ? Number(maxScore) : null, // ДОБАВЛЕНО
        answers: {
          create: answers.map((ans: any) => ({
            zone: ans.zone || 'Основной раздел',
            question: ans.questionText,
            isOk: ans.isOk,
            penalty: ans.penalty,
            photoBase64: ans.photoBase64 || null,
            comment: ans.comment || null
          }))
        }
      },
    });

    // 2. АВТОМАТИЧЕСКОЕ ЗАКРЫТИЕ ПЛАНА
    try {
      await prisma.visitPlan.updateMany({
        where: {
          userId: userId,           // ID аудитора, который провел проверку
          locationId: locationId,   // ID точки
          status: 'PLANNED'         // Ищем только активные планы
        },
        data: {
          status: 'DONE'            // Меняем статус на "выполнено"
        }
      });
    } catch (planError) {
      console.error('Ошибка при автоматическом закрытии плана:', planError);
      // Не прерываем ответ сервера, если план не обновился
    }

    return NextResponse.json(newAudit);
  } catch (error) {
    console.error("Ошибка сохранения аудита:", error);
    return NextResponse.json({ error: 'Ошибка при сохранении' }, { status: 500 });
  }
}