import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useUsers() {
  const { data: users, error, isLoading, mutate } = useSWR<any[]>('/api/users', fetcher);

  const saveUser = async (body: any, isUpdate: boolean) => {
    const res = await fetch('/api/users', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error('Ошибка при сохранении');
    
    const data = await res.json();
    mutate(); // Обновляем кэш
    return data;
  };

  const deleteUser = async (id: string) => {
    // Оптимистичное удаление с экрана
    mutate(users?.filter(u => u.id !== id), false);
    
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      mutate(); // Откат при ошибке
      throw new Error('Ошибка удаления');
    }
  };

  const resetPassword = async (id: string) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resetPassword: true })
    });

    if (!res.ok) throw new Error('Ошибка при сбросе');
    const data = await res.json();
    mutate();
    return data;
  };

  return {
    users: users || [],
    isLoading,
    isError: !!error,
    saveUser,
    deleteUser,
    resetPassword
  };
}