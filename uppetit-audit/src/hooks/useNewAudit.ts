import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useNewAudit() {
  // SWR сам параллельно отправляет 3 запроса и кэширует ответы
  const { data: locations, isLoading: locLoading } = useSWR<any[]>('/api/locations', fetcher);
  const { data: checklists, isLoading: chkLoading } = useSWR<any[]>('/api/checklists', fetcher);
  const { data: users, isLoading: usersLoading } = useSWR<any[]>('/api/users', fetcher);

  const [selectedTu, setSelectedTu] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');

  const isLoading = locLoading || chkLoading || usersLoading;

  // Формируем список ТУ
  const tus = users?.filter(u => u.role === 'TU') || [];

  // Фильтрация точек: по выбранному ТУ + статус Active + проверка Дат
  const filteredLocations = locations?.filter(loc => {
    const isMyTu = loc.tuId === selectedTu;
    const isStatusActive = loc.isActive !== false;

    const now = new Date();
    const isAfterStart = loc.activeFrom ? new Date(loc.activeFrom) <= now : true;
    const isBeforeEnd = loc.activeTo ? new Date(loc.activeTo) >= now : true;

    return isMyTu && isStatusActive && isAfterStart && isBeforeEnd;
  }) || [];

  // Обработчик выбора ТУ со сбросом зависимой точки
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