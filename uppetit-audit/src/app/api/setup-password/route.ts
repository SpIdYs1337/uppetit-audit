import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs'; // <-- ИМПОРТИРУЕМ БИБЛИОТЕКУ ДЛЯ ШИФРОВАНИЯ

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Токен отсутствует' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ 
      where: { inviteToken: token } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 400 });
    }

    // МАГИЯ ЗДЕСЬ: Шифруем пароль (10 - это уровень сложности шифрования)
    const hashedPassword = await hash(password, 10);

    // Сохраняем зашифрованный пароль
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword, // <-- Сохраняем ХЭШ, а не простой текст
        inviteToken: `USED_${user.id}_${Date.now()}` 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Системная ошибка при сохранении пароля:", error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}