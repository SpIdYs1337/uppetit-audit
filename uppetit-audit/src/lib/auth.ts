import NextAuth, { type DefaultSession } from "next-auth"; // ИСПРАВЛЕНО: Добавлен импорт DefaultSession
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare, hash } from 'bcryptjs';
import { Role } from "@prisma/client";

// ИСПРАВЛЕНО: Корректное расширение типов без конфликтов с внутренностями NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        const login = (credentials?.login as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string;

        if (!login || !password) return null;

        try {
          // ИЩЕМ И ПО ЛОГИНУ, И ПО ТЕЛЕФОНУ
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { login: login },
                { phone: login }
              ]
            }
          });

          // СПАСАТЕЛЬНЫЙ КРУГ: Авто-создание админа только локально
          if (!user && login === 'admin' && process.env.NODE_ENV === 'development') {
            console.log("Админ не найден. Создаем нового с шифрованием...");
            const hashedPassword = await hash(password, 10);
            user = await prisma.user.create({
              data: {
                login: 'admin',
                passwordHash: hashedPassword,
                role: Role.ADMIN
              }
            });
          }

          if (user && user.passwordHash) {
            const isPasswordValid = await compare(password, user.passwordHash);

            if (isPasswordValid) {
              return {
                id: user.id,
                name: user.login,
                role: user.role, 
              }; 
            }
          }
        
          return null;
        } catch (error) {
          console.error("Ошибка при авторизации:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) { 
      if (user) {
        token.id = user.id as string;
        // Приводим к типу any при чтении динамического свойства, чтобы избежать конфликтов модификаторов базового User
        token.role = (user as any).role as Role;
      }
      return token;
    },
    async session({ session, token }) { 
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/', 
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});