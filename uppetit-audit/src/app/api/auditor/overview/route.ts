import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { parseReportRange } from '@/lib/reportDates';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error || !session) return error;
  const params = new URL(request.url).searchParams;
  let date: ReturnType<typeof parseReportRange>;
  let today: Date;
  try {
    date = parseReportRange(params.get('from'), params.get('to'));
    today = params.get('today') ? parseReportRange(params.get('today'), null).gte! : new Date(new Date().toISOString().slice(0, 10));
  } catch { return NextResponse.json({ error: 'Проверьте выбранный период.' }, { status: 400 }); }
  try {
    // Personal work metrics always belong to the signed-in user, including ADMIN and TU.
    const userId = session.user.id;
    const where: Prisma.AuditWhereInput = { userId, ...(Object.keys(date).length ? { date } : {}) };
    const result = await prisma.$transaction(async tx => {
      const [total, periodCount, remarks, average, recent, plans] = await Promise.all([
        tx.audit.count({ where: { userId } }), tx.audit.count({ where }),
        tx.audit.count({ where: { ...where, answers: { some: { isOk: false } } } }),
        tx.$queryRaw<{ avgPct: number | null; measured: number }[]>(Prisma.sql`
          SELECT AVG(CASE WHEN "maxScore" > 0 THEN "score" * 100.0 / "maxScore" END)::float8 AS "avgPct",
                 COUNT(CASE WHEN "maxScore" > 0 THEN 1 END)::int AS "measured"
          FROM "Audit" WHERE "userId" = ${userId}
          ${date.gte ? Prisma.sql`AND "date" >= ${date.gte}` : Prisma.empty}
          ${date.lte ? Prisma.sql`AND "date" <= ${date.lte}` : Prisma.empty}`),
        tx.audit.findMany({ where, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 5,
          select: { id: true, date: true, score: true, maxScore: true, locationName: true,
            location: { select: { name: true } }, checklistVersion: { select: { checklist: { select: { title: true } } } },
            _count: { select: { answers: { where: { isOk: false } } } } } }),
        tx.visitPlan.findMany({ where: { userId, status: 'PLANNED', date: { gte: today } }, orderBy: [{ date: 'asc' }, { id: 'asc' }], take: 5,
          select: { id: true, date: true, locationId: true, location: { select: { name: true, address: true } } } }),
      ]);
      return { total, periodCount, remarks, avgPct: average[0]?.avgPct ?? null, measured: average[0]?.measured ?? 0, recent, plans };
    }, { isolationLevel: 'RepeatableRead' });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Не удалось загрузить рабочую сводку.' }, { status: 500 }); }
}
