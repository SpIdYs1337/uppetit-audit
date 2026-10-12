import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { clientAddress, consumeRateLimit } from '@/lib/rateLimit';
import { verifyPassword } from '@/lib/security';
import { MAX_PASSWORD_LENGTH } from '@/lib/sessionPolicy';
import { issueLoginChallenge } from '@/lib/loginChallenge';

export const dynamic = 'force-dynamic';
const input = z.object({ login: z.string().trim().min(1).max(200), password: z.string().min(1).max(MAX_PASSWORD_LENGTH) });
const rejected = () => NextResponse.json({ error: 'Проверьте логин и пароль.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const expected = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url).origin;
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  }
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return rejected();
    const { login, password } = parsed.data;
    const ipAllowed = await consumeRateLimit('login-ip', clientAddress(request), 100);
    const accountAllowed = await consumeRateLimit('login-account', login, 10);
    if (!ipAllowed || !accountAllowed) return NextResponse.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' } });
    const users = await prisma.user.findMany({ where: { OR: [{ login }, { phone: login }] }, take: 2 });
    const user = users.length === 1 ? users[0] : null;
    const valid = await verifyPassword(password, user?.passwordHash || '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
    if (!user?.isActive || !user.passwordHash || !valid) return rejected();
    return NextResponse.json(issueLoginChallenge(user), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Не удалось выполнить вход. Попробуйте позже.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
