ALTER TABLE "User" DROP COLUMN "inviteToken";
ALTER TABLE "User"
  ADD COLUMN "inviteTokenHash" TEXT,
  ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
  ADD COLUMN "invitePurpose" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "totpSecret" TEXT,
  ADD COLUMN "totpLastUsedStep" BIGINT,
  ADD COLUMN "recoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX "User_inviteTokenHash_key" ON "User"("inviteTokenHash");

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mfaVerified" BOOLEAN NOT NULL DEFAULT false,
  "pendingTotp" TEXT,
  "pendingTotpUntil" TIMESTAMP(3),
  CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
