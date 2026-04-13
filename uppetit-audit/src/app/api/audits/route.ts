import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        
        // --- НОВЫЕ ПОЛЯ ---
        shiftEmployees: shiftEmployees || [],
        generalComment: generalComment || null,
        // ------------------

        answers: {
          create: answers.map((ans: any) => ({
            zone: ans.zone || 'Основной раздел',
            question: ans.questionText || 'Без текста',
            
            // 🔥 ИСПРАВЛЕНИЕ ОШИБКИ: Жесткая проверка. 
            // Если isOk равно undefined, ставим false, чтобы база не падала
            isOk: typeof ans.isOk === 'boolean' ? ans.isOk : false, 
            
            penalty: ans.penalty || 0,
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

    return NextResponse.json(newAudit);
  } catch (error) {
    console.error("Ошибка сохранения аудита:", error);
    return NextResponse.json({ error: 'Ошибка при сохранении' }, { status: 500 });
  }
}