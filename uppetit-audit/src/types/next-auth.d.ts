import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Расширяем стандартные типы сессии и пользователя
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    role: Role;
  }
}

// Расширяем тип JWT-токена
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}