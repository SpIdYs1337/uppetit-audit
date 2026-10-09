import prisma from './prisma';
import { decryptTotp, hashToken, matchTotpStep } from './security';
import type { User } from '@prisma/client';
import { normalizeOneTimeCode } from './oneTimeCode';

export async function consumeSecondFactor(user: User, code: string) {
  if (!user.totpEnabled || !user.totpSecret) return false;
  code = normalizeOneTimeCode(code);
  const step = matchTotpStep(decryptTotp(user.totpSecret), code);
  if (step !== null) {
    const result = await prisma.user.updateMany({ where: {
      id: user.id, authVersion: user.authVersion, isActive: true, totpEnabled: true,
      OR: [{ totpLastUsedStep: null }, { totpLastUsedStep: { lt: step } }],
    }, data: { totpLastUsedStep: step } });
    return result.count === 1;
  }
  if (!/^[a-f0-9]{20}$/.test(code)) return false;
  const recoveryHash = hashToken(code);
  const changed = await prisma.$executeRaw`
    UPDATE "User" SET "recoveryHashes" = array_remove("recoveryHashes", ${recoveryHash})
    WHERE "id" = ${user.id} AND "authVersion" = ${user.authVersion}
      AND "isActive" = true AND "totpEnabled" = true
      AND ${recoveryHash} = ANY("recoveryHashes")`;
  return changed === 1;
}
