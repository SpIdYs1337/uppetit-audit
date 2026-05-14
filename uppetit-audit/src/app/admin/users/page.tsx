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

  if (isLoading) return <div className="p-4 md:p-8 text-gray-500 font-bold">Загрузка...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-20">
      
      {/* ШАПКА: Адаптирована под мобильные */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Администрирование</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Управление персоналом и доступами</p>
        </div>
        {!isEditorOpen && (
          <button 
            onClick={() => openEditor()} 
            className="w-full md:w-auto bg-black text-white px-6 py-3.5 md:py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 text-sm"
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
          {/* ПАНЕЛЬ УПРАВЛЕНИЯ: Вкладки и Поиск */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 md:mb-8">
            
            {/* Вкладки: На мобильных flex-1 делит ширину пополам */}
            <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-200/50 w-full md:w-auto">
              <button 
                onClick={() => setActiveTab('EMPLOYEES')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'EMPLOYEES' ? 'bg-[#F25C05] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
              >
                Сотрудники ({activeUsers.length})
              </button>
              <button 
                onClick={() => setActiveTab('INVITES')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'INVITES' ? 'bg-[#F25C05] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`}
              >
                Приглашения ({invitedUsers.length})
              </button>
            </div>

            {/* Поиск */}
            <div className="w-full md:w-72 relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ФИО, логину..." 
                className="w-full pl-10 pr-4 py-3 md:py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:border-[#F25C05] transition-colors shadow-sm"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </div>
          </div>

          {/* КОНТЕНТ ВКЛАДОК */}
          {activeTab === 'EMPLOYEES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {activeUsers.length === 0 ? (
                <div className="col-span-full py-10 text-center text-gray-400 font-bold">Сотрудники не найдены</div>
              ) : (
                activeUsers.map(user => (
                  <div key={user.id} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-2">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight break-words">{user.name || 'Имя не указано'}</h3>
                        <p className="text-xs md:text-sm font-bold text-gray-400 mt-1">@{user.login}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </div>
                    
                    <div className="mb-4 space-y-1">
                      {user.email && <div className="text-xs md:text-sm text-gray-500 font-bold truncate">📧 {user.email}</div>}
                      {user.phone && <div className="text-xs md:text-sm text-gray-500 font-bold">📞 {user.phone}</div>}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-50">
                      <div className="flex gap-2">
                        <button onClick={() => openEditor(user)} className="flex-1 bg-gray-50 text-gray-700 py-2.5 md:py-2 rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors">Изменить</button>
                        <button onClick={() => handleDelete(user.id)} className="px-4 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">Удалить</button>
                      </div>
                      <button onClick={() => handleResetPassword(user)} className="w-full bg-blue-50 text-blue-600 py-2.5 md:py-2 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors">
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
                <div className="col-span-full py-10 text-center text-gray-400 font-bold">Нет активных приглашений</div>
              ) : (
                invitedUsers.map(user => (
                  <div key={user.id} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-orange-100 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-400"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-2">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight break-words">{user.name || 'Без имени'}</h3>
                        <p className="text-xs md:text-sm font-bold text-gray-400 mt-1">@{user.login}</p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-orange-100 text-orange-700">
                        Ожидает
                      </span>
                    </div>
                    
                    <div className="mb-4 space-y-1">
                      {user.email && <div className="text-xs md:text-sm text-gray-500 font-bold truncate">📧 {user.email}</div>}
                      {user.role && <div className="text-xs md:text-sm text-gray-500 font-bold">👤 Роль: {user.role}</div>}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-50">
                      <button 
                        onClick={() => copyInviteLink(user.inviteToken)} 
                        className="w-full bg-[#F25C05] text-white py-3 md:py-2.5 rounded-xl font-bold text-xs hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 flex justify-center items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Скопировать ссылку
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, true)} 
                        className="w-full bg-red-50 text-red-500 py-3 md:py-2.5 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors"
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