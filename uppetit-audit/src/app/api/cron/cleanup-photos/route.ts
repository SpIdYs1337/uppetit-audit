import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import S3 from 'aws-sdk/clients/s3'; 
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ЖЕСТКАЯ ОЧИСТКА ЭНДПОИНТА
let cleanEndpoint = (process.env.S3_ENDPOINT || '').trim();
if (cleanEndpoint.endsWith('/')) {
  cleanEndpoint = cleanEndpoint.slice(0, -1);
}

// СОБИРАЕМ КЛЮЧИ ИЗ .ENV
const accessKey = (process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '').trim();
const secretKey = (process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();

// Настройка классического S3 клиента (неубиваемый вариант для Ceph/Beget)
const s3 = new S3({
  endpoint: cleanEndpoint || undefined,
  accessKeyId: accessKey || 'MISSING_ACCESS_KEY',
  secretAccessKey: secretKey || 'MISSING_SECRET_KEY',
  region: (process.env.S3_REGION || 'ru-1').trim(),
  s3ForcePathStyle: true, 
  signatureVersion: 'v4'
});

// Zod схема для проверки входящих параметров
const cronQuerySchema = z.object({
  key: z.string().min(1, 'Ключ доступа обязателен'),
});

// Вспомогательная функция для извлечения ключа (Beget-friendly)
function getS3Key(urlStr: string): string | null {
  try {
    let pathPart = '';
    if (urlStr.startsWith('http')) {
      const url = new URL(urlStr);
      pathPart = decodeURIComponent(url.pathname);
    } else {
      pathPart = decodeURIComponent(urlStr);
    }
    
    // Убираем ведущий слэш
    if (pathPart.startsWith('/')) {
      pathPart = pathPart.substring(1);
    }
    return pathPart || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // 1. ЗАЩИТА: Строгая валидация секретного ключа
    const { searchParams } = new URL(req.url);
    const parsedQuery = cronQuerySchema.safeParse({ key: searchParams.get('key') });

    if (!parsedQuery.success || parsedQuery.data.key !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Доступ запрещен. Неверный ключ.' }, { status: 401 });
    }

    const bucketName = (process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '').trim();

    // 2. ВЫЧИСЛЯЕМ ДАТУ: Строго минус 6 месяцев
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 3. ИЩЕМ АУДИТЫ: старше 6 месяцев
    const oldAudits = await prisma.audit.findMany({
      where: {
        date: { lt: sixMonthsAgo },
      },
      include: {
        answers: true
      }
    });

    const objectsToDelete: string[] = [];

    // 4. СОБИРАЕМ ПОЛНЫЕ КЛЮЧИ
    oldAudits.forEach(audit => {
      audit.answers.forEach(answer => {
        // Безопасная проверка массива фотографий
        if (answer.photos && Array.isArray(answer.photos) && answer.photos.length > 0) {
          answer.photos.forEach(photoUrl => {
            const key = getS3Key(photoUrl);
            if (key) {
              objectsToDelete.push(key);
            }
          });
        }
      });
    });

    // Если удалять нечего — завершаем работу
    if (objectsToDelete.length === 0) {
      return NextResponse.json({ message: 'Нет фотографий старше 6 месяцев для удаления' });
    }

    // 5. ИСПРАВЛЕНО: Безопасное "снайперское" удаление пачками по 50 штук (защита от лимитов Beget)
    let deletedCount = 0;
    const CHUNK_SIZE = 50; 

    console.log(`[CRON S3] Начинаем очистку ${objectsToDelete.length} старых файлов...`);

    if (bucketName) {
      for (let i = 0; i < objectsToDelete.length; i += CHUNK_SIZE) {
        const chunk = objectsToDelete.slice(i, i + CHUNK_SIZE);
        
        // Отправляем запросы параллельно, но не больше 50 за раз
        await Promise.all(chunk.map(async (key) => {
          try {
            await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
            deletedCount++;
          } catch (s3Err) {
            console.error(`[CRON S3] Ошибка удаления ${key}:`, s3Err);
          }
        }));
      }
    }

    // 6. ОЧИЩАЕМ БД: Атомарно затираем массивы с фото
    const updateResult = await prisma.answer.updateMany({
      where: {
        audit: {
          date: { lt: sixMonthsAgo }
        }
      },
      data: {
        photos: [] 
      }
    });

    return NextResponse.json({ 
      success: true, 
      deletedFromS3: deletedCount,
      clearedInDatabase: updateResult.count 
    });

  } catch (error) {
    console.error('Ошибка при автоудалении старых фото в Cron-задаче:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}