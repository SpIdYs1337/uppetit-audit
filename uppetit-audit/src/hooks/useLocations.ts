import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Location, User, Audit } from '@prisma/client';

export type EnrichedLocation = Location & { audits?: Audit[] };

export function useLocations() {
  const { data: locations, mutate, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const tus = users?.filter(u => u.role === 'TU') || [];

  const createLocation = async (data: { name: string; address: string | null }) => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Ошибка при создании');
    mutate(); 
  };

  const updateLocation = async (id: string, data: Partial<Location>) => {
    mutate(locations?.map(loc => loc.id === id ? { ...loc, ...data } as EnrichedLocation : loc), false);
    
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      mutate(); 
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