import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { consumeRateLimit } from '@/lib/rateLimit';
import { consumeSecondFactor } from '@/lib/mfa';
import { decryptTotp, encryptTotp, generateTotpSecret, generateRecoveryCodes, hashToken, matchTotpStep, verifyPassword } from '@/lib/security';

export const dynamic = 'force-dynamic';
const schema = z.object({ action: z.enum(['start', 'confirm']), password: z.string().max(128), code: z.string().max(32).default('') });

export async function POST(request: Request) {
  const { error, session } = await requireAuth([Role.ADMIN], { allowMfaEnrollment: true });
  if (error || !session) return error;
  if (!await consumeRateLimit('mfa-enrollment', session.user.id, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Повторите через 15 минут.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive || !user.passwordHash || !await verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 403 });
  }
  if (parsed.data.action === 'start') {
    if (user.totpEnabled && !await consumeSecondFactor(user, parsed.data.code)) {
      return NextResponse.json({ error: 'Введите новый код текущего аутентификатора или резервный код' }, { status: 403 });
    }
    const secret = generateTotpSecret();
    await prisma.authSession.update({ where: { id: session.sessionId }, data: {
      pendingTotp: encryptTotp(secret), pendingTotpUntil: new Date(Date.now() + 15 * 60_000),
    } });
    return NextResponse.json({ secret, issuer: 'UPPETIT Audit', account: user.login });
  }
  const record = await prisma.authSession.findUnique({ where: { id: session.sessionId } });
  if (!record?.pendingTotp || !record.pendingTotpUntil || record.pendingTotpUntil.getTime() <= Date.now() || record.authVersion !== user.authVersion) {
    return NextResponse.json({ error: 'Настройка устарела. Начните заново.' }, { status: 400 });
  }
  const step = matchTotpStep(decryptTotp(record.pendingTotp), parsed.data.code);
  if (step === null) return NextResponse.json({
    error: 'Неверный код аутентификатора. Проверьте автоматическую дату и время на телефоне и компьютере. Дождитесь нового кода. Если начинали настройку заново, отсканируйте последний QR-код.',
    serverTime: new Date().toISOString(),
  }, { status: 400 });
  const codes = generateRecoveryCodes();
  // Claim this enrollment once, update credentials, and revoke other sessions
  // in one transaction; concurrent confirmations cannot overwrite backup codes.
  const enabled = await prisma.$transaction(async tx => {
    const claimed = await tx.authSession.updateMany({ where: {
      id: record.id, pendingTotp: record.pendingTotp, pendingTotpUntil: { gt: new Date() },
    }, data: { pendingTotp: null, pendingTotpUntil: null } });
    if (claimed.count !== 1) return false;
    const changed = await tx.user.updateMany({ where: { id: user.id, authVersion: user.authVersion, isActive: true }, data: {
      totpEnabled: true, totpSecret: record.pendingTotp, totpLastUsedStep: step,
      recoveryHashes: codes.map(hashToken), authVersion: { increment: 1 },
    } });
    if (changed.count !== 1) throw new Error('Account changed during enrollment');
    await tx.authSession.deleteMany({ where: { userId: user.id, id: { not: record.id } } });
    await tx.authSession.update({ where: { id: record.id }, data: { authVersion: user.authVersion + 1, mfaVerified: true } });
    return true;
  });
  if (!enabled) return NextResponse.json({ error: 'Настройка уже завершена. Войдите заново.' }, { status: 409 });
  return NextResponse.json({ recoveryCodes: codes });
}
