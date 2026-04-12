import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        // Ищем пользователя в базе по логину
        const user = await prisma.user.findUnique({
          where: { login: credentials.login as string }
        });

        if (!user) return null;

        // Проверяем, подходит ли пароль к зашифрованному хешу в базе
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordCorrect) return null;

        // Если всё ок — возвращаем данные пользователя
        return {
          id: user.id,
          name: user.login,
          role: user.role,
        };
      }
    })
  ],
  
  pages: {
    signIn: "/", // Указываем, что наша страница входа — это главная
  },
  callbacks: {
    // 1. ТОТ САМЫЙ ВЫШИБАЛА: Проверяет, можно ли пустить пользователя на страницу
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user; // Проверяем, есть ли пользователь в сессии
      const isOnAdmin = nextUrl.pathname.startsWith('/admin'); // Пытается ли он зайти в админку
      
      if (isOnAdmin) {
        if (isLoggedIn) return true; // Если авторизован — добро пожаловать
        return false; // Если нет — отказ (NextAuth сам перекинет его на страницу signIn, то есть на '/')
      }
      return true; // Разрешаем доступ ко всем остальным страницам
    },

    // 2. Твои настройки ролей (оставляем как было)
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    }
  }
});