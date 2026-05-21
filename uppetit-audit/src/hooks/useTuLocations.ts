import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
// ИСПРАВЛЕНО: Импортируем типы из нашего централизованного хака типов
import { EnrichedLocation, EnrichedAudit } from '@/hooks/useAdminAudits'; 

export function useTuLocations() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { data: allLocations, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: allAudits, isLoading: audLoading } = useSWR<EnrichedAudit[]>('/api/audits', fetcher);

  // ИСПРАВЛЕНО: Параметр 'tu' строго типизирован, чтобы компилятор не падал на неявном 'any'
  const myLocations = allLocations?.filter(loc => {
    const hasLegacyTu = loc.tuId === userId;
    const hasNewTu = Array.isArray(loc.tus) && loc.tus.some((tu: any) => tu.id === userId);
    return hasLegacyTu || hasNewTu;
  }) || [];
  
  const myLocationIds = myLocations.map(l => l.id);

  const myAudits = allAudits?.filter(aud => aud.locationId && myLocationIds.includes(aud.locationId)) || [];

  return {
    locations: myLocations,
    audits: myAudits,
    isLoading: status === 'loading' || locLoading || audLoading,
  };
}