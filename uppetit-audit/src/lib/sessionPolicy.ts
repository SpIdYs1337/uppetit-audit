export const SESSION_MAX_SECONDS = 7 * 24 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

export function sessionPolicy(role: string) {
  return role === 'ADMIN'
    ? { idleMs: 30 * 60_000, absoluteMs: 12 * 60 * 60_000 }
    : { idleMs: 12 * 60 * 60_000, absoluteMs: SESSION_MAX_SECONDS * 1000 };
}

export function sessionIsValid(
  session: { expiresAt: Date; createdAt: Date; lastActivityAt: Date; authVersion: number },
  user: { role: string; authVersion: number; isActive: boolean; passwordHash: string | null },
  now = Date.now(),
) {
  const policy = sessionPolicy(user.role);
  return user.isActive && !!user.passwordHash && session.authVersion === user.authVersion
    && now < session.expiresAt.getTime()
    && now < session.createdAt.getTime() + policy.absoluteMs
    && now < session.lastActivityAt.getTime() + policy.idleMs;
}
