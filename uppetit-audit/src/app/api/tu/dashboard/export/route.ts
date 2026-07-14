import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМА ДЛЯ ВАЛИДАЦИИ ---
const exportSchema = z.object({
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  checklistIds: z.array(z.string()).optional().default([]),
});

export async function POST(req: Request) {
  // 1. РАЗРЕШАЕМ ДОСТУП ДЛЯ ТУ (и Админов)
  const { error, session } = await requireAuth([Role.ADMIN, Role.TU]);
  if (error) return error;

  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // 2. СТРОГАЯ ВАЛИДАЦИЯ ВХОДЯЩИХ ДАННЫХ
    const parsedData = exportSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json({ error: 'Неверные параметры запроса' }, { status: 400 });
    }
    
    const { from, to, checklistIds } = parsedData.data;

    // 3. ФИЛЬТР ПО ТЕРРИТОРИИ ТУ
    const tuFilter = {
      OR: [
        { location: { tus: { some: { id: userId } } } },
        { location: { tuId: userId } }
      ]
    };

    // 4. СБОРКА УСЛОВИЙ ЗАПРОСА
    const whereClause: any = {
      ...tuFilter
    };

    if (from || to) {
      whereClause.date = {};
      if (from) whereClause.date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = toDate;
      }
    }

    // 5. ПОЛУЧЕНИЕ ДАННЫХ
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

    // 6. ГРУППИРОВКА ПО ТОЧКАМ
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

    // 7. СОЗДАНИЕ EXCEL ФАЙЛА
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Статистика Территории');

    sheet.columns = [
      { header: 'Адрес точки', key: 'name', width: 45 },
      { header: 'ТУ', key: 'tu', width: 30 },
      { header: 'Кол-во аудитов', key: 'count', width: 18 },
      { header: 'Средний балл', key: 'avgScore', width: 15 },
      { header: '% Выполнения', key: 'avgPct', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF25C05' } }; // Оранжевая шапка для ТУ
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

    return new NextResponse(buffer as BlobPart, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="TU_Dashboard_${new Date().getTime()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Ошибка выгрузки дэшборда ТУ:', err);
    return NextResponse.json({ error: 'Ошибка выгрузки' }, { status: 500 });
  }
}