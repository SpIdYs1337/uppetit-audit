'use client';

import { useState, useEffect } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  const [login, setLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('AUDITOR');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // ИСПРАВЛЕНИЕ: Добавляем { cache: 'no-store' } и уникальную метку времени, 
      // чтобы Next.js всегда запрашивал свежие данные из базы, а не из памяти.
      const res = await fetch(`/api/users?t=${new Date().getTime()}`, {
        cache: 'no-store'
      });
      setUsers(await res.json());
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const openEditor = (user: any = null) => {
    if (user) {
      setCurrentId(user.id);
      setLogin(user.login);
      setPhone(user.phone || '');
      setRole(user.role || 'AUDITOR');
    } else {
      setCurrentId(null);
      setLogin('');
      setPhone('');
      setRole('AUDITOR');
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!login.trim()) return alert('Заполните логин');

    try {
      const method = currentId ? 'PUT' : 'POST';
      const body = { id: currentId, login, phone, role };

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        
        // Если это создание НОВОГО пользователя, сразу показываем ссылку
        if (!currentId && data.inviteToken) {
          const link = `${window.location.origin}/setup-password?token=${data.inviteToken}`;
          prompt('СОТРУДНИК СОЗДАН! Скопируйте эту ссылку и отправьте ему для установки пароля:', link);
        }
        
        fetchUsers();
        setIsEditing(false);
      } else { alert('Ошибка при сохранении'); }
    } catch (err) { alert('Системная ошибка'); }
  };

  // ФУНКЦИЯ СБРОСА ПАРОЛЯ
  const handleResetPassword = async (user: any) => {
    if (!confirm(`Точно сбросить пароль для сотрудника ${user.login}? Старый пароль перестанет работать.`)) return;
    
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, resetPassword: true })
      });

      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/setup-password?token=${data.token}`;
        prompt('СБРОС ВЫПОЛНЕН! Скопируйте новую ссылку и отправьте сотруднику:', link);
        fetchUsers();
      }
    } catch (err) {
      alert('Ошибка при сбросе');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить сотрудника? Его аудиты тоже удалятся!')) return;
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) { alert('Ошибка при удалении'); }
  };

  if (isLoading) return <div className="p-8 text-gray-500 font-bold">Загрузка...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Сотрудники</h1>
          <p className="text-gray-500 mt-2">Управление персоналом и доступами</p>
        </div>
        {!isEditing && (
          <button onClick={() => openEditor()} className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg">
            + Добавить сотрудника
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900">{currentId ? 'Редактирование' : 'Новый сотрудник'}</h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 font-bold hover:text-gray-600">✕ Закрыть</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Логин / Имя</label>
              <input type="text" value={login} onChange={e => setLogin(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05]" placeholder="Например: ivanov" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Номер телефона</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05]" placeholder="+7 999 000-00-00" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Роль</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05]">
                <option value="AUDITOR">Аудитор (Мобильное приложение)</option>
                <option value="ADMIN">Администратор (Веб-панель)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <button onClick={handleSave} className="w-full bg-[#F25C05] text-white py-4 rounded-xl font-bold shadow-lg">Сохранить</button>
            {!currentId && <p className="text-xs text-gray-400 text-center mt-3 font-bold">После сохранения вы получите ссылку для установки пароля</p>}
          </div>
        </div>
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
              
              {/* Статус пароля */}
              {user.inviteToken ? (
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
                
                {/* КНОПКА СБРОСА ПАРОЛЯ */}
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