'use client';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import { serializeReportRange } from '@/lib/reportDates';
import type { AuditFilters } from '@/lib/auditHistory';
import type { EnrichedAudit } from '@/hooks/useAdminAudits';

export type HistoryQuery = { page: number; pageSize: number; sort: 'asc' | 'desc'; search: string; dateFrom: string; dateTo: string; locations: string[]; auditors: string[]; tus: string[]; auditId?: string };
export type HistoryPage = { audits: EnrichedAudit[]; total: number; page: number; pageSize: number; totalPages: number };
type FilterOptions = { locations: string[]; auditors: string[]; tus: string[] };

export function usePagedAudits(query: HistoryQuery, scope: AuditFilters['scope'] = 'accessible') {
  const { data: session, status } = useSession();
  let validationError = '', range = { from: '', to: '' };
  try { range = serializeReportRange(query.dateFrom, query.dateTo); }
  catch (error) { validationError = error instanceof Error ? error.message : 'Проверьте выбранный период'; }
  const filters: AuditFilters = { ...range, search: query.search, locations: query.locations, auditors: query.auditors, tus: query.tus, scope, auditId: query.auditId };
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), sort: query.sort, scope });
  if (query.auditId) params.set('auditId', query.auditId);
  for (const key of ['from', 'to', 'search'] as const) if (filters[key]) params.set(key, filters[key]);
  for (const key of ['locations', 'auditors', 'tus'] as const) filters[key].forEach(value => params.append(key, value));
  const identity = session ? `${session.user.id}:${session.user.role}` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<HistoryPage>(
    identity && !validationError ? [`/api/audits?${params}`, identity] : null,
    ([url]: [string, string]) => fetcher(url));
  const options = useSWR<FilterOptions>(identity ? [`/api/audits/filters?scope=${scope}`, identity] : null,
    ([url]: [string, string]) => fetcher(url));
  const remove = async (id?: string) => {
    const response = await fetch(id ? `/api/audits?id=${encodeURIComponent(id)}` : '/api/audits?clearAll=true', { method: 'DELETE' });
    if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Не удалось удалить аудит'); }
    await Promise.all([mutate(), options.mutate()]);
  };
  return {
    audits: data?.audits ?? [], total: data?.total ?? 0, page: data?.page ?? query.page, totalPages: data?.totalPages ?? 1,
    isLoading: status === 'loading' || isLoading, isValidating,
    error: validationError || (error instanceof Error ? error.message : error ? 'Не удалось загрузить историю' : ''),
    options: options.data ?? { locations: [], auditors: [], tus: [] }, optionsError: Boolean(options.error),
    filters, refresh: mutate, deleteAudit: (id: string) => remove(id), clearHistory: () => remove(),
  };
}
