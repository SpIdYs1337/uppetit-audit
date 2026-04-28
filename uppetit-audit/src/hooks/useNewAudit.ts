import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Location, Checklist, User } from '@prisma/client';

export function useNewAudit() {
  const { data: locations, isLoading: locLoading } = useSWR<Location[]>('/api/locations', fetcher);
  const { data: checklists, isLoading: chkLoading } = useSWR<Checklist[]>('/api/checklists', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const [selectedTu, setSelectedTu] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');

  const isLoading = locLoading || chkLoading || usersLoading;

  const tus = users?.filter(u => u.role === 'TU') || [];

  const filteredLocations = locations?.filter(loc => {
    const isMyTu = loc.tuId === selectedTu;
    const isStatusActive = loc.isActive !== false;

    const now = new Date();
    const isAfterStart = loc.activeFrom ? new Date(loc.activeFrom) <= now : true;
    const isBeforeEnd = loc.activeTo ? new Date(loc.activeTo) >= now : true;

    return isMyTu && isStatusActive && isAfterStart && isBeforeEnd;
  }) || [];

  const handleTuSelect = (id: string) => {
    setSelectedTu(id);
    setSelectedLocation(''); 
  };

  return {
    tus,
    checklists: checklists || [],
    filteredLocations,
    selectedTu,
    selectedLocation,
    selectedChecklist,
    isLoading,
    handleTuSelect,
    setSelectedLocation,
    setSelectedChecklist
  };
}