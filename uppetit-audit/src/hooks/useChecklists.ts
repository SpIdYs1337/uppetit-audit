import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useChecklists() {
  // SWR автоматически фетчит данные, кэширует их и перехватывает ошибки
  const { data: checklists, error, isLoading, mutate } = useSWR<any[]>('/api/checklists', fetcher);

  // Сохранение (создание или обновление)
  const saveChecklist = async (body: any, isUpdate: boolean) => {
    const res = await fetch('/api/checklists', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error('Ошибка при сохранении');
    
    // Мутируем кэш SWR: данные обновятся на экране мгновенно, без перезагрузки страницы!
    mutate(); 
    return res.json();
  };

  // Удаление
  const deleteChecklist = async (id: string) => {
    const res = await fetch(`/api/checklists?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка при удалении');
    
    // Оптимистичное обновление: сразу убираем из списка, не дожидаясь ответа сервера
    mutate(checklists?.filter(c => c.id !== id), false);
  };

  return {
    checklists: checklists || [],
    isLoading,
    isError: !!error,
    saveChecklist,
    deleteChecklist,
    mutate // на всякий случай отдаем наружу
  };
}