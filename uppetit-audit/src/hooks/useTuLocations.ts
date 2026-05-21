import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';

// ИЗМЕНЕНО: Импортируем правильные типы из соседних хуков
import { EnrichedLocation } from '@/hooks/useNewAudit';
import { EnrichedAudit } from '@/hooks/useAdminAudits';

export function useTuLocations() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  // ИЗМЕНЕНО: Передаем строгий тип EnrichedLocation
  const { data: allLocations, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: allAudits, isLoading: audLoading } = useSWR<EnrichedAudit[]>('/api/audits', fetcher);

  // ИЗМЕНЕНО: Ищем ТУ и в старом поле, и в новом массиве (чтобы поддерживать точки с двумя и более ТУ)
  const myLocations = allLocations?.filter(loc => {
    const hasLegacyTu = loc.tuId === userId;
    const hasNewTu = Array.isArray(loc.tus) && loc.tus.some(tu => tu.id === userId);
    return hasLegacyTu || hasNewTu;
  }) || [];
  
  const myLocationIds = myLocations.map(l => l.id);

  // Отбираем аудиты, которые были проведены на точках этого ТУ
  const myAudits = allAudits?.filter(aud => aud.locationId && myLocationIds.includes(aud.locationId)) || [];

  return {
    locations: myLocations,
    audits: myAudits,
    isLoading: status === 'loading' || locLoading || audLoading,
  };
}