import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization') || '';
  const value = `Bearer ${expected}`;
  const actualBytes = Buffer.from(supplied), expectedBytes = Buffer.from(value);
  if (!expected || actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 });
  }
  const now = new Date();
  const [sessions, limits] = await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  return NextResponse.json({ sessions: sessions.count, limits: limits.count });
}
