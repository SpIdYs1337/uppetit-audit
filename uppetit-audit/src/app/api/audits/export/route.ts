import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { auditIds } = await req.json();

    if (!auditIds || !Array.isArray(auditIds) || auditIds.length === 0) {
      return NextResponse.json({ error: 'Нет данных для выгрузки' }, { status: 400 });
    }

    // Достаем аудиты со связями, чтобы получить пороги зон из чек-листа
    const audits = await prisma.audit.findMany({
      where: { id: { in: auditIds } },
      include: {
        checklistVersion: {
          include: { checklist: true }
        },
        location: true,
      },
      orderBy: { date: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Аудиты');

    // Настраиваем колонки
    sheet.columns = [
      { header: 'Дата проведения', key: 'date', width: 18 },
      { header: 'Время завершения', key: 'time', width: 20 },
      { header: 'Наименование точки', key: 'location', width: 30 },
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

    // Заполняем данные
    audits.forEach((audit) => {
      const max = audit.maxScore || 0;
      const score = audit.score || 0;
      const percentage = max > 0 ? (score / max) * 100 : 0;

      // Получаем пороги светофора из настроек чек-листа
      const redThreshold = audit.checklistVersion.checklist.redThreshold;
      const yellowThreshold = audit.checklistVersion.checklist.yellowThreshold;

      // Вычисляем зону
      let zoneText = 'Красная';
      let zoneColor = 'FFFF4C4C'; // Мягкий красный
      
      if (percentage >= yellowThreshold) {
        zoneText = 'Зеленая';
        zoneColor = 'FF4CAF50'; // Зеленый
      } else if (percentage >= redThreshold) {
        zoneText = 'Желтая';
        zoneColor = 'FFFFC107'; // Желтый
      }

      const d = new Date(audit.date);

      const row = sheet.addRow({
        date: d.toLocaleDateString('ru-RU'),
        time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        location: audit.locationName || audit.location?.name || 'Удалена',
        tu: audit.tuName || 'Не назначен',
        auditor: audit.auditorName || 'Неизвестно',
        score: score,
        maxScore: max,
        percentage: percentage.toFixed(1) + '%',
        zone: zoneText
      });

      // Красим ячейку "Зона"
      const zoneCell = row.getCell('zone');
      zoneCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: zoneColor }
      };
      zoneCell.font = { bold: true, color: { argb: zoneText === 'Желтая' ? 'FF000000' : 'FFFFFFFF' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Audits_${new Date().getTime()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Ошибка выгрузки Excel:', error);
    return NextResponse.json({ error: 'Ошибка при формировании файла' }, { status: 500 });
  }
}