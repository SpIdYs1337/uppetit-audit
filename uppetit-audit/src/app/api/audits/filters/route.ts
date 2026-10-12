import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { historyScope } from '@/lib/auditHistory';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const scope = new URL(req.url).searchParams.get('scope');
  if (scope && scope !== 'mine' && scope !== 'accessible') return NextResponse.json({ error: 'Некорректный фильтр' }, { status: 400 });
  try {
    // Options cover the whole accessible history. Answers and photos are not loaded.
    const audits = await prisma.audit.findMany({
      where: historyScope(session!.user, scope === 'mine' ? 'mine' : 'accessible'),
      distinct: ['locationName', 'auditorName', 'tuName', 'locationId', 'userId'],
      select: {
        locationName: true, auditorName: true, tuName: true,
        location: { select: { name: true, tus: { select: { name: true, login: true } } } },
        user: { select: { name: true, login: true } },
      },
    });
    const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ru'));
    return NextResponse.json({
      locations: sorted(audits.map(a => a.locationName || a.location?.name || 'Удаленная точка')),
      auditors: sorted(audits.map(a => a.auditorName || a.user?.name || a.user?.login || 'Удаленный аудитор')),
      tus: sorted(audits.flatMap(a => a.tuName ? a.tuName.split(',').map(s => s.trim()).filter(Boolean)
        : a.location?.tus.length ? a.location.tus.map(t => t.name || t.login) : ['Не был назначен'])),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить фильтры истории' }, { status: 500 });
  }
}
