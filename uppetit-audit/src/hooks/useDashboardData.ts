'use client';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import { serializeReportRange } from '@/lib/reportDates';

export function useDashboardData<T>(endpoint: string, from: string, to: string, checklistIds: string[], enabled = true, extra?: { locationIds: string[]; auditorIds: string[]; tuIds: string[]; auditPage: number }) {
  const { data: session, status } = useSession();
  let validationError = '', range = { from: '', to: '' };
  try { range = serializeReportRange(from, to); }
  catch (error) { validationError = error instanceof Error ? error.message : 'Проверьте выбранный период'; }
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  if (checklistIds.length) params.set('checklistIds', [...checklistIds].sort().join(','));
  if (extra) {
    for (const key of ['locationIds', 'auditorIds', 'tuIds'] as const) for (const id of [...extra[key]].sort()) params.append(key, id);
    params.set('auditPage', String(extra.auditPage));
  }
  if (typeof window !== 'undefined') params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    enabled && session && !validationError ? [`${endpoint}?${params}`, session.user.id, session.user.role] : null,
    ([url]: [string, string, string]) => fetcher(url), { keepPreviousData: true });
  return { data: data ?? null, error: validationError || (error instanceof Error ? error.message : error ? 'Не удалось загрузить аналитику' : ''),
    isLoading: status === 'loading' || isLoading, isFetching: isValidating || isLoading, refresh: mutate };
}
