import type { Role } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    sessionId: string;
    draftKey: string;
    user: { id: string; role: Role; mfaRequired: boolean; mfaVerified: boolean } & DefaultSession['user'];
  }
  interface User { role: Role; sessionId: string; mfaVerified: boolean; }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    sessionId: string;
    mfaRequired: boolean;
    mfaVerified: boolean;
    absoluteExpiresAt: number;
    authVersion: number;
  }
}
