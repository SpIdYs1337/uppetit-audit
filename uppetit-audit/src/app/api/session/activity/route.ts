import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sessionPolicy } from '@/lib/sessionPolicy';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Сессия завершена' }, { status: 401 });
  const now = new Date();
  const changed = await prisma.authSession.updateMany({ where: {
    id: session.sessionId, userId: session.user.id, expiresAt: { gt: now },
    lastActivityAt: { gt: new Date(now.getTime() - sessionPolicy(session.user.role).idleMs) },
  }, data: { lastActivityAt: now } });
  return new NextResponse(null, { status: changed.count === 1 ? 204 : 401 });
}
