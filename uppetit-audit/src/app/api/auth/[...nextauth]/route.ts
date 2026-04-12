import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { compare, hash } from 'bcryptjs'; // <-- Добавили hash для создания админа

const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        const login = credentials?.login as string;
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

          // 🛟 СПАСАТЕЛЬНЫЙ КРУГ: Авто-создание админа, если база пустая
          if (!user && login === 'admin') {
            console.log("Админ не найден. Создаем нового с шифрованием...");
            const hashedPassword = await hash(password, 10); // Шифруем пароль админа
            user = await prisma.user.create({
              data: {
                login: 'admin',
                passwordHash: hashedPassword,
                role: 'ADMIN'
              }
            });
          }

          if (user && user.passwordHash) {
            // ПРОВЕРКА ПАРОЛЯ: Сравниваем введенный текст с хэшем из базы
            const isPasswordValid = await compare(password, user.passwordHash);

            if (isPasswordValid) {
              return {
                id: user.id,
                name: user.login,
                role: user.role, 
              } as any;
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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
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
  debug: true,
};

const nextAuthResult = NextAuth(authOptions);

// Совместимость с разными версиями NextAuth (App Router)
const handlerGET = (nextAuthResult as any).handlers ? (nextAuthResult as any).handlers.GET : nextAuthResult;
const handlerPOST = (nextAuthResult as any).handlers ? (nextAuthResult as any).handlers.POST : nextAuthResult;

export { handlerGET as GET, handlerPOST as POST };