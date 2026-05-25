import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod'; // <-- Добавили наш любимый валидатор

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const uploadSchema = z.object({
  filename: z.string().min(1, 'Имя файла обязательно'),
  contentType: z.string().min(1, 'Тип файла обязателен'),
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();

    const { filename, contentType } = uploadSchema.parse(body);

    const s3Client = new S3Client({
      region: process.env.S3_REGION || 'ru-1', 
      endpoint: process.env.S3_ENDPOINT || 'https://s3.beget.com',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
      },
    });

    // 4. Создаем уникальное имя для файла, чтобы фотки не перепутали друг друга
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `audits/${uniqueFilename}`; 

    // 5. Готовим команду для загрузки
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: key,
      ContentType: contentType,
    });

    // 6. Создаем ссылку-пропуск на 5 минут (300 секунд)
    const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn: 300 });
    
    // 7. Формируем красивую финальную ссылку для нашей базы данных
    const publicUrl = `${process.env.S3_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error("Ошибка генерации S3 ссылки:", error);
    return NextResponse.json({ error: 'Ошибка сервера при загрузке файла' }, { status: 500 });
  }
}