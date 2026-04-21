import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useAdminAudits() {
  // SWR автоматически кеширует данные и обновляет их при фокусе окна
  const { data: audits, error, isLoading, mutate } = useSWR<any[]>('/api/audits', fetcher);

  const deleteAudit = async (id: string) => {
    const res = await fetch(`/api/audits?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка сервера');
    
    // Оптимистичное обновление: удаляем локально до ответа сервера
    mutate(audits?.filter(a => a.id !== id), false);
  };

  const clearHistory = async () => {
    const res = await fetch(`/api/audits?clearAll=true`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка сервера');
    
    // Мгновенно очищаем таблицу на экране
    mutate([], false);
  };

  return {
    audits: audits || [],
    isLoading,
    isError: !!error,
    deleteAudit,
    clearHistory
  };
}