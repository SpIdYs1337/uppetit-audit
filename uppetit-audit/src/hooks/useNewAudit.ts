'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import { locationIsAvailable } from '@/lib/locationAvailability';
import type { EnrichedLocation } from './useLocations';
import type { PublicUser } from './useUsers';
import type { ExtendedChecklist } from './useAuditRun';

export function useNewAudit(initialLocation = '') {
  const { data: session, status } = useSession();
  const identity = session?.user ? session.user.id + ':' + session.user.role : null;
  const key = (url: string) => identity ? [url, identity] : null;
  const get = ([url]: [string, string]) => fetcher(url);
  const locations = useSWR<EnrichedLocation[]>(key('/api/locations'), get);
  const checklists = useSWR<ExtendedChecklist[]>(key('/api/checklists'), get);
  const users = useSWR<PublicUser[]>(key('/api/users'), get);
  const [territory, setTerritory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedChecklist, setSelectedChecklist] = useState('');
  const currentUserRole = session?.user.role;
  const selectedTu = currentUserRole === 'TU' ? session?.user.id || '' : territory;
  const tus = (users.data || []).filter(u => u.role === 'TU' && u.isActive !== false);
  const filteredLocations = (locations.data || []).filter(l => locationIsAvailable(l) && (!selectedTu || l.tuId === selectedTu || l.tus?.some(t => t.id === selectedTu)));
  const allowedChecklists = (checklists.data || []).filter(c => !c.isArchived && c.activeVersionId && (currentUserRole === 'ADMIN' || c.allowedRoles.includes(currentUserRole!)));
  return {
    tus, filteredLocations, checklists: allowedChecklists, selectedTu, selectedLocation, selectedChecklist,
    isLoading: status === 'loading' || locations.isLoading || checklists.isLoading || users.isLoading,
    error: locations.error || checklists.error || users.error,
    refresh: () => Promise.all([locations.mutate(), checklists.mutate(), users.mutate()]),
    currentUserRole,
    handleTuSelect: (id: string) => { if (currentUserRole === 'TU') return; setTerritory(id); setSelectedLocation(''); },
    setSelectedLocation, setSelectedChecklist,
  };
}
