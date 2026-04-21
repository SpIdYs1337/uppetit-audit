import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';

export function useTuLocations() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { data: allLocations, isLoading: locLoading } = useSWR<any[]>('/api/locations', fetcher);
  const { data: allAudits, isLoading: audLoading } = useSWR<any[]>('/api/audits', fetcher);

  // Оставляем только точки, привязанные к этому ТУ
  const myLocations = allLocations?.filter(loc => loc.tuId === userId) || [];
  const myLocationIds = myLocations.map(l => l.id);

  // Оставляем только аудиты по точкам этого ТУ
  const myAudits = allAudits?.filter(aud => myLocationIds.includes(aud.locationId)) || [];

  return {
    locations: myLocations,
    audits: myAudits,
    isLoading: status === 'loading' || locLoading || audLoading,
  };
}