import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const LOGIN_CHALLENGE_MS = 5 * 60_000;
const claimsSchema = z.object({ userId: z.string().min(1).max(200), authVersion: z.number().int().nonnegative(),
  mfaRequired: z.boolean(), expiresAt: z.number().int(), nonce: z.string().regex(/^[a-f0-9]{32}$/) });
type Claims = z.infer<typeof claimsSchema>;

function key() {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is required');
  return createHash('sha256').update(`uppetit:login-challenge:v1:${process.env.AUTH_SECRET}`).digest();
}

// Opaque, authenticated proof of the password check. It never contains a password or TOTP secret.
export function issueLoginChallenge(user: { id: string; authVersion: number; totpEnabled: boolean }, now = Date.now()) {
  const claims: Claims = { userId: user.id, authVersion: user.authVersion, mfaRequired: user.totpEnabled,
    expiresAt: now + LOGIN_CHALLENGE_MS, nonce: randomBytes(16).toString('hex') };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('uppetit:login-challenge:v1'));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(claims), 'utf8'), cipher.final()]);
  return { challenge: Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url'),
    mfaRequired: claims.mfaRequired, expiresAt: claims.expiresAt };
}

export function readLoginChallenge(value: unknown, now = Date.now()): Claims | null {
  if (typeof value !== 'string' || value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    decipher.setAAD(Buffer.from('uppetit:login-challenge:v1'));
    const claims = claimsSchema.parse(JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')));
    return claims.expiresAt > now && claims.expiresAt <= now + LOGIN_CHALLENGE_MS ? claims : null;
  } catch { return null; }
}
