import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Проверяем авторизацию через ваш хелпер
  const authResult = await requireAuth();
  
  // Если requireAuth вернул ошибку ответа (NextResponse), отдаем её
  if (authResult.error) return authResult.error;
  
  // Вытаскиваем сессию и проверяем строго роль ADMIN
  const session = authResult.session;
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещен. Только для администраторов.' }, { status: 403 });
  }

  try {
    const { id: auditId } = await context.params;
    const { answerId, isOk } = await req.json();

    if (!answerId || typeof isOk !== 'boolean') {
      return NextResponse.json({ error: 'Неверные параметры запроса' }, { status: 400 });
    }

    // 2. Ищем текущий ответ в базе данных
    const currentAnswer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        audit: {
          include: {
            checklistVersion: {
              include: { items: true }
            }
          }
        }
      }
    });

    if (!currentAnswer || currentAnswer.auditId !== auditId) {
      return NextResponse.json({ error: 'Ответ не найден в данном аудите' }, { status: 404 });
    }

    // ИСПРАВЛЕНО: В schema.prisma поле вопроса в ChecklistItem называется text, а не question
    const checklistItem = currentAnswer.audit.checklistVersion?.items.find(
      (item) => item.text === currentAnswer.question
    );
    
    // Определяем штрафной балл за этот пункт
    const penaltyValue = checklistItem ? checklistItem.score : (currentAnswer.penalty || 0);

    // 3. Обновляем статус ответа в базе
    await prisma.answer.update({
      where: { id: answerId },
      data: {
        isOk: isOk,
        penalty: isOk ? 0 : penaltyValue // Если "Да" (isOk: true) -> штраф обнуляется
      }
    });

    // 4. Пересчитываем суммарный балл всего аудита
    const allAnswers = await prisma.answer.findMany({
      where: { auditId: auditId }
    });

    // Вычисляем максимальный балл на основе пунктов этой версии чек-листы
    const maxScore = currentAnswer.audit.checklistVersion?.items.reduce((sum, item) => sum + item.score, 0) || 0;

    // Считаем сумму штрафов по неотмеченным пунктам
    const totalPenalty = allAnswers.reduce((sum, ans) => sum + (ans.isOk ? 0 : ans.penalty), 0);

    // Новый балл = Максимум минус штрафы (но не уходим в минус)
    const newScore = Math.max(0, maxScore - totalPenalty);

    // Обновляем итоговый счет в аудите
    const updatedAudit = await prisma.audit.update({
      where: { id: auditId },
      data: { score: newScore },
      include: { answers: { orderBy: { id: 'asc' } } }
    });

    return NextResponse.json({ 
      success: true, 
      newScore: updatedAudit.score,
      answers: updatedAudit.answers 
    });

  } catch (err) {
    console.error('Ошибка при редактировании баллов аудита:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}