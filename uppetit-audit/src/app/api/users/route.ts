import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';
import { issueInvite } from '@/lib/security';

export const dynamic = 'force-dynamic';
const fields = {
  name: z.string().max(200).nullable().optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  login: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(32).nullable().optional(),
  role: z.nativeEnum(Role),
};
const postSchema = z.object({ ...fields, role: fields.role.default(Role.AUDITOR) });
const putSchema = z.object({ ...fields, id: z.string().min(1), login: fields.login.optional(),
  role: fields.role.optional(), resetPassword: z.boolean().optional(),
  reissueInvite: z.boolean().optional(), revokeSessions: z.boolean().optional(), isActive: z.boolean().optional() });
const select = { id: true, name: true, email: true, login: true, phone: true, role: true,
  isActive: true, passwordHash: true, inviteExpiresAt: true, totpEnabled: true,
  locations: { select: { id: true, name: true } }, managedLocations: { select: { id: true, name: true } } };
function safeUser(user: { passwordHash: string | null; [key: string]: unknown }) {
  const { passwordHash, ...safe } = user;
  return { ...safe, hasPassword: !!passwordHash };
}
async function aliasTaken(login?: string, phone?: string | null, excludeId?: string) {
  const aliases = [login, phone].filter((value): value is string => !!value);
  if (!aliases.length) return false;
  return !!await prisma.user.findFirst({ where: {
    ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: [{ login: { in: aliases } }, { phone: { in: aliases } }],
  }, select: { id: true } });
}
export async function GET() {
  const { error, session } = await requireAuth();
  if (error || !session) return error;
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json(await prisma.user.findMany({ where: { role: Role.TU, isActive: true },
      select: { id: true, name: true, login: true, role: true }, orderBy: { login: 'asc' } }));
  }
  return NextResponse.json((await prisma.user.findMany({ select, orderBy: { login: 'asc' } })).map(safeUser));
}
export async function POST(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;
  try {
    const data = postSchema.parse(await request.json());
    if (await aliasTaken(data.login, data.phone)) return NextResponse.json({ error: 'Логин или телефон уже используются' }, { status: 409 });
    const { token, ...invitation } = issueInvite('INVITE');
    const user = await prisma.user.create({ data: { ...data, email: data.email || null, phone: data.phone || null, ...invitation }, select });
    return NextResponse.json({ ...safeUser(user), inviteToken: token });
  } catch (error) { return userError(error); }
}
export async function PUT(request: Request) {
  const { error, session } = await requireAuth([Role.ADMIN]);
  if (error || !session) return error;
  try {
    const data = putSchema.parse(await request.json());
    if (data.id === session.user.id && ((data.role && data.role !== Role.ADMIN) || data.isActive === false)) {
      return NextResponse.json({ error: 'Нельзя заблокировать себя или изменить свою роль' }, { status: 403 });
    }
    const current = await prisma.user.findUnique({ where: { id: data.id } });
    if (!current) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    if (data.reissueInvite && current.passwordHash) return NextResponse.json({ error: 'Для сотрудника используйте сброс пароля' }, { status: 400 });
    if (data.resetPassword || data.reissueInvite) {
      const purpose = data.resetPassword || current.invitePurpose === 'RESET' ? 'RESET' : 'INVITE';
      const { token, ...invitation } = issueInvite(purpose);
      await prisma.$transaction(async tx => {
        if (current.role === Role.ADMIN && current.isActive && current.passwordHash
          && await tx.user.count({ where: { role: Role.ADMIN, isActive: true, passwordHash: { not: null } } }) <= 1) {
          throw new Error('LAST_ADMIN');
        }
        await tx.user.update({ where: { id: data.id }, data: { ...invitation, passwordHash: null, authVersion: { increment: 1 } } });
        await tx.authSession.deleteMany({ where: { userId: data.id } });
      }, { isolationLevel: 'Serializable' });
      return NextResponse.json({ token, expiresAt: invitation.inviteExpiresAt });
    }
    if (await aliasTaken(data.login, data.phone, data.id)) return NextResponse.json({ error: 'Логин или телефон уже используются' }, { status: 409 });
    const revoke = data.revokeSessions || (data.role !== undefined && data.role !== current.role)
      || (data.isActive !== undefined && data.isActive !== current.isActive)
      || (data.login !== undefined && data.login !== current.login)
      || (data.phone !== undefined && data.phone !== current.phone);
    const user = await prisma.$transaction(async tx => {
      const updated = await tx.user.update({ where: { id: data.id }, data: {
        ...(data.name !== undefined ? { name: data.name || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.login !== undefined ? { login: data.login } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(revoke ? { authVersion: { increment: 1 } } : {}),
      }, select });
      if (revoke) await tx.authSession.deleteMany({ where: { userId: data.id } });
      return updated;
    });
    return NextResponse.json(safeUser(user));
  } catch (error) { return userError(error); }
}
export async function DELETE(request: Request) {
  const { error, session } = await requireAuth([Role.ADMIN]);
  if (error || !session) return error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
  if (id === session.user.id) return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 403 });
  try { await prisma.user.delete({ where: { id } }); return NextResponse.json({ success: true }); }
  catch (error) { return userError(error); }
}
function userError(error: unknown) {
  if (error instanceof Error && error.message === 'LAST_ADMIN') return NextResponse.json({ error: 'Нельзя сбросить пароль последнего активного администратора. Сначала подготовьте вторую учётную запись администратора.' }, { status: 409 });
  if ((error as { code?: string }).code === 'P2034') return NextResponse.json({ error: 'Данные изменились одновременно. Обновите список и повторите действие.' }, { status: 409 });
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
  if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'Логин, телефон или email уже заняты' }, { status: 409 });
  console.error('Ошибка управления пользователем');
  return NextResponse.json({ error: 'Ошибка управления пользователем' }, { status: 500 });
}
