import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { VisitPlan, Location } from '@prisma/client';

export type EnrichedVisitPlan = VisitPlan & { location?: Location | null };

export function useSchedule() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: plans, mutate: mutatePlans, isLoading: plansLoading } = useSWR<EnrichedVisitPlan[]>(
    userId ? `/api/schedule?userId=${userId}` : null,
    fetcher
  );

  const { data: locations, isLoading: locLoading } = useSWR<Location[]>('/api/locations', fetcher);

  const addPlan = async (locationId: string, date: string) => {
    if (!userId) return;
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, locationId, date })
    });
    
    if (!res.ok) throw new Error('Ошибка добавления');
    mutatePlans(); 
  };

  const deletePlan = async (id: string) => {
    mutatePlans(plans?.filter(p => p.id !== id), false);
    
    const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      mutatePlans(); 
      throw new Error('Ошибка удаления');
    }
  };

  const getGroupedPlans = () => {
    if (!plans) return [];
    const groups: Record<string, EnrichedVisitPlan[]> = {};
    
    plans.forEach(plan => {
      const dateObj = new Date(plan.date);
      const dateKey = dateObj.toISOString().split('T')[0]; 
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(plan);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedKeys.map(key => ({
      dateString: key,
      items: groups[key]
    }));
  };

  const formatDayHeader = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return {
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      dayMonth
    };
  };

  const getColorTheme = (dateString: string) => {
    const day = new Date(dateString).getDay();
    const themes: Record<number, Record<string, string>> = {
      1: { text: 'text-blue-600', border: 'border-blue-200', iconBg: 'bg-blue-500', bgHover: 'hover:border-blue-300' }, 
      2: { text: 'text-purple-600', border: 'border-purple-200', iconBg: 'bg-purple-500', bgHover: 'hover:border-purple-300' }, 
      3: { text: 'text-pink-600', border: 'border-pink-200', iconBg: 'bg-pink-500', bgHover: 'hover:border-pink-300' }, 
      4: { text: 'text-emerald-600', border: 'border-emerald-200', iconBg: 'bg-emerald-500', bgHover: 'hover:border-emerald-300' }, 
      5: { text: 'text-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-500', bgHover: 'hover:border-amber-300' }, 
      6: { text: 'text-red-600', border: 'border-red-200', iconBg: 'bg-red-500', bgHover: 'hover:border-red-300' }, 
      0: { text: 'text-orange-600', border: 'border-orange-200', iconBg: 'bg-orange-500', bgHover: 'hover:border-orange-300' }, 
    };
    return themes[day];
  };

  return {
    locations: locations || [],
    groupedPlans: getGroupedPlans(),
    isLoading: plansLoading || locLoading,
    addPlan,
    deletePlan,
    formatDayHeader,
    getColorTheme
  };
}