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
    const { from, to, checklistIds } = await req.json();

    const whereClause: any = {};
    if (from || to) {
      whereClause.date = {};
      if (from) whereClause.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = toDate;
      }
    }

    const allAudits = await prisma.audit.findMany({
      where: whereClause,
      include: {
        location: { include: { tus: true } },
        checklistVersion: { include: { checklist: true } }
      },
      orderBy: { date: 'asc' }
    });

    const audits = (checklistIds && checklistIds.length > 0)
      ? allAudits.filter(a => checklistIds.includes(a.checklistVersion?.checklistId))
      : allAudits;

    if (audits.length === 0) {
      return NextResponse.json({ error: 'Нет данных для выгрузки' }, { status: 400 });
    }

    // Группируем по точкам
    const locMap: Record<string, any> = {};
    
    audits.forEach(a => {
      const locId = a.locationId || 'unknown_location';
      if (!locMap[locId]) {
        let tuStr = a.tuName || 'Не назначен';
        if (!a.tuName || a.tuName === 'Не был назначен') {
          if (a.location?.tus && a.location.tus.length > 0) {
            tuStr = a.location.tus.map(t => t.name || t.login).join(', ');
          }
        }

        locMap[locId] = {
          // ИСПРАВЛЕНИЕ: В первую очередь берем реальный адрес. Если его нет - fallback на имя
          name: a.location?.address || a.location?.name || a.locationName || 'Неизвестный адрес',
          tu: tuStr,
          totalScore: 0,
          maxTotal: 0,
          count: 0
        };
      }
      locMap[locId].totalScore += (a.score || 0);
      locMap[locId].maxTotal += (a.maxScore || 0);
      locMap[locId].count += 1;
    });

    const rows = Object.values(locMap).map(l => ({
      name: l.name,
      tu: l.tu,
      count: l.count,
      avgScore: Math.round(l.totalScore / l.count),
      avgPct: l.maxTotal > 0 ? ((l.totalScore / l.maxTotal) * 100).toFixed(1) : '0.0'
    }));

    // Сортируем по проценту (от большего к меньшему)
    rows.sort((a, b) => parseFloat(b.avgPct) - parseFloat(a.avgPct));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Статистика');

    sheet.columns = [
      // ИСПРАВЛЕНИЕ: Расширили колонку для длинных адресов и переименовали заголовок
      { header: 'Адрес точки', key: 'name', width: 45 },
      { header: 'ТУ', key: 'tu', width: 30 },
      { header: 'Кол-во аудитов', key: 'count', width: 18 },
      { header: 'Средний балл', key: 'avgScore', width: 15 },
      { header: '% Выполнения', key: 'avgPct', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    rows.forEach(r => {
      const row = sheet.addRow({
        name: r.name,
        tu: r.tu,
        count: r.count,
        avgScore: r.avgScore,
        avgPct: r.avgPct + '%'
      });
      row.getCell('count').alignment = { horizontal: 'center' };
      row.getCell('avgScore').alignment = { horizontal: 'center' };
      row.getCell('avgPct').alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Dashboard_${new Date().getTime()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Ошибка выгрузки дэшборда:', err);
    return NextResponse.json({ error: 'Ошибка выгрузки' }, { status: 500 });
  }
}