'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import type { Location, User } from '@prisma/client';
import { useUsers } from './useUsers';

export type LocationManager = Pick<User, 'id' | 'name' | 'login'>;
export type EnrichedLocation = Location & { audits?: { score: number }[]; tus?: LocationManager[]; tu?: LocationManager | null };
export type LocationChanges = { name?: string; address?: string | null; tuIds?: string[]; isActive?: boolean; activeFrom?: string | null; activeTo?: string | null };
export const assignedManagers = (location: EnrichedLocation) => [...new Map([...(location.tus || []), ...(location.tu ? [location.tu] : [])].map(t => [t.id, t])).values()];

export function useLocations() {
  const { data: session } = useSession();
  const { data: locations, mutate, isLoading, error } = useSWR<EnrichedLocation[]>(session?.user ? ['/api/locations', session.user.id, session.user.role] : null, ([url]: [string, string, string]) => fetcher(url));
  const users = useUsers();
  async function request(url: string, method: string, body: object) {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Не удалось сохранить точку');
    return result;
  }
  async function createLocation(data: LocationChanges) {
    await request('/api/locations', 'POST', data); await mutate();
  }
  async function updateLocation(id: string, data: LocationChanges) {
    const old = locations?.find(location => location.id === id);
    if (data.isActive !== undefined) await mutate(previous => previous?.map(location => location.id === id ? { ...location, isActive: data.isActive! } : location), { revalidate: false });
    try {
      const result = await request('/api/locations/' + encodeURIComponent(id), 'PATCH', data);
      await mutate(previous => previous?.map(location => location.id === id ? { ...location, ...result } : location), { revalidate: false });
    } catch (cause) {
      if (old && data.isActive !== undefined) await mutate(previous => previous?.map(location => location.id === id ? { ...location, isActive: old.isActive } : location), { revalidate: false });
      throw cause;
    } finally { void mutate(); }
  }
  async function deleteLocation(id: string) {
    await request('/api/locations', 'DELETE', { id }); await mutate();
  }
  async function bulkUpdate(ids: string[], data: { isActive?: boolean; tuIds?: string[]; assignmentMode?: 'ADD' | 'REPLACE' }) {
    const result = await request('/api/locations/bulk', 'PATCH', { ids, ...data }); await mutate(); return result as { count: number };
  }
  return { locations: locations || [], tus: users.users.filter(u => u.role === 'TU'), isLoading: isLoading || users.isLoading,
    error: error || users.error, refresh: async () => { await Promise.all([mutate(), users.refresh()]); },
    createLocation, updateLocation, deleteLocation, bulkUpdate };
}
