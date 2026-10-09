import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { authVersion: { increment: 1 } } });
  await prisma.authSession.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ success: true });
}
