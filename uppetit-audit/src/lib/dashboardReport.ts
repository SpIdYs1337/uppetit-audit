import { z } from 'zod';
import { type Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { managedLocationWhere } from '@/lib/accessControl';
import { parseReportRange } from '@/lib/reportDates';
import { locationIsAvailable } from '@/lib/locationAvailability';
import { buildDashboardMetrics } from '@/lib/dashboardMetrics';

const ids = z.array(z.string().trim().min(1).max(200)).max(100).default([]);
export const dashboardFiltersSchema = z.object({
  from: z.string().max(40).nullable().optional(), to: z.string().max(40).nullable().optional(),
  timeZone: z.string().max(80).default('UTC'), checklistIds: ids, locationIds: ids, auditorIds: ids, tuIds: ids,
  auditPage: z.coerce.number().int().min(1).max(1000000).default(1),
});
export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
export function dashboardFiltersFromParams(params: URLSearchParams) {
  return dashboardFiltersSchema.parse({ from: params.get('from'), to: params.get('to'), timeZone: params.get('timeZone') || 'UTC',
    checklistIds: (params.get('checklistIds') || '').split(',').filter(Boolean), locationIds: params.getAll('locationIds'), auditorIds: params.getAll('auditorIds'), tuIds: params.getAll('tuIds'), auditPage: params.get('auditPage') || 1 });
}
export function dashboardRange(filters: DashboardFilters) {
  new Intl.DateTimeFormat('ru-RU', { timeZone: filters.timeZone });
  const date = parseReportRange(filters.from, filters.to);
  // An unbounded period has no arbitrary comparison. Both explicit bounds are required.
  const previous = date.gte && date.lte ? { gte: new Date(date.gte.getTime() - (date.lte.getTime() - date.gte.getTime() + 1)), lte: new Date(date.gte.getTime() - 1) } : null;
  return { date, previous };
}
const person = { id: true, name: true, login: true } as const;
export const dashboardAuditSelect = {
  id: true, date: true, score: true, maxScore: true, userId: true, locationId: true, locationName: true, auditorName: true, tuName: true, shiftEmployees: true, generalComment: true,
  user: { select: person }, location: { select: { name: true, address: true, tus: { select: person }, tu: { select: person } } },
  checklistVersion: { select: { version: true, checklistId: true, checklist: { select: { title: true, redThreshold: true, yellowThreshold: true } },
    items: { select: { id: true, text: true, zone: true, isCritical: true, score: true, photoRequirement: true } } } },
  answers: { select: { id: true, itemId: true, question: true, zone: true, isOk: true, penalty: true, comment: true, photos: true } },
} satisfies Prisma.AuditSelect;
const optionSelect = { locationId: true, userId: true, locationName: true, auditorName: true, user: { select: person }, location: { select: { name: true, tus: { select: person }, tu: { select: person } } },
  checklistVersion: { select: { checklistId: true, checklist: { select: { title: true } } } } } satisfies Prisma.AuditSelect;
export function dashboardWhere(filters: DashboardFilters, territoryUserId?: string): Prisma.AuditWhereInput {
  const scope: Prisma.AuditWhereInput = territoryUserId ? { OR: [{ location: { tus: { some: { id: territoryUserId } } } }, { location: { tuId: territoryUserId } }] } : {};
  const AND: Prisma.AuditWhereInput[] = [];
  if (filters.checklistIds.length) AND.push({ checklistVersion: { checklistId: { in: filters.checklistIds } } });
  if (filters.locationIds.length) AND.push({ locationId: { in: filters.locationIds } });
  if (filters.auditorIds.length) AND.push({ userId: { in: filters.auditorIds } });
  if (filters.tuIds.length) AND.push({ location: { OR: [{ tus: { some: { id: { in: filters.tuIds } } } }, { tuId: { in: filters.tuIds } }] } });
  return { ...scope, ...(AND.length ? { AND } : {}) };
}
export async function loadDashboardReport(filters: DashboardFilters, territoryUserId?: string) {
  const { date, previous } = dashboardRange(filters);
  const where = dashboardWhere(filters, territoryUserId);
  const optionWhere: Prisma.AuditWhereInput = { ...dashboardWhere(dashboardFiltersSchema.parse({}), territoryUserId), ...(date.gte || date.lte ? { date } : {}) };
  const locationWhere: Prisma.LocationWhereInput = { AND: [territoryUserId ? managedLocationWhere(territoryUserId) : {},
    ...(filters.locationIds.length ? [{ id: { in: filters.locationIds } }] : []),
    ...(filters.tuIds.length ? [{ OR: [{ tus: { some: { id: { in: filters.tuIds } } } }, { tuId: { in: filters.tuIds } }] }] : [])] };
  const source = await prisma.$transaction(async db => {
    const [audits, prior, locations, options] = await Promise.all([
      db.audit.findMany({ where: { ...where, ...(date.gte || date.lte ? { date } : {}) }, select: dashboardAuditSelect, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
      previous ? db.audit.findMany({ where: { ...where, date: previous }, select: dashboardAuditSelect, orderBy: [{ date: 'asc' }, { id: 'asc' }] }) : Promise.resolve([]),
      db.location.findMany({ where: locationWhere, select: { id: true, name: true, address: true, isActive: true, activeFrom: true, activeTo: true } }),
      db.audit.findMany({ where: optionWhere, select: optionSelect }),
    ]);
    return { audits, prior, locations, options };
  }, { isolationLevel: 'RepeatableRead' });
  const metrics = buildDashboardMetrics(source.audits, source.prior, filters.timeZone, !!previous, date);
  const maps = { checklists: new Map<string, string>(), locations: new Map<string, string>(), auditors: new Map<string, string>(), tus: new Map<string, string>() };
  for (const audit of source.options) {
    maps.checklists.set(audit.checklistVersion.checklistId, audit.checklistVersion.checklist.title);
    if (audit.locationId) maps.locations.set(audit.locationId, audit.locationName || audit.location?.name || 'Точка');
    if (audit.userId) maps.auditors.set(audit.userId, audit.auditorName || audit.user?.name || audit.user?.login || 'Аудитор');
    for (const tu of [...(audit.location?.tus || []), ...(audit.location?.tu ? [audit.location.tu] : [])]) maps.tus.set(tu.id, tu.name || tu.login);
  }
  for (const location of source.locations) maps.locations.set(location.id, location.name);
  const options = Object.fromEntries(Object.entries(maps).map(([key, map]) => [key, [...map].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, 'ru'))])) as Record<keyof typeof maps, { id: string; title: string }[]>;
  const active = source.locations.filter(location => locationIsAvailable(location));
  const visitedIds = new Set(source.audits.map(audit => audit.locationId));
  const visited = active.filter(location => visitedIds.has(location.id));
  const pageSize = 25, totalPages = Math.max(1, Math.ceil(metrics.records.length / pageSize)), page = Math.min(filters.auditPage, totalPages);
  const { records, ...visibleMetrics } = metrics;
  const report = { ...visibleMetrics, availableChecklists: options.checklists, options,
    coverage: { checkedLocations: metrics.locationStats.length, activeLocations: active.length, visitedActiveLocations: visited.length, pct: active.length ? Math.round(visited.length / active.length * 1000) / 10 : null,
      unvisited: active.filter(location => !visitedIds.has(location.id)).map(location => ({ id: location.id, name: location.name, address: location.address || '' })) },
    auditRecords: { items: records.slice((page - 1) * pageSize, page * pageSize), total: records.length, page, pageSize },
    metadata: { generatedAt: new Date().toISOString(), from: filters.from || '', to: filters.to || '', timeZone: filters.timeZone,
      previousFrom: previous?.gte.toISOString() || null, previousTo: previous?.lte.toISOString() || null },
  };
  return { report, audits: source.audits, allRecords: records };
}
export type DashboardReport = Awaited<ReturnType<typeof loadDashboardReport>>['report'];
