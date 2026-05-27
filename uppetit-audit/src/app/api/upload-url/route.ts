import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import { s3Client } from '@/lib/s3'; // <-- Единый клиент S3

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

    // 4. Создаем уникальное имя для файла
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `audits/${uniqueFilename}`; 
    const bucketName = (process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '').trim();

    // 5. Генерируем ссылку-пропуск на 5 минут (300 секунд) с помощью единого клиента
    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Expires: 300
    };

    const uploadUrl = await s3Client.getSignedUrlPromise('putObject', params);
    
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