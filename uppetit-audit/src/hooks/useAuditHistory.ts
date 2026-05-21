import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
// ИЗМЕНЕНО: Берем единый, строгий тип из нашего главного файла
import { EnrichedAudit } from '@/hooks/useAdminAudits'; 

export function useAuditHistory() {
  const sessionContext = useSession();
  
  // Безопасно достаем данные, проверяя наличие контекста
  const session = sessionContext?.data;
  const status = sessionContext?.status;
  const userId = session?.user?.id;

  // Передаем наш единый тип в SWR
  const { data: audits, error, isLoading } = useSWR<EnrichedAudit[]>(
    userId ? '/api/audits' : null, 
    fetcher
  );

  // Оставляем только те аудиты, которые провел текущий пользователь
  const myAudits = audits?.filter(a => a.userId === userId) || [];

  return {
    audits: myAudits,
    isLoading: isLoading || status === 'loading',
    isError: !!error,
  };
}