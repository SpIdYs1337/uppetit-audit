'use client';

import { useState, useMemo } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { UserEditor } from '@/components/users/UserEditor';
import { User } from '@prisma/client';

export type EnrichedUser = User & { 
  hasPassword?: boolean;
  inviteToken?: string | null;
};

type TabType = 'EMPLOYEES' | 'INVITES';

export default function AdminUsersPage() {
  const { users, isLoading, saveUser, deleteUser, resetPassword } = useUsers();
  
  const [editingUser, setEditingUser] = useState<EnrichedUser | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>('EMPLOYEES');
  const [searchQuery, setSearchQuery] = useState('');

  const openEditor = (user: EnrichedUser | null = null) => {
    setEditingUser(user);
    setIsEditorOpen(true);
  };

  const handleResetPassword = async (user: EnrichedUser) => {
    if (!confirm(`Точно сбросить пароль для сотрудника ${user.login}? Старый пароль перестанет работать.`)) return;
    try {
      const data = await resetPassword(user.id);
      const link = `${window.location.origin}/setup-password?token=${data.token}`;
      prompt('СБРОС ВЫПОЛНЕН! Скопируйте новую ссылку и отправьте сотруднику:', link);
    } catch {
      alert('Ошибка при сбросе');
    }
  };

  const handleDelete = async (id: string, isInvite = false) => {
    const msg = isInvite 
      ? 'Точно отменить приглашение? Пользователь будет удален.' 
      : 'Точно удалить сотрудника? Его аудиты тоже удалятся!';
      
    if (!confirm(msg)) return;
    
    try { await deleteUser(id); } 
    catch { alert('Ошибка при удалении'); }
  };

  const copyInviteLink = (token?: string | null) => {
    if (!token) return alert('Токен не найден. Попробуйте сбросить пароль.');
    const link = `${window.location.origin}/setup-password?token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Ссылка скопирована в буфер обмена!');
  };

  const { activeUsers, invitedUsers } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = users.filter(u => {
      if (!query) return true;
      return (
        (u.name || '').toLowerCase().includes(query) ||
        (u.login || '').toLowerCase().includes(query) ||
        (u.phone || '').includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      );
    }) as EnrichedUser[];

    return {
      activeUsers: filtered.filter(u => u.hasPassword),
      invitedUsers: filtered.filter(u => !u.hasPassword),
    };
  }, [users, searchQuery]);

  if (isLoading) return <div className="p-4 md:p-8 text-gray-500 dark:text-zinc-500 font-bold">Загрузка...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-20 transition-colors duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Администрирование</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-zinc-400 mt-1 md:mt-2 transition-colors">Управление персоналом и доступами</p>
        </div>
        {!isEditorOpen && (
          <button 
            onClick={() => openEditor()} 
            className="w-full md:w-auto bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 md:py-3 rounded-xl font-bold shadow-lg transition-all hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-95 text-sm"
          >
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
        <>
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 md:mb-8 transition-colors duration-300">
            
            <div className="flex bg-gray-100/50 dark:bg-zinc-900 p-1 rounded-2xl border border-gray-200/50 dark:border-zinc-800 w-full md:w-auto transition-colors">
              <button 
                onClick={() => setActiveTab('EMPLOYEES')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'EMPLOYEES' ? 'bg-[#F25C05] text-white shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'}`}
              >
                Сотрудники ({activeUsers.length})
              </button>
              <button 
                onClick={() => setActiveTab('INVITES')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'INVITES' ? 'bg-[#F25C05] text-white shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'}`}
              >
                Приглашения ({invitedUsers.length})
              </button>
            </div>

            <div className="w-full md:w-72 relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ФИО, логину..." 
                className="w-full pl-10 pr-4 py-3 md:py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors shadow-sm"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </div>
          </div>

          {activeTab === 'EMPLOYEES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {activeUsers.length === 0 ? (
                <div className="col-span-full py-10 text-center text-gray-400 dark:text-zinc-600 font-bold transition-colors">Сотрудники не найдены</div>
              ) : (
                activeUsers.map(user => (
                  <div key={user.id} className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-md border border-gray-100 dark:border-zinc-800 flex flex-col transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-2">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-zinc-100 leading-tight break-words transition-colors">{user.name || 'Имя не указано'}</h3>
                        <p className="text-xs md:text-sm font-bold text-gray-400 dark:text-zinc-500 mt-1 transition-colors">@{user.login}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-colors ${user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {user.role}
                      </span>
                    </div>
                    
                    <div className="mb-4 space-y-1">
                      {user.email && <div className="text-xs md:text-sm text-gray-500 dark:text-zinc-400 font-bold truncate transition-colors">📧 {user.email}</div>}
                      {user.phone && <div className="text-xs md:text-sm text-gray-500 dark:text-zinc-400 font-bold transition-colors">📞 {user.phone}</div>}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-50 dark:border-zinc-800/50 transition-colors">
                      <div className="flex gap-2">
                        <button onClick={() => openEditor(user)} className="flex-1 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 py-2.5 md:py-2 rounded-xl font-bold text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">Изменить</button>
                        <button onClick={() => handleDelete(user.id)} className="px-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Удалить</button>
                      </div>
                      <button onClick={() => handleResetPassword(user)} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2.5 md:py-2 rounded-xl font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        Сбросить пароль
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'INVITES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {invitedUsers.length === 0 ? (
                <div className="col-span-full py-10 text-center text-gray-400 dark:text-zinc-600 font-bold transition-colors">Нет активных приглашений</div>
              ) : (
                invitedUsers.map(user => (
                  <div key={user.id} className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-md border border-orange-100 dark:border-orange-900/30 flex flex-col relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 dark:bg-orange-500/50"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-2">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-zinc-100 leading-tight break-words transition-colors">{user.name || 'Без имени'}</h3>
                        <p className="text-xs md:text-sm font-bold text-gray-400 dark:text-zinc-500 mt-1 transition-colors">@{user.login}</p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors">
                        Ожидает
                      </span>
                    </div>
                    
                    <div className="mb-4 space-y-1">
                      {user.email && <div className="text-xs md:text-sm text-gray-500 dark:text-zinc-400 font-bold truncate transition-colors">📧 {user.email}</div>}
                      {user.role && <div className="text-xs md:text-sm text-gray-500 dark:text-zinc-400 font-bold transition-colors">👤 Роль: {user.role}</div>}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-50 dark:border-zinc-800/50 transition-colors">
                      <button 
                        onClick={() => copyInviteLink(user.inviteToken)} 
                        className="w-full bg-[#F25C05] dark:bg-[#E65604] text-white py-3 md:py-2.5 rounded-xl font-bold text-xs hover:bg-orange-600 dark:hover:bg-[#CC4D03] transition-colors shadow-md shadow-orange-500/20 dark:shadow-orange-900/20 flex justify-center items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Скопировать ссылку
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, true)} 
                        className="w-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 py-3 md:py-2.5 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        Отменить приглашение
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}