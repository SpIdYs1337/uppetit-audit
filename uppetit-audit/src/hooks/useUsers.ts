import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { User } from '@prisma/client';

export function useUsers() {
  const { data: users, error, isLoading, mutate } = useSWR<User[]>('/api/users', fetcher);

  const saveUser = async (body: Partial<User>, isUpdate: boolean) => {
    const res = await fetch('/api/users', {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error('Ошибка при сохранении');
    
    const data = await res.json();
    await mutate(); // Убеждаемся, что кэш обновился
    return data;
  };

  const deleteUser = async (id: string) => {
    // Безопасное отсечение undefined и новый синтаксис SWR
    const currentUsers = users || [];
    mutate(currentUsers.filter(u => u.id !== id), { revalidate: false });
    
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await mutate(); // Откат при ошибке
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
    await mutate();
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