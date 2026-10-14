import type { PrismaClient } from '@prisma/client';
import type { Actor } from './accessControl';
import { sessionPolicy } from './sessionPolicy';

export async function renewSession(db: Pick<PrismaClient, '$executeRaw'>, session: { sessionId: string; user: Actor }, now = new Date()) {
  const duration = sessionPolicy(session.user.role).idleMs;
  // Prisma stores DateTime as a UTC timestamp without a time zone. Bind ISO
  // strings and cast directly so the database TimeZone cannot shift the clock.
  const nowUtc = now.toISOString();
  const sinceUtc = new Date(now.getTime() - duration).toISOString();
  // Update atomically: concurrent tabs cannot shorten the deadline or revive a
  // deleted, expired, blocked or revoked session between auth() and this write.
  const count = await db.$executeRaw`
    UPDATE "AuthSession" AS s
    SET "lastActivityAt" = GREATEST(s."lastActivityAt", ${nowUtc}::timestamp),
        "expiresAt" = GREATEST(s."lastActivityAt", ${nowUtc}::timestamp)
          + ${duration} * INTERVAL '1 millisecond'
    FROM "User" AS u
    WHERE s."id" = ${session.sessionId} AND s."userId" = ${session.user.id}
      AND u."id" = s."userId" AND u."role"::text = ${session.user.role}
      AND u."isActive" = TRUE AND u."passwordHash" IS NOT NULL
      AND s."authVersion" = u."authVersion"
      AND s."expiresAt" > ${nowUtc}::timestamp AND s."lastActivityAt" > ${sinceUtc}::timestamp
  `;
  return count === 1;
}
