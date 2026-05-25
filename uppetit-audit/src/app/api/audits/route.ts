import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { z } from 'zod';
import { Role } from '@prisma/client'; 
import webpush from 'web-push';
import S3 from 'aws-sdk/clients/s3';

export const dynamic = 'force-dynamic';

// Настройка ключей Web-Push
webpush.setVapidDetails(
  'mailto:admin@uppetit.ru',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// ЖЕСТКАЯ ОЧИСТКА ЭНДПОИНТА
let cleanEndpoint = (process.env.S3_ENDPOINT || '').trim();
if (cleanEndpoint.endsWith('/')) {
  cleanEndpoint = cleanEndpoint.slice(0, -1);
}

// СОБИРАЕМ КЛЮЧИ: Учитываем любые варианты названий в твоем .env файле
const accessKey = (process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || '').trim();
const secretKey = (process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();

// Настройка классического S3 клиента (неубиваемый вариант для Ceph/Beget)
const s3 = new S3({
  endpoint: cleanEndpoint || undefined,
  // Если ключей нет в .env, передаем фейковый текст, чтобы запретить SDK искать сервера Amazon (EC2)
  accessKeyId: accessKey || 'MISSING_ACCESS_KEY',
  secretAccessKey: secretKey || 'MISSING_SECRET_KEY',
  region: (process.env.S3_REGION || 'ru-1').trim(),
  s3ForcePathStyle: true, // В v2 это работает с Beget идеально
  signatureVersion: 'v4'
});

// Вспомогательная функция для извлечения ключа
function getS3Key(urlStr: string): string | null {
  try {
    let pathPart = '';
    if (urlStr.startsWith('http')) {
      const url = new URL(urlStr);
      pathPart = decodeURIComponent(url.pathname);
    } else {
      pathPart = decodeURIComponent(urlStr);
    }
    
    if (pathPart.startsWith('/')) {
      pathPart = pathPart.substring(1);
    }
    return pathPart || null;
  } catch {
    return null;
  }
}

// --- ZOD СХЕМЫ ---
const auditPostSchema = z.object({
  userId: z.string().min(1, "Требуется ID пользователя"),
  locationId: z.string().min(1, "Требуется ID точки"),
  checklistId: z.string().min(1, "Требуется ID чек-листа"),
  score: z.number(),
  maxScore: z.number().optional(),
  shiftEmployees: z.array(z.string()).default([]),
  generalComment: z.string().optional(),
  answers: z.array(z.object({
    zone: z.string().optional(),
    questionText: z.string(),
    isOk: z.boolean(),
    penalty: z.number().default(0),
    photos: z.array(z.string()).default([]),
    comment: z.string().optional()
  }))
});

const auditDeleteSchema = z.object({
  id: z.string().optional().nullable(),
  clearAll: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = auditPostSchema.parse(body);

    const activeVersion = await prisma.checklistVersion.findFirst({
      where: { checklistId: data.checklistId, isActive: true },
      include: { items: true } 
    });

    if (!activeVersion) {
      return NextResponse.json({ error: 'Не найдена активная версия чек-листа' }, { status: 400 });
    }

    const [user, location] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId }, select: { login: true, name: true } }),
      prisma.location.findUnique({ 
        where: { id: data.locationId }, 
        include: { 
          tu: { select: { id: true, name: true, login: true } },
          tus: { select: { id: true, name: true, login: true } } 
        } 
      })
    ]);

    let actingTuName = 'Не был назначен';
    if (location?.tus && location.tus.length > 0) {
      actingTuName = location.tus.map(t => t.name || t.login).join(', ');
    } else if (location?.tu) {
      actingTuName = location.tu.name || location.tu.login;
    }

    const actingAuditorName = user ? (user.name || user.login) : 'Неизвестный аудитор';

    const newAudit = await prisma.audit.create({
      data: {
        userId: data.userId,
        locationId: data.locationId,
        auditorName: actingAuditorName,
        locationName: location?.name || 'Неизвестная точка', 
        tuName: actingTuName, 
        checklistVersionId: activeVersion.id, 
        score: data.score,
        maxScore: data.maxScore,
        shiftEmployees: data.shiftEmployees,
        generalComment: data.generalComment,
        
        answers: {
          create: data.answers.map(ans => {
            const matchedItem = activeVersion.items.find(i => i.text === ans.questionText);
            return {
              itemId: matchedItem?.id, 
              zone: ans.zone || 'Основной раздел',
              question: ans.questionText,
              isOk: ans.isOk,
              penalty: ans.penalty,
              photos: ans.photos,
              comment: ans.comment
            };
          })
        }
      }
    });

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      await prisma.visitPlan.updateMany({
        where: {
          userId: data.userId,
          locationId: data.locationId,
          status: 'PLANNED',
          date: { gte: todayStart, lte: todayEnd }
        },
        data: { status: 'DONE' }
      });
    } catch (planError) {
      console.error('Не удалось автоматически закрыть план визита:', planError);
    }

    try {
      const targetUsers = await prisma.user.findMany({
        where: {
          pushSubscription: { not: null },
          OR: [
            { role: Role.ADMIN },
            { id: location?.tuId || undefined },
            { locations: { some: { id: data.locationId } } }
          ]
        },
        select: { id: true, pushSubscription: true }
      });

      if (targetUsers.length > 0) {
        const notificationPayload = JSON.stringify({
          title: 'Завершен аудит точки! 📍',
          body: `Точка: ${location?.name || 'Неизвестная'}\nРезультат: ${data.score} из ${data.maxScore || 100} б.\nАудитор: ${actingAuditorName}`,
          icon: '/logo3.png',
          badge: '/logo3.png',
        });

        for (const targetUser of targetUsers) {
          if (!targetUser.pushSubscription) continue;
          try {
            const subscriptionObj = JSON.parse(targetUser.pushSubscription);
            await webpush.sendNotification(subscriptionObj, notificationPayload);
          } catch (pushSendErr: any) {
            console.error(`Ошибка отправки пуша пользователю ${targetUser.id}:`, pushSendErr);
            if (pushSendErr.statusCode === 410 || pushSendErr.statusCode === 404) {
              await prisma.user.update({
                where: { id: targetUser.id },
                data: { pushSubscription: null }
              });
            }
          }
        }
      }
    } catch (pushGlobalError) {
      console.error('Ошибка в блоке отправки пуш-уведомлений:', pushGlobalError);
    }

    return NextResponse.json({ success: true, audit: newAudit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные формы', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка POST /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка сохранения аудита' }, { status: 500 });
  }
}

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const currentUserId = session?.user?.id;
    const currentUserRole = (session?.user as any)?.role;

    const whereClause: any = {};
    if (currentUserRole === Role.TU && currentUserId) {
      whereClause.location = {
        OR: [
          { tuId: currentUserId },
          { tus: { some: { id: currentUserId } } }
        ]
      };
    }

    const audits = await prisma.audit.findMany({
      where: whereClause, 
      include: {
        user: { select: { id: true, login: true, name: true } },
        location: { 
          select: { 
            id: true, 
            name: true,
            tus: { select: { id: true, name: true, login: true } } 
          } 
        },
        checklistVersion: {
          include: {
            checklist: { select: { id: true, title: true } }
          }
        },
        answers: true
      },
      orderBy: { date: 'desc' }
    });

    const formattedAudits = audits.map(audit => ({
      ...audit,
      location: audit.location ? audit.location : { id: 'deleted', name: audit.locationName || 'Удаленная точка', tus: [] },
      
      user: audit.user ? {
        id: audit.user.id,
        login: audit.user.name || audit.user.login
      } : { 
        id: 'deleted', 
        login: audit.auditorName || 'Удаленный аудитор' 
      },
      
      checklist: {
        id: audit.checklistVersion.checklist.id,
        title: audit.checklistVersion.checklist.title,
        version: audit.checklistVersion.version
      }
    }));

    return NextResponse.json(formattedAudits);
  } catch (err) {
    console.error('Ошибка GET /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка загрузки аудитов' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const queryData = auditDeleteSchema.parse({
      id: searchParams.get('id'),
      clearAll: searchParams.get('clearAll')
    });
    
    const bucketName = (process.env.S3_BUCKET_NAME || '').trim();
    const objectsToDelete: string[] = [];

    // СЦЕНАРИЙ А: Полная очистка
    if (queryData.clearAll === 'true') {
      const allAnswers = await prisma.answer.findMany({ select: { photos: true } });
      allAnswers.forEach(ans => {
        ans.photos.forEach(url => {
          const key = getS3Key(url);
          if (key) objectsToDelete.push(key);
        });
      });

      if (objectsToDelete.length > 0 && bucketName) {
        console.log(`[S3] Запуск массовой очистки (${objectsToDelete.length} файлов)...`);
        await Promise.all(objectsToDelete.map(async (key) => {
          try {
            await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
          } catch (e) {
             // Игнорируем ошибки при массовой очистке
          }
        }));
      }

      await prisma.audit.deleteMany({});

    // СЦЕНАРИЙ Б: Одиночное удаление
    } else if (queryData.id) {
      const targetAudit = await prisma.audit.findUnique({
        where: { id: queryData.id },
        include: { answers: true }
      });

      if (!targetAudit) {
        return NextResponse.json({ error: 'Аудит не найден' }, { status: 404 });
      }

      console.log('\n--- [S3 DEBUG] НАЧИНАЕМ УДАЛЕНИЕ ---');
      targetAudit.answers.forEach(ans => {
        ans.photos.forEach(url => {
          const key = getS3Key(url);
          if (key) objectsToDelete.push(key);
        });
      });

      console.log(`[S3] Найдено ключей для удаления: ${objectsToDelete.length}`);

      if (objectsToDelete.length > 0 && bucketName) {
        for (const key of objectsToDelete) {
          try {
            console.log(`[S3] Удаляю файл: ${key}...`);
            await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
            console.log(`[S3] ✅ Успешно удален: ${key}`);
          } catch (s3Err) {
            console.error(`❌ [S3] Ошибка при удалении файла ${key}:`, s3Err);
          }
        }
      } else {
        console.log('⚠️ [S3] Удаление пропущено: фото нет или бакет не задан.');
      }

      await prisma.audit.delete({ where: { id: queryData.id } });
      
    } else {
      return NextResponse.json({ error: 'Нет ID для удаления' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, deletedPhotosCount: objectsToDelete.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные параметры запроса', details: err.issues }, { status: 400 });
    }
    console.error('Ошибка DELETE /api/audits:', err);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}