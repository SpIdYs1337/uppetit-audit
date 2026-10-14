import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { renewSession } from '@/lib/sessionActivity';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Сессия завершена' }, { status: 401 });
  const renewed = await renewSession(prisma, session);
  return new NextResponse(null, { status: renewed ? 204 : 401 });
}
