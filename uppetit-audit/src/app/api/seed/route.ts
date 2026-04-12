import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Наш шлюз к БД
import bcrypt from 'bcryptjs';     // Шифратор паролей

export async function GET() {
  try {
    // 1. Проверяем, нет ли уже такого пользователя (чтобы не создать дубликат)
    const existingAdmin = await prisma.user.findUnique({
      where: { login: 'admin' },
    });

    if (existingAdmin) {
      return NextResponse.json({ message: 'Админ уже существует в базе!' });
    }

    // 2. Шифруем пароль "uppetit123"
    const hashedPassword = await bcrypt.hash('uppetit123', 10);

    // 3. Создаем запись в базе данных
    const newAdmin = await prisma.user.create({
      data: {
        login: 'admin',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({
      message: 'УРА! Супер-админ успешно создан!',
      user: newAdmin.login
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Произошла ошибка при создании' }, { status: 500 });
  }
}