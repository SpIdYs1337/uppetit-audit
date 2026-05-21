import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Location, Checklist, User } from '@prisma/client';

// ДОБАВЛЕНО: Экспортируем тип, чтобы page.tsx перестал ругаться
export type EnrichedLocation = Location & { tus?: User[] };

export function useNewAudit() {
  // ИЗМЕНЕНО: Сообщаем SWR, что нам приходят обогащенные локации
  const { data: locations, isLoading: locLoading } = useSWR<EnrichedLocation[]>('/api/locations', fetcher);
  const { data: checklists, isLoading: chkLoading } = useSWR<Checklist[]>('/api/checklists', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<User[]>('/api/users', fetcher);

  const [selectedTu, setSelectedTu] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');

  const isLoading = locLoading || chkLoading || usersLoading;

  const tus = users?.filter(u => u.role === 'TU') || [];

  // ИЗМЕНЕНО: Обернули в useMemo и добавили правильную фильтрацию
  const filteredLocations = useMemo(() => {
    if (!locations || !selectedTu) return [];

    return locations.filter(loc => {
      // 1. ПРОВЕРКА ТУ (Ищем и в новом массиве, и в старом поле)
      const hasNewTu = Array.isArray(loc.tus) && loc.tus.some(tu => tu.id === selectedTu);
      const hasLegacyTu = loc.tuId === selectedTu;
      const isMyTu = hasNewTu || hasLegacyTu;

      // 2. ПРОВЕРКА СТАТУСА
      const isStatusActive = loc.isActive !== false;

      // 3. ПРОВЕРКА ДАТ (Обнуляем часы, чтобы не зависеть от времени суток)
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