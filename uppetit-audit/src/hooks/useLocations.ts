import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Location, User, Audit } from '@prisma/client';

export type EnrichedLocation = Location & { audits?: Audit[], tus?: User[], tu?: User };

export function useLocations() {
  const { data: locations, mutate, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const tus = users?.filter(u => u.role === 'TU') || [];

  const createLocation = async (data: { name: string; address: string | null; tuIds: string[] }) => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Ошибка при создании');
    mutate(); 
  };

  const updateLocation = async (id: string, data: Partial<Location> & { tuIds?: string[] }) => {
    mutate(); // Оптимистично запускаем рефетч
    
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
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