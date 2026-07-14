import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. РАЗРЕШАЕМ ДОСТУП ДЛЯ ТУ (и Админов)
  const { error, session } = await requireAuth([Role.ADMIN, Role.TU]);
  if (error) return error;

  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const checklistIdsParam = searchParams.get('checklistIds');
    const checklistIds = checklistIdsParam ? checklistIdsParam.split(',').filter(Boolean) : [];

    // 2. ФИЛЬТР ПО ТЕРРИТОРИИ ТУ
    const tuFilter = {
      OR: [
        { location: { tus: { some: { id: userId } } } },
        { location: { tuId: userId } }
      ]
    };

    // 3. ПРИМЕНЯЕМ ФИЛЬТР К ОСНОВНОМУ ЗАПРОСУ
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

    const allAudits = await prisma.audit.findMany({
      where: whereClause,
      include: {
        location: { include: { tus: true } },
        checklistVersion: { include: { checklist: true, items: true } },
        answers: true
      },
      orderBy: { date: 'asc' }
    });

    const checklistMap = new Map();
    allAudits.forEach(a => {
      const id = a.checklistVersion?.checklistId;
      const title = a.checklistVersion?.checklist?.title || 'Неизвестный чек-лист';
      if (id && !checklistMap.has(id)) checklistMap.set(id, title);
    });
    const availableChecklists = Array.from(checklistMap.entries()).map(([id, title]) => ({ id, title }));

    const audits = checklistIds.length > 0 
      ? allAudits.filter(a => checklistIds.includes(a.checklistVersion?.checklistId || ''))
      : allAudits;

    let prevWhereClause: any = null;
    if (from && to) {
      const f = new Date(from);
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      const diffMs = t.getTime() - f.getTime();
      const prevTo = new Date(f.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - diffMs);
      
      // 4. ПРИМЕНЯЕМ ФИЛЬТР К ЗАПРОСУ ПРОШЛОГО ПЕРИОДА
      prevWhereClause = { 
        date: { gte: prevFrom, lte: prevTo },
        ...tuFilter
      };
    } else if (from) {
      const f = new Date(from);
      const t = new Date();
      const diffMs = t.getTime() - f.getTime();
      const prevTo = new Date(f.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - diffMs);
      
      // 4. ПРИМЕНЯЕМ ФИЛЬТР К ЗАПРОСУ ПРОШЛОГО ПЕРИОДА
      prevWhereClause = { 
        date: { gte: prevFrom, lte: prevTo },
        ...tuFilter
      };
    }

    let prevTotalAudits = 0;
    let prevAvgScore = 0;
    const prevProblemsMap: Record<string, number> = {};

    if (prevWhereClause) {
      const prevAllAudits = await prisma.audit.findMany({
        where: prevWhereClause,
        select: { 
          score: true, 
          checklistVersion: { select: { checklistId: true } },
          answers: { select: { question: true, isOk: true } }
        }
      });
      const prevAudits = checklistIds.length > 0 
        ? prevAllAudits.filter(a => checklistIds.includes(a.checklistVersion?.checklistId || ''))
        : prevAllAudits;

      prevTotalAudits = prevAudits.length;
      prevAvgScore = prevAudits.length > 0 ? Math.round(prevAudits.reduce((acc, a) => acc + a.score, 0) / prevAudits.length) : 0;

      prevAudits.forEach(a => {
        if (a.answers) {
          a.answers.forEach((ans: any) => {
            if (ans.isOk === false && ans.question) {
              prevProblemsMap[ans.question] = (prevProblemsMap[ans.question] || 0) + 1;
            }
          });
        }
      });
    }

    const totalAudits = audits.length;
    const avgScore = audits.length > 0 ? Math.round(audits.reduce((acc, a) => acc + a.score, 0) / audits.length) : 0;
    
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

    const zones = { green: 0, yellow: 0, red: 0 };
    audits.forEach(a => {
      const max = a.maxScore || 0;
      const score = a.score || 0;
      const defaultYellow = max > 0 ? max * 0.9 : 90;
      const defaultRed = max > 0 ? max * 0.7 : 70;

      const redThreshold = a.checklistVersion?.checklist?.redThreshold ?? defaultRed;
      const yellowThreshold = a.checklistVersion?.checklist?.yellowThreshold ?? defaultYellow;

      if (score >= yellowThreshold) zones.green++;
      else if (score >= redThreshold) zones.yellow++;
      else zones.red++;
    });

    // === ГЕНЕРАЦИЯ ДАННЫХ ДЛЯ ТЕКСТОВОГО ОТЧЕТА ===
    const currentProblemsMap: Record<string, number> = {};
    const failedLocations: any[] = [];
    const criticalViolations: any[] = [];

    audits.forEach(a => {
      const max = a.maxScore || 0;
      const score = a.score || 0;
      
      const defaultRed = max > 0 ? max * 0.7 : 70;
      const redThreshold = a.checklistVersion?.checklist?.redThreshold ?? defaultRed;

      const failedAnswers = (a.answers || []).filter((ans: any) => ans.isOk === false);
      
      let criticalCount = 0;
      const critQuestions: string[] = [];

      failedAnswers.forEach((ans: any) => {
        if (ans.question) {
          currentProblemsMap[ans.question] = (currentProblemsMap[ans.question] || 0) + 1;
        }
        // Проверяем критичность (по id или по тексту)
        const item = a.checklistVersion?.items?.find((i: any) => i.id === ans.itemId || i.text === ans.question);
        if (item?.isCritical) {
          criticalCount++;
          if (ans.question) critQuestions.push(ans.question);
        }
      });

      let tuName = a.tuName && a.tuName !== 'Не был назначен' ? a.tuName : '';
      if (!tuName) {
        tuName = a.location?.tus?.map((t: any) => t.name || t.login).join(', ') || 'Не назначен';
      }

      // Если точка в Красной зоне (провалилась)
      if (score < redThreshold) {
        failedLocations.push({
          name: a.locationName || a.location?.name || 'Неизвестная точка',
          score,
          maxScore: max,
          pct: max > 0 ? Math.round((score/max)*100) : 0,
          tu: tuName,
          criticalCount
        });
      }

      if (criticalCount > 0) {
        criticalViolations.push({
          locationName: a.locationName || a.location?.name || 'Неизвестная точка',
          tu: tuName,
          questions: critQuestions
        });
      }
    });

    failedLocations.sort((a, b) => a.pct - b.pct);

    const problems = Object.keys(currentProblemsMap).map(q => {
      const count = currentProblemsMap[q];
      const prevCount = prevProblemsMap[q] || 0;
      return {
        question: q,
        count,
        pct: totalAudits > 0 ? Math.round((count / totalAudits) * 100) : 0,
        prevCount,
        prevPct: prevTotalAudits > 0 ? Math.round((prevCount / prevTotalAudits) * 100) : 0,
        delta: count - prevCount
      };
    }).sort((a, b) => b.count - a.count);

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
    const wowMap: Record<string, { total: number; max: number }> = {};
    const momMap: Record<string, { total: number; max: number }> = {};
    const locMap: Record<string, { total: number, maxTotal: number, count: number, name: string }> = {};

    audits.forEach(a => {
      const d = new Date(a.date);
      
      let key = '';
      if (isYears) key = d.getFullYear().toString(); 
      else if (isMonths) key = `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`; 
      else key = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`; 
      
      if (!trendMap[key]) trendMap[key] = 0;
      trendMap[key] += 1;

      const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const momKey = `${d.getFullYear()}-${mStr}`;
      if (!momMap[momKey]) momMap[momKey] = { total: 0, max: 0 };
      momMap[momKey].total += (a.score || 0);
      momMap[momKey].max += (a.maxScore || 0);

      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const monM = (monday.getMonth() + 1).toString().padStart(2, '0');
      const monD = monday.getDate().toString().padStart(2, '0');
      const wowKey = `${monday.getFullYear()}-${monM}-${monD}`;

      if (!wowMap[wowKey]) wowMap[wowKey] = { total: 0, max: 0 };
      wowMap[wowKey].total += (a.score || 0);
      wowMap[wowKey].max += (a.maxScore || 0);

      const locId = a.locationId || 'unknown_location'; 
      if (!locMap[locId]) {
        locMap[locId] = { total: 0, maxTotal: 0, count: 0, name: a.locationName || a.location?.name || 'Неизвестная точка' };
      }
      locMap[locId].total += a.score;
      locMap[locId].count += 1;
      locMap[locId].maxTotal += (a.maxScore || 0);
    });

    const trendData = Object.keys(trendMap).map(date => ({ date, count: trendMap[date] }));
    const momData = Object.keys(momMap).sort().map(k => {
      const [y, m] = k.split('-');
      return { date: `${m}.${y}`, pct: momMap[k].max > 0 ? Math.round((momMap[k].total / momMap[k].max) * 100) : 0 };
    });
    const wowData = Object.keys(wowMap).sort().map(k => {
      const [y, m, d] = k.split('-');
      return { date: `${d}.${m}`, pct: wowMap[k].max > 0 ? Math.round((wowMap[k].total / wowMap[k].max) * 100) : 0 };
    });

    const locStats = Object.values(locMap).map(l => ({ 
      name: l.name, 
      avg: Math.round(l.total / l.count),
      avgPct: l.maxTotal > 0 ? Math.round((l.total / l.maxTotal) * 100) : 0
    })).sort((a, b) => b.avgPct !== a.avgPct ? b.avgPct - a.avgPct : b.avg - a.avg);

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
      wowData, 
      momData, 
      topLocations: locStats.slice(0, 5),
      bottomLocations: locStats.slice(-5).reverse(),
      trendType: isYears ? 'По годам' : isMonths ? 'По месяцам' : 'По дням',
      availableChecklists,
      report: {
        failedLocations,
        problems,
        criticalViolations
      }
    });

  } catch (err) {
    console.error('Ошибка сборки дэшборда ТУ:', err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}