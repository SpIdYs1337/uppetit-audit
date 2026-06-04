import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const checklistId = searchParams.get('checklistId');

    // 1. Формируем фильтр по датам
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
        location: true,
        checklistVersion: { include: { checklist: true } }
      },
      orderBy: { date: 'asc' }
    });

    // Собираем список доступных чек-листов
    const checklistMap = new Map();
    allAudits.forEach(a => {
      const id = a.checklistVersion?.checklistId;
      const title = a.checklistVersion?.checklist?.title || 'Неизвестный чек-лист';
      if (id && !checklistMap.has(id)) checklistMap.set(id, title);
    });
    const availableChecklists = Array.from(checklistMap.entries()).map(([id, title]) => ({ id, title }));

    // Фильтруем массив для изолированной аналитики
    const audits = checklistId 
      ? allAudits.filter(a => a.checklistVersion?.checklistId === checklistId)
      : allAudits;

    // 2. Высчитываем ПРЕДЫДУЩИЙ период для динамики
    let prevWhereClause: any = null;
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      const diffMs = t.getTime() - f.getTime();
      const prevTo = new Date(f.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - diffMs);
      prevWhereClause = { date: { gte: prevFrom, lte: prevTo } };
    } else if (from) {
      const f = new Date(from);
      const t = new Date();
      const diffMs = t.getTime() - f.getTime();
      const prevTo = new Date(f.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - diffMs);
      prevWhereClause = { date: { gte: prevFrom, lte: prevTo } };
    }

    let prevTotalAudits = 0;
    let prevAvgScore = 0;

    if (prevWhereClause) {
      const prevAllAudits = await prisma.audit.findMany({
        where: prevWhereClause,
        select: { score: true, checklistVersion: { select: { checklistId: true } } }
      });
      const prevAudits = checklistId 
        ? prevAllAudits.filter(a => a.checklistVersion?.checklistId === checklistId)
        : prevAllAudits;

      prevTotalAudits = prevAudits.length;
      prevAvgScore = prevAudits.length > 0 ? Math.round(prevAudits.reduce((acc, a) => acc + a.score, 0) / prevAudits.length) : 0;
    }

    // 3. Базовые KPI
    const totalAudits = audits.length;
    const avgScore = audits.length > 0 ? Math.round(audits.reduce((acc, a) => acc + a.score, 0) / audits.length) : 0;
    
    // Считаем ВЗВЕШЕННЫЙ общий процент сети
    let networkTotalScore = 0;
    let networkMaxScore = 0;
    audits.forEach(a => {
      networkTotalScore += (a.score || 0);
      networkMaxScore += (a.maxScore || 0);
    });
    const avgPct = networkMaxScore > 0 ? Math.round((networkTotalScore / networkMaxScore) * 100) : 0;

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0 && current > 0) return 100;
      if (prev === 0 && current === 0) return 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    const trends = {
      total: prevWhereClause ? calcTrend(totalAudits, prevTotalAudits) : null,
      score: prevWhereClause ? calcTrend(avgScore, prevAvgScore) : null
    };

    // 4. Светофор (Зоны считаются от СУММЫ баллов за день)
    const dailyLocationScores: Record<string, { score: number, red: number, yellow: number }> = {};
    audits.forEach(a => {
      const dateStr = new Date(a.date).toISOString().split('T')[0];
      const key = `${dateStr}_${a.locationId}`;
      if (!dailyLocationScores[key]) {
        dailyLocationScores[key] = {
          score: 0,
          red: a.checklistVersion?.checklist?.redThreshold || 70,
          yellow: a.checklistVersion?.checklist?.yellowThreshold || 90
        };
      }
      dailyLocationScores[key].score += a.score;
    });

    let zones = { green: 0, yellow: 0, red: 0 };
    Object.values(dailyLocationScores).forEach(daily => {
      if (daily.score >= daily.yellow) zones.green++;
      else if (daily.score >= daily.red) zones.yellow++;
      else zones.red++;
    });

    // 5. Динамика проверок
    let isMonths = false;
    let isYears = false;
    if (audits.length > 0) {
      const firstDate = new Date(audits[0].date);
      const lastDate = new Date(audits[audits.length - 1].date);
      const diffDays = Math.ceil(Math.abs(lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) isYears = true;
      else if (diffDays > 60) isMonths = true; 
    }

    const trendMap: Record<string, number> = {};
    audits.forEach(a => {
      const d = new Date(a.date);
      let key = '';
      if (isYears) {
        key = d.getFullYear().toString(); 
      } else if (isMonths) {
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        key = `${m}.${d.getFullYear()}`; 
      } else {
        const day = d.getDate().toString().padStart(2, '0');
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        key = `${day}.${m}`; 
      }
      if (!trendMap[key]) trendMap[key] = 0;
      trendMap[key] += 1;
    });

    const trendData = Object.keys(trendMap).map(date => ({ date, count: trendMap[date] }));

    // 6. Рейтинг локаций (Взвешенный процент + Жесткая сортировка)
    const locMap: Record<string, { total: number, maxTotal: number, count: number, name: string }> = {};
    audits.forEach(a => {
      const locId = a.locationId || 'unknown_location'; 
      if (!locMap[locId]) {
        locMap[locId] = { total: 0, maxTotal: 0, count: 0, name: a.locationName || a.location?.name || 'Неизвестная точка' };
      }
      locMap[locId].total += a.score;
      locMap[locId].count += 1;
      locMap[locId].maxTotal += (a.maxScore || 0); // Суммируем максимум баллов для честного %
    });

    const locStats = Object.values(locMap).map(l => ({ 
      name: l.name, 
      avg: Math.round(l.total / l.count),
      avgPct: l.maxTotal > 0 ? Math.round((l.total / l.maxTotal) * 100) : 0
    }));

    // ЖЕЛЕЗОБЕТОННАЯ СОРТИРОВКА (Сначала % по убыванию, затем баллы по убыванию)
    locStats.sort((a, b) => {
      if (b.avgPct !== a.avgPct) return b.avgPct - a.avgPct;
      return b.avg - a.avg; 
    });

    return NextResponse.json({
      totalAudits,
      avgScore,
      avgPct,
      trends,
      zones: [
        { name: 'Зеленая зона', value: zones.green, fill: '#4CAF50' },
        { name: 'Желтая зона', value: zones.yellow, fill: '#FFC107' },
        { name: 'Красная зона', value: zones.red, fill: '#FF4C4C' }
      ],
      trendData,
      topLocations: locStats.slice(0, 5),
      bottomLocations: locStats.slice(-5).reverse(),
      trendType: isYears ? 'По годам' : isMonths ? 'По месяцам' : 'По дням',
      availableChecklists
    });

  } catch (err) {
    console.error('Ошибка сборки дэшборда:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}