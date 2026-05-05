import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// Настраиваем S3 клиент (убедись, что переменные окружения совпадают с твоими)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ru-central1', 
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: Request) {
  // 1. ЗАЩИТА: Проверяем секретный ключ, чтобы кто попало не мог запустить очистку
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('key');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
  }

  try {
    // 2. ВЫЧИСЛЯЕМ ДАТУ: текущая минус 6 месяцев
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 12);

    // 3. ИЩЕМ АУДИТЫ: старше 6 месяцев, загружаем их ответы
    const oldAudits = await prisma.audit.findMany({
      where: {
        date: { lt: sixMonthsAgo },
      },
      include: {
        answers: true // Тянем ответы, чтобы достать массив photos
      }
    });

    const objectsToDelete: { Key: string }[] = [];
    const answerIdsToClear: string[] = [];

    // 4. СОБИРАЕМ КЛЮЧИ: парсим ссылки, чтобы получить ключи файлов в S3
    oldAudits.forEach(audit => {
      audit.answers.forEach(answer => {
        if (answer.photos && answer.photos.length > 0) {
          answerIdsToClear.push(answer.id);
          
          answer.photos.forEach(photoUrl => {
            // ВАЖНО: Тебе нужно вытащить S3 Key из URL. 
            // Если ссылка выглядит как https://bucket.s3.ru/folder/image.jpg,
            // ключ — это "folder/image.jpg". 
            // Этот код берет просто последнюю часть URL (имя файла). 
            // Если у тебя есть папки, адаптируй этот парсинг!
            const urlParts = photoUrl.split('/');
            const key = urlParts[urlParts.length - 1]; 
            
            if (key) {
              objectsToDelete.push({ Key: key });
            }
          });
        }
      });
    });

    // Если удалять нечего — расходимся
    if (objectsToDelete.length === 0) {
      return NextResponse.json({ message: 'Нет фото старше 6 месяцев для удаления' });
    }

    // 5. УДАЛЯЕМ ИЗ S3: пачкой
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Delete: { Objects: objectsToDelete }
    }));

    // 6. ОЧИЩАЕМ БД: чтобы вместо битых картинок интерфейс показывал пустоту
    await prisma.answer.updateMany({
      where: { id: { in: answerIdsToClear } },
      data: { photos: [] } // Затираем массив с фото
    });

    return NextResponse.json({ 
      success: true, 
      deletedPhotos: objectsToDelete.length,
      clearedAnswers: answerIdsToClear.length 
    });

  } catch (error) {
    console.error('Ошибка при автоудалении старых фото:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}