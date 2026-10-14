export const SESSION_MAX_SECONDS = 2 * 24 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

export function sessionPolicy(role: string) {
  return { idleMs: (role === 'TU' ? 2 : 1) * 24 * 60 * 60_000 };
}

export function sessionExpiresAt(session: { expiresAt: Date; lastActivityAt: Date }, role: string) {
  return Math.min(session.expiresAt.getTime(), session.lastActivityAt.getTime() + sessionPolicy(role).idleMs);
}

export function sessionIsValid(
  session: { expiresAt: Date; createdAt: Date; lastActivityAt: Date; authVersion: number },
  user: { role: string; authVersion: number; isActive: boolean; passwordHash: string | null },
  now = Date.now(),
) {
  return user.isActive && !!user.passwordHash && session.authVersion === user.authVersion
    && now < sessionExpiresAt(session, user.role);
}
