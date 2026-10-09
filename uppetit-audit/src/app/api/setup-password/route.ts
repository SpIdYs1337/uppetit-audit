import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hashPassword, hashToken } from '@/lib/security';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@/lib/sessionPolicy';
import { clientAddress, consumeRateLimit } from '@/lib/rateLimit';

const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: z.string().min(MIN_PASSWORD_LENGTH, 'Пароль должен содержать не менее 15 символов').max(MAX_PASSWORD_LENGTH),
});
export async function POST(request: Request) {
  if (!await consumeRateLimit('setup-password-ip', clientAddress(request), 50)) {
    return NextResponse.json({ error: 'Слишком много попыток. Повторите через 15 минут.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте пароль и ссылку: минимум 15, максимум 128 символов' }, { status: 400 });
  const inviteTokenHash = hashToken(parsed.data.token);
  if (!await consumeRateLimit('setup-password-token', inviteTokenHash, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток' }, { status: 429 });
  }
  const user = await prisma.user.findFirst({ where: { inviteTokenHash, inviteExpiresAt: { gt: new Date() }, isActive: true } });
  if (!user) return NextResponse.json({ error: 'Неверная или просроченная ссылка' }, { status: 400 });
  const passwordHash = await hashPassword(parsed.data.password);
  const changed = await prisma.$transaction(async tx => {
    const result = await tx.user.updateMany({ where: {
      id: user.id, inviteTokenHash, inviteExpiresAt: { gt: new Date() }, isActive: true,
    }, data: { passwordHash, inviteTokenHash: null, inviteExpiresAt: null, invitePurpose: null, authVersion: { increment: 1 } } });
    if (result.count === 1) await tx.authSession.deleteMany({ where: { userId: user.id } });
    return result.count;
  });
  return changed === 1 ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Неверная или просроченная ссылка' }, { status: 400 });
}
