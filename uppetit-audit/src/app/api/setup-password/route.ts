import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
// Гарантируем, что пароль будет не пустым и не слишком коротким
const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Токен отсутствует'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

export async function POST(request: Request) {
  // ⚠️ ВНИМАНИЕ: Здесь НЕТ requireAuth, так как пользователь еще не имеет пароля и не может войти
  
  try {
    const body = await request.json();
    
    // 1. ВАЛИДАЦИЯ ВХОДЯЩИХ ДАННЫХ
    const parsedData = setupPasswordSchema.parse(body);

    // 2. Ищем пользователя по токену
    const user = await prisma.user.findFirst({ 
      where: { inviteToken: parsedData.token } 
    });
    
    if (!user) {
      // Отдаем общую ошибку, чтобы злоумышленник не мог "перебирать" токены
      return NextResponse.json({ error: 'Неверный или устаревший токен' }, { status: 400 });
    }

    // 3. ШИФРОВАНИЕ (10 - оптимальный уровень соли)
    const hashedPassword = await hash(parsedData.password, 10);

    // 4. СОХРАНЕНИЕ
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        // БЕЗОПАСНОСТЬ: Надежнее всего просто стереть токен (null),
        // чтобы он физически больше не существовал в базе.
        inviteToken: null 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error("Системная ошибка при сохранении пароля:", error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}