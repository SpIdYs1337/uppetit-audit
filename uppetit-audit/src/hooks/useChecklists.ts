import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Checklist } from '@prisma/client';

export type ExtendedChecklist = Checklist & { items?: string | ExtendedChecklist[] };

export function useChecklists() {
  const { data: checklists, error, isLoading, mutate } = useSWR<ExtendedChecklist[]>('/api/checklists', fetcher);

  const saveChecklist = async (body: Partial<ExtendedChecklist>, isUpdate: boolean) => {
    const res = await fetch('/api/checklists', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error('Ошибка при сохранении');
    
    mutate(); 
    return res.json();
  };

  const deleteChecklist = async (id: string) => {
    const res = await fetch(`/api/checklists?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка при удалении');
    
    mutate(checklists?.filter(c => c.id !== id), false);
  };

  return {
    checklists: checklists || [],
    isLoading,
    isError: !!error,
    saveChecklist,
    deleteChecklist,
    mutate
  };
}