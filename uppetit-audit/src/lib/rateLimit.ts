import prisma from './prisma';
import { hashToken } from './security';

// Shared across PM2 workers. Only hashed IP/identifier keys are persisted.
export async function consumeRateLimit(scope: string, identifier: string, max: number, windowSeconds = 900) {
  const key = hashToken(`${scope}:${identifier}`);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        THEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + ${windowSeconds} * INTERVAL '1 second' ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "count"`;
  return rows[0].count <= max;
}

export function clientAddress(request: Request) {
  // A proxy must overwrite this header. With no trusted header configured, all
  // requests share a conservative bucket rather than trusting spoofable XFF.
  const header = process.env.AUTH_TRUSTED_IP_HEADER;
  return header ? (request.headers.get(header)?.trim() || 'unknown') : 'unknown';
}
