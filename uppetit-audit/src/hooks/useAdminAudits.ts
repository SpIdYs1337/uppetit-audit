import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Audit, Location, User, Checklist } from '@prisma/client';

export type EnrichedAudit = Audit & {
  location?: Location | null;
  user?: User | null;
  checklist?: Checklist | null;
};

export function useAdminAudits() {
  const { data: audits, error, isLoading, mutate } = useSWR<EnrichedAudit[]>('/api/audits', fetcher);

  const deleteAudit = async (id: string) => {
    const res = await fetch(`/api/audits?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка сервера');
    
    mutate(audits?.filter(a => a.id !== id), false);
  };

  const clearHistory = async () => {
    const res = await fetch(`/api/audits?clearAll=true`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка сервера');
    
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