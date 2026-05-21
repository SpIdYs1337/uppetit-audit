import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import { Checklist, User } from '@prisma/client';
import { EnrichedLocation } from '@/hooks/useAdminAudits';

export function useNewAudit() {
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserRole = (session?.user as any)?.role;

  const { data: locations, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: checklists, isLoading: chkLoading } = useSWR<Checklist[]>('/api/checklists', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const [selectedTu, setSelectedTu] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');

  const isLoading = locLoading || chkLoading || usersLoading || sessionStatus === 'loading';

  // Фильтрация списка ТУ: ТУ видит только себя, ADMIN видит виртуальную кнопку + всех остальных
  const tus = useMemo(() => {
    const allTus = users?.filter(u => u.role === 'TU') || [];
    if (currentUserRole === 'TU' && currentUserId) {
      return allTus.filter(u => u.id === currentUserId);
    }
    if (currentUserRole === 'ADMIN') {
      // Инжектируем виртуального управляющего для оверрайда фильтров
      return [
        { id: 'all_admin_locations', name: '✨ ВСЕ ТОЧКИ системы', login: 'admin', role: 'ADMIN' } as any,
        ...allTus
      ];
    }
    return allTus;
  }, [users, currentUserRole, currentUserId]);

  // Автоматический выбор: ТУ выбирает себя, ADMIN по умолчанию переходит в режим сквозного аудита
  useEffect(() => {
    if (currentUserRole === 'TU' && currentUserId && !selectedTu) {
      setSelectedTu(currentUserId);
    } else if (currentUserRole === 'ADMIN' && !selectedTu) {
      setSelectedTu('all_admin_locations');
    }
  }, [currentUserRole, currentUserId, selectedTu]);

  const filteredLocations = useMemo(() => {
    if (!locations || !selectedTu) return [];

    return locations.filter(loc => {
      // Если выбран режим администратора — привязка к ТУ игнорируется (isMyTu всегда true)
      const isMyTu = selectedTu === 'all_admin_locations'
        ? true
        : (Array.isArray(loc.tus) && loc.tus.some((tu: any) => tu.id === selectedTu)) || loc.tuId === selectedTu;

      // Проверка активности торговой точки
      const isStatusActive = loc.isActive !== false;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let isAfterStart = true;
      if (loc.activeFrom) {
        const startDate = new Date(loc.activeFrom);
        startDate.setHours(0, 0, 0, 0);
        isAfterStart = startDate <= now;
      }

      let isBeforeEnd = true;
      if (loc.activeTo) {
        const endDate = new Date(loc.activeTo);
        endDate.setHours(23, 59, 59, 999);
        isBeforeEnd = endDate >= now;
      }

      return isMyTu && isStatusActive && isAfterStart && isBeforeEnd;
    });
  }, [locations, selectedTu]);

  const handleTuSelect = (id: string) => {
    if (currentUserRole === 'TU' && id !== currentUserId) return;
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