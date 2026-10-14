import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import type { EnrichedLocation } from '@/hooks/useAdminAudits';

export function useTuLocations() {
  const { data: session, status } = useSession();
  const identity = session ? `${session.user.id}:${session.user.role}` : null;
  const { data, error, isLoading, mutate } = useSWR<EnrichedLocation[]>(
    identity ? ['/api/locations', identity] : null,
    ([url]: [string, string]) => fetcher(url));
  const locations = (data || []).filter(location => location.tuId === session?.user.id
    || location.tus?.some(tu => tu.id === session?.user.id));
  return { locations, error: error instanceof Error ? error.message : error ? 'Не удалось загрузить точки' : '',
    isLoading: status === 'loading' || isLoading, refresh: mutate };
}
