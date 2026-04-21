import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';

export function useAuditHistory() {
  // Получаем сессию на клиенте реактивно (без асинхронного getSession)
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  // SWR не начнет запрос, пока у нас нет userId (передаем null вместо URL)
  const { data: audits, error, isLoading } = useSWR<any[]>(
    userId ? '/api/audits' : null, 
    fetcher
  );

  // Фильтруем только аудиты текущего пользователя
  const myAudits = audits?.filter(a => a.userId === userId) || [];

  return {
    audits: myAudits,
    // Считаем загрузку активной, пока грузится сессия ИЛИ грузятся данные из API
    isLoading: isLoading || status === 'loading',
    isError: !!error,
  };
}