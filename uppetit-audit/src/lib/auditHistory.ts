import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { auditAccessWhere, type Actor } from '@/lib/accessControl';
import { parseReportRange } from '@/lib/reportDates';

const names = z.array(z.string().trim().min(1).max(300)).max(100).default([]);
export const auditFiltersSchema = z.object({
  from: z.string().max(40).default(''),
  to: z.string().max(40).default(''),
  search: z.string().trim().max(200).default(''),
  auditId: z.string().max(200).optional(),
  locations: names,
  auditors: names,
  tus: names,
  scope: z.enum(['accessible', 'mine']).default('accessible'),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;

export function filtersFromParams(params: URLSearchParams): AuditFilters {
  return auditFiltersSchema.parse({
    from: params.get('from') ?? '', to: params.get('to') ?? '',
    search: params.get('search') ?? '', scope: params.get('scope') ?? 'accessible',
    auditId: params.get('auditId') || undefined,
    locations: params.getAll('locations'), auditors: params.getAll('auditors'), tus: params.getAll('tus'),
  });
}

export function historyScope(actor: Actor, scope: AuditFilters['scope']): Prisma.AuditWhereInput {
  return { AND: [auditAccessWhere(actor), ...(scope === 'mine' ? [{ userId: actor.id }] : [])] };
}

export function historyWhere(actor: Actor, filters: AuditFilters): Prisma.AuditWhereInput {
  const AND: Prisma.AuditWhereInput[] = [historyScope(actor, filters.scope)];
  if (filters.auditId) AND.push({ id: filters.auditId });
  const date = parseReportRange(filters.from, filters.to);
  if (date.gte || date.lte) AND.push({ date });
  if (filters.locations.length) AND.push({ OR: [
    { locationName: { in: filters.locations } },
    { AND: [{ OR: [{ locationName: null }, { locationName: '' }] }, { location: { name: { in: filters.locations } } }] },
    ...(filters.locations.includes('Удаленная точка') ? [{ AND: [{ OR: [{ locationName: null }, { locationName: '' }] }, { locationId: null }] }] : []),
  ] });
  if (filters.auditors.length) AND.push({ OR: [
    { auditorName: { in: filters.auditors } },
    { AND: [{ OR: [{ auditorName: null }, { auditorName: '' }] }, { user: { OR: [
      { name: { in: filters.auditors } },
      { AND: [{ OR: [{ name: null }, { name: '' }] }, { login: { in: filters.auditors } }] },
    ] } }] },
    ...(filters.auditors.includes('Удаленный аудитор') ? [{ AND: [{ OR: [{ auditorName: null }, { auditorName: '' }] }, { userId: null }] }] : []),
  ] });
  if (filters.tus.length) AND.push({ OR: filters.tus.flatMap(name => [
    { tuName: name }, { tuName: { startsWith: `${name}, ` } },
    { tuName: { endsWith: `, ${name}` } }, { tuName: { contains: `, ${name}, ` } },
    { AND: [{ OR: [{ tuName: null }, { tuName: '' }] }, { location: { tus: { some: { OR: [{ name }, { login: name }] } } } }] },
    ...(name === 'Не был назначен' ? [{ AND: [{ OR: [{ tuName: null }, { tuName: '' }] }, { OR: [{ locationId: null }, { location: { tus: { none: {} } } }] }] }] : []),
  ]) });
  if (filters.search) AND.push({ OR: [
    { locationName: { contains: filters.search, mode: 'insensitive' } },
    { auditorName: { contains: filters.search, mode: 'insensitive' } },
    { tuName: { contains: filters.search, mode: 'insensitive' } },
    { location: { name: { contains: filters.search, mode: 'insensitive' } } },
    { user: { OR: [{ name: { contains: filters.search, mode: 'insensitive' } }, { login: { contains: filters.search, mode: 'insensitive' } }] } },
    { checklistVersion: { checklist: { title: { contains: filters.search, mode: 'insensitive' } } } },
  ] });
  return { AND };
}

export const historyInclude = {
  user: { select: { id: true, login: true, name: true } },
  location: { select: { id: true, name: true, tus: { select: { id: true, name: true, login: true } } } },
  checklistVersion: { include: { checklist: { select: { id: true, title: true, redThreshold: true, yellowThreshold: true } } } },
  answers: true,
} satisfies Prisma.AuditInclude;

type HistoryAudit = Prisma.AuditGetPayload<{ include: typeof historyInclude }>;
export function formatHistoryAudit(audit: HistoryAudit) {
  return {
    ...audit,
    location: audit.location ?? { id: 'deleted', name: audit.locationName || 'Удаленная точка', tus: [] },
    user: { id: audit.user?.id ?? 'deleted', login: audit.auditorName || audit.user?.name || audit.user?.login || 'Удаленный аудитор' },
    checklist: { ...audit.checklistVersion.checklist, version: audit.checklistVersion.version },
  };
}
