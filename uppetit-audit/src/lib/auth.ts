import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { randomUUID, createHmac } from 'node:crypto';
import prisma from './prisma';
import { verifyPassword } from './security';
import { clientAddress, consumeRateLimit } from './rateLimit';
import { consumeSecondFactor } from './mfa';
import { sessionIsValid, sessionPolicy, SESSION_MAX_SECONDS, MAX_PASSWORD_LENGTH } from './sessionPolicy';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [CredentialsProvider({
    credentials: { login: {}, password: {}, code: {} },
    async authorize(credentials, request) {
      const login = typeof credentials.login === 'string' ? credentials.login.trim() : '';
      const password = typeof credentials.password === 'string' ? credentials.password : '';
      const code = typeof credentials.code === 'string' ? credentials.code.trim() : '';
      if (!login || login.length > 200 || !password || password.length > MAX_PASSWORD_LENGTH || code.length > 32) return null;
      const ipAllowed = await consumeRateLimit('login-ip', clientAddress(request), 100);
      const accountAllowed = await consumeRateLimit('login-account', login, 10);
      if (!ipAllowed || !accountAllowed) return null;
      const users = await prisma.user.findMany({ where: { OR: [{ login }, { phone: login }] }, take: 2 });
      const user = users.length === 1 ? users[0] : null;
      if (!user?.isActive || !user.passwordHash) {
        await verifyPassword(password, '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
        return null;
      }
      if (!await verifyPassword(password, user.passwordHash)) return null;
      if (user.totpEnabled && !await consumeSecondFactor(user, code)) return null;
      const id = randomUUID();
      const now = new Date();
      await prisma.authSession.create({ data: {
        id, userId: user.id, authVersion: user.authVersion,
        createdAt: now, lastActivityAt: now,
        expiresAt: new Date(now.getTime() + sessionPolicy(user.role).absoluteMs),
        mfaVerified: user.totpEnabled,
      } });
      return { id: user.id, name: user.name || user.login, role: user.role,
        sessionId: id, mfaVerified: user.totpEnabled };
    },
  })],
  callbacks: {
    async jwt({ token, user }) { 
      if (user) { token.id = user.id!; token.sessionId = user.sessionId; }
      if (!token.sessionId || !token.id) return null;
      const record = await prisma.authSession.findUnique({ where: { id: token.sessionId }, include: { user: true } });
      if (!record || record.userId !== token.id || !sessionIsValid(record, record.user)) return null;
      token.role = record.user.role;
      token.name = record.user.name || record.user.login;
      token.mfaVerified = record.mfaVerified;
      token.mfaRequired = record.user.role === 'ADMIN' && (!record.user.totpEnabled || !record.mfaVerified);
      token.absoluteExpiresAt = record.expiresAt.getTime();
      token.authVersion = record.user.authVersion;
      return token;
    },
    async session({ session, token }) { 
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.mfaRequired = token.mfaRequired;
      session.user.mfaVerified = token.mfaVerified;
      session.sessionId = token.sessionId;
      session.draftKey = createHmac('sha256', process.env.AUTH_SECRET!)
        .update(`uppetit:drafts:v1:${token.id}:${token.authVersion}`).digest('hex');
      session.expires = new Date(token.absoluteExpiresAt).toISOString() as typeof session.expires;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.sessionId) {
        await prisma.authSession.deleteMany({ where: { id: message.token.sessionId } });
      }
    },
  },
  session: { strategy: 'jwt', maxAge: SESSION_MAX_SECONDS },
  jwt: { maxAge: SESSION_MAX_SECONDS },
  pages: { signIn: '/' },
  secret: process.env.AUTH_SECRET,
  debug: false,
});
