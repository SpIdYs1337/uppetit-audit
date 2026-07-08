'use client';

import { useState, useEffect } from 'react';
import { VisitPlan, Location, User } from '@prisma/client';

type EnrichedPlan = VisitPlan & { 
  location?: Location | null; 
  user?: User | null; 
  assigner?: User | null;
  assignerId?: string | null; 
};

export default function AdminSchedulePage() {
  const [plans, setPlans] = useState<EnrichedPlan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedLoc, setSelectedLoc] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'ARCHIVE'>('UPCOMING');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, usersRes, locsRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/users'),       
        fetch('/api/locations')    
      ]);
      
      const [plansData, usersData, locsData] = await Promise.all([
        plansRes.json(),
        usersRes.json(),
        locsRes.json()
      ]);

      const sortedPlans = (plansData || []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setPlans(sortedPlans);
      
      setUsers((usersData || []).filter((u: User) => u.role === 'AUDITOR' || u.role === 'TU'));
      setLocations(locsData || []);
    } catch (err) {
      console.error('Ошибка загрузки данных', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPlan = async () => {
    if (!selectedUser || !selectedLoc || !selectedDate) return alert('Заполните все поля!');
    
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          locationId: selectedLoc,
          date: selectedDate
        })
      });

      if (!res.ok) throw new Error('Ошибка сервера');
      
      alert('Задача успешно назначена!');
      setSelectedUser('');
      setSelectedLoc('');
      fetchData(); 
    } catch (err) {
      alert('Ошибка при назначении проверки');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить эту задачу из плана?')) return;
    try {
      await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      setPlans(plans.filter(p => p.id !== id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const filteredPlans = plans.filter(plan => {
    const planDate = new Date(plan.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (activeTab === 'UPCOMING') {
      return planDate >= today || plan.status !== 'DONE';
    } else {
      return planDate < today && plan.status === 'DONE';
    }
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 dark:text-zinc-500 transition-colors">Загрузка расписания...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 transition-colors duration-300">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Управление расписанием</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 md:mt-2 text-sm md:text-base transition-colors">Постановка задач и контроль планов визитов</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden transition-colors">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <h2 className="font-black text-gray-900 dark:text-zinc-100 mb-5 text-lg relative z-10 flex items-center gap-2 transition-colors">
              <span>🎯</span> Назначить проверку
            </h2>
            
            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 ml-1 uppercase tracking-wider transition-colors">Сотрудник (Исполнитель)</label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-purple-500 dark:focus:border-purple-500 font-bold text-gray-900 dark:text-zinc-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>Выберите сотрудника...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.login} ({u.role})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 ml-1 uppercase tracking-wider transition-colors">Точка (Объект)</label>
                <select 
                  value={selectedLoc} 
                  onChange={(e) => setSelectedLoc(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-purple-500 dark:focus:border-purple-500 font-bold text-gray-900 dark:text-zinc-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>Выберите точку...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 ml-1 uppercase tracking-wider transition-colors">Дата визита</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-purple-500 dark:focus:border-purple-500 font-bold text-gray-900 dark:text-zinc-200 transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              
              <button 
                onClick={handleAddPlan} 
                disabled={!selectedLoc || !selectedDate || !selectedUser}
                className="w-full bg-purple-600 dark:bg-purple-500 text-white py-4 mt-2 rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/20 dark:shadow-purple-900/20 active:scale-[0.98] transition-all disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:shadow-none"
              >
                Поставить задачу
              </button>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <div className="w-full lg:w-2/3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 ml-1 gap-4 transition-colors">
            <div className="flex items-end gap-3">
              <h2 className="font-black text-gray-900 dark:text-zinc-100 text-xl transition-colors">Планы визитов</h2>
              <span className="bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                {filteredPlans.length} задач
              </span>
            </div>

            <div className="flex bg-gray-200/50 dark:bg-zinc-800 p-1 rounded-xl w-fit transition-colors">
              <button 
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'UPCOMING' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                Текущие
              </button>
              <button 
                onClick={() => setActiveTab('ARCHIVE')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'ARCHIVE' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                Архив
              </button>
            </div>
          </div>
          
          {filteredPlans.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-zinc-500 font-bold mt-6 p-10 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 border-dashed transition-colors">
              <div className="text-4xl mb-3">{activeTab === 'UPCOMING' ? '📅' : '🗄️'}</div>
              {activeTab === 'UPCOMING' 
                ? <>Запланированных визитов пока нет.</> 
                : <>В архиве пока пусто.</>}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => {
                const isDone = plan.status === 'DONE';
                const planDate = new Date(plan.date);
                const isAssignedByAdmin = !!plan.assignerId;

                return (
                  <div 
                    key={plan.id} 
                    className={`p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${isDone ? 'bg-gray-50/80 dark:bg-zinc-900/50 opacity-75' : 'bg-white dark:bg-zinc-900 hover:shadow-md hover:-translate-y-1'}`}
                  >
                    <div className="flex gap-4 items-start w-full">
                      <div className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-colors ${isDone ? 'border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500' : 'border-purple-100 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400'}`}>
                        <span className="text-xs font-bold uppercase">{planDate.toLocaleDateString('ru-RU', { month: 'short' })}</span>
                        <span className="text-2xl font-black leading-none">{planDate.getDate()}</span>
                      </div>

                      <div className="flex-1">
                        <div className={`text-lg font-black leading-tight mb-1 transition-colors ${isDone ? 'text-gray-500 dark:text-zinc-500 line-through' : 'text-gray-900 dark:text-zinc-100'}`}>
                          {plan.location?.name || 'Точка удалена'}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors">
                            <span className="text-[10px]">👤</span> {plan.user?.name || plan.user?.login || 'Удален'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isDone ? (
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors">
                              Выполнено
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors">
                              Ожидает визита
                            </span>
                          )}

                          {isAssignedByAdmin ? (
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors">
                              Назначено вами
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-wider transition-colors">
                              Личный план сотрудника
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isDone && (
                      <button 
                        onClick={() => handleDelete(plan.id)}
                        className="w-full md:w-auto mt-2 md:mt-0 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs uppercase tracking-wider bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 px-4 py-3 md:py-2 rounded-xl transition-colors shrink-0 text-center"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}