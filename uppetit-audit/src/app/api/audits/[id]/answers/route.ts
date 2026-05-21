import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const auditPatchSchema = z.object({
  answerId: z.string().min(1, 'ID ответа обязателен'),
  // ИСПРАВЛЕНО: Заменили required_error на универсальный message, который просит компилятор
  isOk: z.boolean({ message: 'Статус ответа обязателен (true/false)' }),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ИСПРАВЛЕНО: Стандартизированный щит безопасности. Пропускает ТОЛЬКО Администраторов.
  const { error: authError } = await requireAuth([Role.ADMIN]);
  if (authError) return authError;

  try {
    const params = await context.params;
    const auditId = params.id;

    if (!auditId) {
      return NextResponse.json({ error: 'ID аудита не указан в URL' }, { status: 400 });
    }

    const body = await req.json();
    
    // ИСПРАВЛЕНО: Строгая валидация входящих данных через Zod
    const parsedData = auditPatchSchema.parse(body);

    // 2. Ищем текущий ответ в базе данных
    const currentAnswer = await prisma.answer.findUnique({
      where: { id: parsedData.answerId },
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

    const checklistItem = currentAnswer.audit.checklistVersion?.items.find(
      (item) => item.text === currentAnswer.question
    );
    
    // Определяем штрафной балл за этот пункт
    const penaltyValue = checklistItem ? checklistItem.score : (currentAnswer.penalty || 0);

    // 3. Обновляем статус ответа в базе
    await prisma.answer.update({
      where: { id: parsedData.answerId },
      data: {
        isOk: parsedData.isOk,
        penalty: parsedData.isOk ? 0 : penaltyValue // Если "Да" (isOk: true) -> штраф обнуляется
      }
    });

    // 4. Пересчитываем суммарный балл всего аудита
    const allAnswers = await prisma.answer.findMany({
      where: { auditId: auditId }
    });

    // Вычисляем максимальный балл на основе пунктов этой версии чек-листа
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
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные параметры запроса', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка при редактировании баллов аудита:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}