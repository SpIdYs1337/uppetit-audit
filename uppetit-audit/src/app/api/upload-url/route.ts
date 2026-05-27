import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import S3 from 'aws-sdk/clients/s3'; // <-- Используем легкий импорт классического v2

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const uploadSchema = z.object({
  filename: z.string().min(1, 'Имя файла обязательно'),
  contentType: z.string().min(1, 'Тип файла обязателен'),
});

// ЖЕСТКАЯ ОЧИСТКА ЭНДПОИНТА
let cleanEndpoint = (process.env.S3_ENDPOINT || 'https://s3.beget.com').trim();
if (cleanEndpoint.endsWith('/')) {
  cleanEndpoint = cleanEndpoint.slice(0, -1);
}

// СОБИРАЕМ КЛЮЧИ
const accessKey = (process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '').trim();
const secretKey = (process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();

// Инициализация легкого S3 клиента
const s3 = new S3({
  endpoint: cleanEndpoint,
  accessKeyId: accessKey || 'MISSING_ACCESS_KEY',
  secretAccessKey: secretKey || 'MISSING_SECRET_KEY',
  region: (process.env.S3_REGION || 'ru-1').trim(),
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
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

    // 5. Генерируем ссылку-пропуск на 5 минут (300 секунд) с помощью v2
    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Expires: 300
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
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