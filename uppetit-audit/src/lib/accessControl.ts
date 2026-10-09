import { Role, type Prisma } from '@prisma/client';

export const publicUserSelect = { id: true, name: true, login: true, role: true } satisfies Prisma.UserSelect;
export type Actor = { id: string; role: Role };

export function managedLocationWhere(userId: string): Prisma.LocationWhereInput {
  return { OR: [{ tuId: userId }, { tus: { some: { id: userId } } }] };
}

export function auditAccessWhere(user: Actor): Prisma.AuditWhereInput {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.TU) return { OR: [{ userId: user.id }, { location: managedLocationWhere(user.id) }] };
  return { userId: user.id };
}

export function locationAccessWhere(user: Actor): Prisma.LocationWhereInput {
  return user.role === Role.TU ? managedLocationWhere(user.id) : {};
}

export function planWriteWhere(user: Actor): Prisma.VisitPlanWhereInput {
  return user.role === Role.ADMIN ? {} : { userId: user.id };
}

type Question = { id: string; text: string; zone: string | null; score: number; photoRequirement: string };
type InputAnswer = { itemId?: string; questionText?: string; zone?: string; isOk: boolean; photos: string[]; comment?: string };

export function calculateAudit(items: Question[], answers: InputAnswer[]) {
  if (!items.length || answers.length !== items.length) throw new Error('Ответьте на все вопросы чек-листа');
  const seen = new Set<string>();
  const normalized = answers.map(answer => {
    const matching = answer.itemId ? items.filter(item => item.id === answer.itemId)
      : items.filter(item => item.text === answer.questionText && (!answer.zone || item.zone === answer.zone));
    if (matching.length !== 1 || seen.has(matching[0].id)) throw new Error('Вопрос не найден или ответ повторяется. Обновите чек-лист.');
    const item = matching[0];
    seen.add(item.id);
    if (item.score < 0 || !Number.isInteger(item.score)) throw new Error('Некорректные баллы в чек-листе');
    if ((item.photoRequirement === 'REQUIRED' || (item.photoRequirement === 'VIOLATION' && !answer.isOk)) && !answer.photos.length) {
      throw new Error('Добавьте обязательную фотографию');
    }
    return { itemId: item.id, question: item.text, zone: item.zone || 'Основной раздел',
      isOk: answer.isOk, penalty: answer.isOk ? 0 : item.score, photos: answer.photos, comment: answer.comment };
  });
  const maxScore = items.reduce((sum, item) => sum + item.score, 0);
  return { answers: normalized, maxScore, score: Math.max(0, maxScore - normalized.reduce((sum, answer) => sum + answer.penalty, 0)) };
}
