'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { UserEditor } from '@/components/users/UserEditor';

export default function AdminUsersPage() {
  const { users, isLoading, saveUser, deleteUser, resetPassword } = useUsers();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const openEditor = (user: any = null) => {
    setEditingUser(user);
    setIsEditorOpen(true);
  };

  const handleResetPassword = async (user: any) => {
    if (!confirm(`Точно сбросить пароль для сотрудника ${user.login}? Старый пароль перестанет работать.`)) return;
    try {
      const data = await resetPassword(user.id);
      const link = `${window.location.origin}/setup-password?token=${data.token}`;
      prompt('СБРОС ВЫПОЛНЕН! Скопируйте новую ссылку и отправьте сотруднику:', link);
    } catch (err) {
      alert('Ошибка при сбросе');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить сотрудника? Его аудиты тоже удалятся!')) return;
    try { await deleteUser(id); } 
    catch (err) { alert('Ошибка при удалении'); }
  };

  if (isLoading) return <div className="p-8 text-gray-500 font-bold">Загрузка...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Сотрудники</h1>
          <p className="text-gray-500 mt-2">Управление персоналом и доступами</p>
        </div>
        {!isEditorOpen && (
          <button onClick={() => openEditor()} className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg">
            + Добавить сотрудника
          </button>
        )}
      </div>

      {isEditorOpen ? (
        <UserEditor 
          initialData={editingUser} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={saveUser} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-black text-gray-900">{user.login}</h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role}
                </span>
              </div>
              {user.phone && <div className="text-sm text-gray-500 font-bold mb-4">📞 {user.phone}</div>}
              
              {!user.hasPassword ? (
                <div className="text-xs font-bold text-orange-500 bg-orange-50 p-2 rounded-lg mb-4 text-center border border-orange-100">
                  ⚠️ Пароль еще не установлен
                </div>
              ) : (
                <div className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded-lg mb-4 text-center border border-green-100">
                  ✓ Пароль установлен
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-50">
                <div className="flex gap-2">
                  <button onClick={() => openEditor(user)} className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-xl font-bold text-xs hover:bg-gray-100">Изменить данные</button>
                  <button onClick={() => handleDelete(user.id)} className="px-4 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-100">Удалить</button>
                </div>
                
                <button onClick={() => handleResetPassword(user)} className="w-full bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors">
                  Сбросить пароль и дать ссылку
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}