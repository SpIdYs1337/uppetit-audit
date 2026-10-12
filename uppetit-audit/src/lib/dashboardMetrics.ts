import { reportCalendarDate } from '@/lib/reportDates';

export type DashboardZone = 'green' | 'yellow' | 'red' | 'unknown';
export type DashboardAudit = {
  id: string; date: Date; score: number; maxScore: number | null;
  locationId: string | null; locationName: string | null; userId: string | null;
  auditorName: string | null; tuName: string | null; shiftEmployees: string[]; generalComment: string | null;
  user?: { id: string; name: string | null; login: string } | null;
  location: { name: string; address: string | null; tus: { id: string; name: string | null; login: string }[]; tu?: { id: string; name: string | null; login: string } | null } | null;
  checklistVersion: { version: number; checklistId: string; checklist: { title: string; redThreshold: number; yellowThreshold: number }; items: { id: string; text: string; zone: string | null; isCritical: boolean; score: number; photoRequirement: string }[] };
  answers: { id: string; itemId: string | null; question: string | null; zone: string | null; isOk: boolean; penalty: number; comment: string | null; photos: string[] }[];
};
export const dashboardPct = (part: number, total: number) => total > 0 ? Math.round(part / total * 1000) / 10 : null;
const round = (value: number) => Math.round(value * 10) / 10;
export function dashboardAuditFacts(audit: DashboardAudit) {
  // Missing historic denominators are excluded, rather than estimated from a different checklist version.
  const validScore = audit.maxScore !== null && audit.maxScore > 0 && audit.score >= 0 && audit.score <= audit.maxScore;
  const max = validScore ? audit.maxScore! : 0;
  const zone: DashboardZone = !validScore ? 'unknown' : audit.score >= audit.checklistVersion.checklist.yellowThreshold ? 'green' : audit.score >= audit.checklistVersion.checklist.redThreshold ? 'yellow' : 'red';
  const answers = audit.answers.map(answer => {
    const matches = audit.checklistVersion.items.filter(item => answer.itemId ? item.id === answer.itemId : item.text === answer.question && (item.zone || 'Основной раздел') === (answer.zone || 'Основной раздел'));
    const item = matches.length === 1 ? matches[0] : null;
    return { ...answer, question: answer.question || item?.text || 'Вопрос без названия', zone: answer.zone || item?.zone || 'Основной раздел',
      critical: item?.isCritical === true, matched: !!item,
      photoRequired: item?.photoRequirement === 'REQUIRED' || (item?.photoRequirement === 'VIOLATION' && !answer.isOk) };
  });
  const failed = answers.filter(answer => !answer.isOk);
  const name = audit.locationName || audit.location?.name || 'Удалённая точка';
  const tu = audit.tuName && audit.tuName !== 'Не был назначен' ? audit.tuName : audit.location?.tus.map(user => user.name || user.login).join(', ') || audit.location?.tu?.name || audit.location?.tu?.login || 'Не назначен';
  return { max, validScore, pct: dashboardPct(audit.score, max), zone, answers, failed, critical: failed.filter(answer => answer.critical),
    name, tu, locationKey: audit.locationId || `deleted:${name}`, auditor: audit.auditorName || audit.user?.name || audit.user?.login || 'Удалённый аудитор' };
}
type Problem = { key: string; question: string; section: string; checklist: string; checked: Set<string>; failed: Set<string>; locations: Map<string, Set<string>>; criticalLocations: Set<string>; incidents: number; critical: number; penalty: number; photos: number; comments: number; lastAuditId: string };
function problemsOf(audits: DashboardAudit[], factsOf = dashboardAuditFacts) {
  const map = new Map<string, Problem>();
  for (const audit of audits) {
    const facts = factsOf(audit);
    for (const answer of facts.answers) {
      // Same wording in different checklists/sections is a different control. Stable wording can span versions.
      const key = JSON.stringify([audit.checklistVersion.checklistId, answer.zone, answer.question]);
      let row = map.get(key);
      if (!row) { row = { key, question: answer.question, section: answer.zone, checklist: audit.checklistVersion.checklist.title, checked: new Set(), failed: new Set(), locations: new Map(), criticalLocations: new Set(), incidents: 0, critical: 0, penalty: 0, photos: 0, comments: 0, lastAuditId: audit.id }; map.set(key, row); }
      row.checked.add(audit.id);
      if (answer.isOk) continue;
      row.failed.add(audit.id); row.incidents++; row.critical += Number(answer.critical); row.penalty += answer.penalty;
      if (answer.critical) row.criticalLocations.add(facts.locationKey);
      row.photos += answer.photos.length; row.comments += Number(!!answer.comment?.trim()); row.lastAuditId = audit.id;
      const failures = row.locations.get(facts.locationKey) || new Set<string>(); failures.add(audit.id); row.locations.set(facts.locationKey, failures);
    }
  }
  return map;
}
function totals(audits: DashboardAudit[], factsOf = dashboardAuditFacts) {
  let score = 0, max = 0, scored = 0, violations = 0, critical = 0, criticalAudits = 0, withViolations = 0, answers = 0, penalties = 0;
  let photos = 0, failedWithPhotos = 0, requiredPhotos = 0, missingRequiredPhotos = 0, unmatchedAnswers = 0, clean = 0;
  for (const audit of audits) {
    const facts = factsOf(audit);
    if (facts.validScore) { score += audit.score; max += facts.max; scored++; }
    violations += facts.failed.length; critical += facts.critical.length; criticalAudits += Number(facts.critical.length > 0);
    withViolations += Number(facts.failed.length > 0); clean += Number(facts.answers.length > 0 && facts.failed.length === 0);
    answers += facts.answers.length; penalties += facts.failed.reduce((sum, answer) => sum + answer.penalty, 0);
    for (const answer of facts.answers) {
      photos += answer.photos.length; failedWithPhotos += Number(!answer.isOk && answer.photos.length > 0);
      requiredPhotos += Number(answer.photoRequired); missingRequiredPhotos += Number(answer.photoRequired && answer.photos.length === 0);
      unmatchedAnswers += Number(!answer.matched);
    }
  }
  return { totalAudits: audits.length, qualityPct: dashboardPct(score, max), score, max, scoredAudits: scored, violations, criticalViolations: critical, criticalAudits, auditsWithViolations: withViolations,
    cleanAudits: clean, cleanPct: dashboardPct(clean, audits.length), answers, penaltyPoints: penalties, photos, failedWithPhotos,
    evidencePct: dashboardPct(failedWithPhotos, violations), requiredPhotos, missingRequiredPhotos, unmatchedAnswers,
    unknownScores: audits.length - scored, emptyAudits: audits.filter(audit => !audit.answers.length).length };
}
export function buildDashboardMetrics(audits: DashboardAudit[], previous: DashboardAudit[], timeZone: string, comparable: boolean, range?: { gte?: Date; lte?: Date }) {
  audits = [...audits].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
  const cache = new WeakMap<DashboardAudit, ReturnType<typeof dashboardAuditFacts>>();
  const factsOf = (audit: DashboardAudit) => {
    let facts = cache.get(audit);
    if (!facts) { facts = dashboardAuditFacts(audit); cache.set(audit, facts); }
    return facts;
  };
  const byLocation = new Map<string, DashboardAudit[]>();
  for (const audit of audits) {
    const key = factsOf(audit).locationKey, rows = byLocation.get(key) || [];
    rows.push(audit); byLocation.set(key, rows);
  }
  const summary = totals(audits, factsOf), prev = totals(previous, factsOf);
  const change = (current: number, before: number) => comparable && before > 0 ? round((current - before) / before * 100) : null;
  const qualityDelta = comparable && summary.qualityPct !== null && prev.qualityPct !== null ? round(summary.qualityPct - prev.qualityPct) : null;
  const currentProblems = problemsOf(audits, factsOf), prevProblems = problemsOf(previous, factsOf);
  const problemStats = [...currentProblems.values()].filter(row => row.failed.size).map(row => {
    const prior = prevProblems.get(row.key), pct = dashboardPct(row.failed.size, row.checked.size)!;
    const prevPct = prior ? dashboardPct(prior.failed.size, prior.checked.size) : null;
    return { key: row.key, question: row.question, section: row.section, checklist: row.checklist, count: row.failed.size, checkedAudits: row.checked.size, pct,
      incidents: row.incidents, locations: row.locations.size, repeatedLocations: [...row.locations.values()].filter(ids => ids.size > 1).length,
      criticalCount: row.critical, penaltyPoints: row.penalty, photos: row.photos, comments: row.comments, lastAuditId: row.lastAuditId,
      prevCount: prior?.failed.size || 0, prevPct, delta: comparable ? row.failed.size - (prior?.failed.size || 0) : null,
      deltaRate: comparable && prevPct !== null ? round(pct - prevPct) : null };
  }).sort((a, b) => b.criticalCount - a.criticalCount || b.count - a.count || b.penaltyPoints - a.penaltyPoints);
  const groups = <T,>(keyOf: (audit: DashboardAudit) => string, describe: (audit: DashboardAudit) => T) => {
    const map = new Map<string, { meta: T; audits: DashboardAudit[] }>();
    for (const audit of audits) { const key = keyOf(audit), value = map.get(key) || { meta: describe(audit), audits: [] }; value.audits.push(audit); map.set(key, value); }
    return [...map].map(([key, group]) => ({ key, ...group.meta, ...totals(group.audits, factsOf) }));
  };
  const locationStats = groups(audit => factsOf(audit).locationKey, audit => { const facts = factsOf(audit); return { id: audit.locationId, name: facts.name, address: audit.location?.address || '', tu: facts.tu }; }).map(row => {
    const group = byLocation.get(row.key)!;
    const latest = group[group.length - 1], facts = factsOf(latest);
    const repeatedProblems = problemStats.filter(problem => (currentProblems.get(problem.key)?.locations.get(row.key)?.size || 0) > 1).length;
    return { ...row, latestAuditId: latest.id, latestDate: latest.date.toISOString(), latestPct: facts.pct, latestZone: facts.zone, repeatedProblems,
      redAudits: group.filter(audit => factsOf(audit).zone === 'red').length };
  }).sort((a, b) => b.criticalViolations - a.criticalViolations || (a.qualityPct ?? 101) - (b.qualityPct ?? 101));
  const auditorStats = groups(audit => audit.userId || `deleted:${factsOf(audit).auditor}`, audit => ({ name: factsOf(audit).auditor }));
  const checklistStats = groups(audit => audit.checklistVersion.checklistId, audit => ({ name: audit.checklistVersion.checklist.title }));
  const sections = new Map<string, { key: string; name: string; checklist: string; answers: number; violations: number; critical: number; penalties: number }>();
  for (const audit of audits) for (const answer of factsOf(audit).answers) {
    const key = JSON.stringify([audit.checklistVersion.checklistId, answer.zone]);
    const row = sections.get(key) || { key, name: answer.zone, checklist: audit.checklistVersion.checklist.title, answers: 0, violations: 0, critical: 0, penalties: 0 };
    row.answers++; if (!answer.isOk) { row.violations++; row.critical += Number(answer.critical); row.penalties += answer.penalty; } sections.set(key, row);
  }
  const sectionStats = [...sections.values()].map(row => ({ ...row, failurePct: dashboardPct(row.violations, row.answers) })).sort((a, b) => b.critical - a.critical || b.violations - a.violations);
  const start = range?.gte || audits[0]?.date, end = range?.lte || audits[audits.length - 1]?.date;
  const span = start && end ? (end.getTime() - start.getTime()) / 86400000 : 0;
  const trendType = span > 365 ? 'По годам' : span > 60 ? 'По месяцам' : 'По дням';
  const buckets = new Map<string, { date: string; count: number; score: number; max: number; violations: number; critical: number }>();
  if (start && end) {
    const cursor = reportCalendarDate(start, timeZone), last = reportCalendarDate(end, timeZone);
    if (span > 365) { cursor.setUTCMonth(0, 1); } else if (span > 60) cursor.setUTCDate(1);
    while (cursor <= last) {
      const day = cursor.toISOString().slice(0, 10), key = span > 365 ? day.slice(0, 4) : span > 60 ? day.slice(0, 7) : day;
      const date = span > 365 ? key : span > 60 ? `${key.slice(5, 7)}.${key.slice(0, 4)}` : `${day.slice(8)}.${day.slice(5, 7)}`;
      buckets.set(key, { date, count: 0, score: 0, max: 0, violations: 0, critical: 0 });
      if (span > 365) cursor.setUTCFullYear(cursor.getUTCFullYear() + 1); else if (span > 60) cursor.setUTCMonth(cursor.getUTCMonth() + 1); else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const weeks = new Map<string, { score: number; max: number }>(), months = new Map<string, { score: number; max: number }>();
  const zones = { green: 0, yellow: 0, red: 0, unknown: 0 };
  for (const audit of audits) {
    const facts = factsOf(audit), date = reportCalendarDate(audit.date, timeZone), day = date.toISOString().slice(0, 10);
    zones[facts.zone]++;
    const key = span > 365 ? day.slice(0, 4) : span > 60 ? day.slice(0, 7) : day;
    const label = span > 365 ? key : span > 60 ? `${key.slice(5, 7)}.${key.slice(0, 4)}` : `${day.slice(8)}.${day.slice(5, 7)}`;
    const row = buckets.get(key) || { date: label, count: 0, score: 0, max: 0, violations: 0, critical: 0 };
    row.count++; row.violations += facts.failed.length; row.critical += facts.critical.length;
    if (facts.validScore) { row.score += audit.score; row.max += facts.max; }
    buckets.set(key, row);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    for (const [map, bucket] of [[weeks, date.toISOString().slice(0, 10)], [months, day.slice(0, 7)]] as const) {
      const point = map.get(bucket) || { score: 0, max: 0 }; if (facts.validScore) { point.score += audit.score; point.max += facts.max; } map.set(bucket, point);
    }
  }
  const trendData = [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => ({ date: row.date, count: row.count, pct: dashboardPct(row.score, row.max), violations: row.violations, critical: row.critical }));
  const rank = [...locationStats].filter(row => row.qualityPct !== null).sort((a, b) => b.qualityPct! - a.qualityPct!);
  const records = [...audits].reverse().map(audit => {
    const facts = factsOf(audit);
    return { id: audit.id, date: audit.date.toISOString(), location: facts.name, address: audit.location?.address || '', tu: facts.tu, auditor: facts.auditor,
      checklist: audit.checklistVersion.checklist.title, version: audit.checklistVersion.version, score: audit.score, maxScore: audit.maxScore,
      pct: facts.pct, zone: facts.zone, answers: facts.answers.length, violations: facts.failed.length, critical: facts.critical.length,
      photos: facts.answers.reduce((sum, answer) => sum + answer.photos.length, 0), comment: audit.generalComment || '', shiftEmployees: audit.shiftEmployees };
  });
  return { totalAudits: summary.totalAudits, avgScore: audits.length ? round(audits.reduce((sum, audit) => sum + audit.score, 0) / audits.length) : 0, avgPct: summary.qualityPct ?? 0,
    summary: { ...summary, affectedLocations: locationStats.filter(row => row.violations > 0).length, repeatedProblems: problemStats.filter(row => row.repeatedLocations > 0).length },
    comparison: { available: comparable, previous: prev, totalChangePct: change(summary.totalAudits, prev.totalAudits), qualityDelta, violationChangePct: change(summary.violations, prev.violations), criticalDelta: comparable && previous.length ? summary.criticalViolations - prev.criticalViolations : null },
    trends: { total: change(summary.totalAudits, prev.totalAudits), score: qualityDelta },
    zones: [{ name: 'Зелёная зона', value: zones.green, fill: '#22a06b' }, { name: 'Жёлтая зона', value: zones.yellow, fill: '#e5a119' }, { name: 'Красная зона', value: zones.red, fill: '#e34c59' }], unknownZone: zones.unknown,
    trendData, trendType, wowData: [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([day, point]) => ({ date: `${day.slice(8)}.${day.slice(5, 7)}`, pct: dashboardPct(point.score, point.max) })),
    momData: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, point]) => ({ date: `${month.slice(5)}.${month.slice(0, 4)}`, pct: dashboardPct(point.score, point.max) })),
    topLocations: rank.slice(0, 5).map(row => ({ name: row.name, avg: row.totalAudits ? round(row.score / row.totalAudits) : 0, avgPct: row.qualityPct })),
    bottomLocations: rank.slice(-5).reverse().map(row => ({ name: row.name, avg: row.totalAudits ? round(row.score / row.totalAudits) : 0, avgPct: row.qualityPct })),
    locationStats, problemStats, sectionStats, auditorStats, checklistStats, records,
    report: { failedLocations: locationStats.filter(row => row.redAudits > 0).map(row => ({ name: row.name, score: row.score, maxScore: row.max, pct: row.qualityPct, tu: row.tu, criticalCount: row.criticalViolations })),
      problems: problemStats, criticalViolations: locationStats.filter(row => row.criticalViolations > 0).map(row => ({ locationName: row.name, tu: row.tu, questions: problemStats.filter(problem => currentProblems.get(problem.key)?.criticalLocations.has(row.key)).map(problem => problem.question) })) } };
}
export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;
