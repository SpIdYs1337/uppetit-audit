import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Audit } from '@prisma/client';

export interface ParsedAnswer {
  id: string;
  zone?: string;
  question: string;
  isOk: boolean;
  penalty: number;
  comment?: string;
  photos?: string[];
  photoBase64?: string;
}

export type EnrichedAudit = Audit & {
  location?: { 
    id: string; 
    name: string;
    tus?: { id: string; name: string | null; login: string }[]; // <-- ДОБАВЛЕНО
  } | null;
  user?: { id: string; login: string } | null;
  checklist?: { id: string; title: string; version: number } | null;
  answers: ParsedAnswer[];
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