import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import ExcelJS from 'exceljs';
import { auditAccessWhere, publicUserSelect } from '@/lib/accessControl';
import { auditFiltersSchema, historyWhere } from '@/lib/auditHistory';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // ИСПРАВЛЕНИЕ: Убрали ограничение по ролям. Теперь скачивать могут все (Аудиторы в том числе).
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = z.object({
      auditIds: z.array(z.string().min(1).max(100)).min(1).max(200).optional(),
      filters: auditFiltersSchema.optional(),
      timeZone: z.string().max(100).default('UTC'),
    }).parse(await req.json());
    const { auditIds, filters, timeZone } = body;
    if ((!auditIds && !filters) || (auditIds && filters)) {
      return NextResponse.json({ error: 'Нет данных для выгрузки' }, { status: 400 });
    }
    try { new Intl.DateTimeFormat('ru-RU', { timeZone }); }
    catch { return NextResponse.json({ error: 'Некорректный часовой пояс' }, { status: 400 }); }
    let where;
    try { where = filters ? historyWhere(session!.user, filters) : { id: { in: auditIds! }, ...auditAccessWhere(session!.user) }; }
    catch { return NextResponse.json({ error: 'Проверьте выбранный период' }, { status: 400 }); }

    const audits = await prisma.audit.findMany({
      where,
      take: 10001,
      include: {
        checklistVersion: {
          include: { checklist: true }
        },
        location: {
          include: { tus: { select: publicUserSelect } }
        },
        user: { select: publicUserSelect },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }]
    });

    if (auditIds && audits.length !== new Set(auditIds).size) return NextResponse.json({ error: 'Один или несколько аудитов недоступны' }, { status: 403 });
    if (audits.length > 10000) return NextResponse.json({ error: 'В одной выгрузке доступно до 10 000 аудитов. Уточните период или фильтры.' }, { status: 400 });
    if (!audits.length) return NextResponse.json({ error: 'Нет аудитов для выгрузки' }, { status: 400 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Аудиты');

    // Настраиваем колонки
    sheet.columns = [
      { header: 'Дата проведения', key: 'date', width: 18 },
      { header: 'Время завершения', key: 'time', width: 20 },
      { header: 'Наименование точки', key: 'location', width: 30 },
      { header: 'Чек-лист', key: 'checklist', width: 30 },
      { header: 'ТУ (Менеджер)', key: 'tu', width: 25 },
      { header: 'Аудитор', key: 'auditor', width: 25 },
      { header: 'Сумма баллов', key: 'score', width: 15 },
      { header: 'Макс. балл', key: 'maxScore', width: 15 },
      { header: '% Выполнения', key: 'percentage', width: 18 },
      { header: 'Зона', key: 'zone', width: 15 },
    ];

    // Стилизуем шапку
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Заполняем данные
    audits.forEach((audit) => {
      const max = audit.maxScore || 0;
      const score = audit.score || 0;
      const percentage = max > 0 ? (score / max) * 100 : 0;

      const defaultYellow = max > 0 ? max * 0.9 : 90;
      const defaultRed = max > 0 ? max * 0.7 : 70;

      const redThreshold = audit.checklistVersion?.checklist?.redThreshold ?? defaultRed;
      const yellowThreshold = audit.checklistVersion?.checklist?.yellowThreshold ?? defaultYellow;

      let zoneText = 'Красная';
      let zoneColor = 'FFFF4C4C';

      if (score >= yellowThreshold) {
        zoneText = 'Зеленая';
        zoneColor = 'FF4CAF50';
      } else if (score >= redThreshold) {
        zoneText = 'Желтая';
        zoneColor = 'FFFFC107';
      }

      const d = new Date(audit.date);

      let tuStr = 'Не назначен';
      if (audit.tuName) {
        tuStr = audit.tuName;
      } else if (audit.location?.tus && audit.location.tus.length > 0) {
        tuStr = audit.location.tus.map((tu) => tu.name || tu.login).join(', ');
      }

      const auditorStr = audit.auditorName || audit.user?.name || audit.user?.login || 'Неизвестно';
      const checklistTitle = audit.checklistVersion?.checklist?.title || 'Удален / Неизвестно';

      const row = sheet.addRow({
        date: d.toLocaleDateString('ru-RU', { timeZone }),
        time: d.toLocaleTimeString('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }),
        location: audit.locationName || audit.location?.name || 'Удалена',
        checklist: checklistTitle,
        tu: tuStr,
        auditor: auditorStr,
        score: score,
        maxScore: max,
        percentage: percentage.toFixed(1) + '%',
        zone: zoneText
      });

      row.getCell('score').alignment = { horizontal: 'center' };
      row.getCell('maxScore').alignment = { horizontal: 'center' };
      row.getCell('percentage').alignment = { horizontal: 'center' };

      const zoneCell = row.getCell('zone');
      zoneCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: zoneColor }
      };
      zoneCell.font = { bold: true, color: { argb: zoneText === 'Желтая' ? 'FF000000' : 'FFFFFFFF' } };
      zoneCell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Audits_${new Date().getTime()}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Некорректные параметры выгрузки' }, { status: 400 });
    console.error('Ошибка выгрузки Excel:', error);
    return NextResponse.json({ error: 'Ошибка при формировании файла' }, { status: 500 });
  }
}
