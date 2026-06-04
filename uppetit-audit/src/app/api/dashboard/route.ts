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

    // 1. Формируем фильтр по датам для ТЕКУЩЕГО периода
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

    const audits = await prisma.audit.findMany({
      where: whereClause,
      include: {
        location: true,
        checklistVersion: { include: { checklist: true } }
      },
      orderBy: { date: 'asc' }
    });

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
      const prevAudits = await prisma.audit.findMany({
        where: prevWhereClause,
        select: { score: true }
      });
      prevTotalAudits = prevAudits.length;
      prevAvgScore = prevAudits.length > 0 
        ? Math.round(prevAudits.reduce((acc, a) => acc + a.score, 0) / prevAudits.length) 
        : 0;
    }

    // 3. Базовые KPI
    const totalAudits = audits.length;
    const avgScore = audits.length > 0
      ? Math.round(audits.reduce((acc, a) => acc + a.score, 0) / audits.length)
      : 0;

    const calcTrend = (current: number, prev: number) => {
      if (prev === 0 && current > 0) return 100;
      if (prev === 0 && current === 0) return 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    const trends = {
      total: prevWhereClause ? calcTrend(totalAudits, prevTotalAudits) : null,
      score: prevWhereClause ? calcTrend(avgScore, prevAvgScore) : null
    };

    // 4. Распределение по зонам (Светофор)
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

    // 5. УМНАЯ ДИНАМИКА ПРОВЕРОК (Дни / Месяцы / Года)
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

    // 6. Рейтинг локаций (Топ-5 и Анти-Топ-5)
    const locMap: Record<string, { total: number, count: number, name: string }> = {};
    audits.forEach(a => {
      // ИСПРАВЛЕНИЕ: Защита от null для locationId
      const locId = a.locationId || 'unknown_location'; 
      
      if (!locMap[locId]) {
        locMap[locId] = { 
          total: 0, 
          count: 0, 
          name: a.locationName || a.location?.name || 'Неизвестная точка' 
        };
      }
      locMap[locId].total += a.score;
      locMap[locId].count += 1;
    });

    const locStats = Object.values(locMap).map(l => ({ name: l.name, avg: Math.round(l.total / l.count) })).sort((a, b) => b.avg - a.avg);

    return NextResponse.json({
      totalAudits,
      avgScore,
      trends,
      zones: [
        { name: 'Зеленая зона', value: zones.green, fill: '#4CAF50' },
        { name: 'Желтая зона', value: zones.yellow, fill: '#FFC107' },
        { name: 'Красная зона', value: zones.red, fill: '#FF4C4C' }
      ],
      trendData,
      topLocations: locStats.slice(0, 5),
      bottomLocations: locStats.slice(-5).reverse(),
      trendType: isYears ? 'По годам' : isMonths ? 'По месяцам' : 'По дням'
    });

  } catch (err) {
    console.error('Ошибка сборки дэшборда:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}