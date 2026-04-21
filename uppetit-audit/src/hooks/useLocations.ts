import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export interface Audit { id: string; date: string; score: number; maxScore?: number | null; checklist: { title: string } }
export interface Location {
  id: string; name: string; address: string | null; isActive: boolean;
  activeFrom: string | null; activeTo: string | null; tuId: string | null; audits?: Audit[];
}
export interface User { id: string; login: string; role: string; }

export function useLocations() {
  const { data: locations, mutate, isLoading: locLoading } = useSWR<Location[]>('/api/locations', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const tus = users?.filter(u => u.role === 'TU') || [];

  const createLocation = async (data: { name: string; address: string | null }) => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Ошибка при создании');
    mutate(); // Обновляем кэш
  };

  const updateLocation = async (id: string, data: Partial<Location>) => {
    // Оптимистичное обновление: сразу меняем UI
    mutate(locations?.map(loc => loc.id === id ? { ...loc, ...data } : loc), false);
    
    // Отправляем на наш новый PATCH-роут
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      mutate(); // Если ошибка - откатываем UI обратно
      throw new Error('Ошибка обновления');
    }
    mutate(); 
  };

  const deleteLocation = async (id: string) => {
    mutate(locations?.filter(loc => loc.id !== id), false);
    const res = await fetch('/api/locations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) {
      mutate(); 
      throw new Error('Ошибка удаления');
    }
  };

  return {
    locations: locations || [],
    tus,
    isLoading: locLoading || usersLoading,
    createLocation,
    updateLocation,
    deleteLocation
  };
}