'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';

export default function AuditorSchedulePage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  
  const [selectedLoc, setSelectedLoc] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const init = async () => {
      const session = await getSession();
      const uid = (session?.user as any)?.id;
      if (uid) {
        setUserId(uid);
        fetchPlans(uid);
      }
      const locRes = await fetch('/api/locations');
      setLocations(await locRes.json());
    };
    init();
  }, []);

  const fetchPlans = async (uid: string) => {
    const res = await fetch(`/api/schedule?userId=${uid}`);
    setPlans(await res.json());
  };

  const handleAdd = async () => {
    if (!selectedLoc || !selectedDate) return alert('Выберите точку и дату');
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, locationId: selectedLoc, date: selectedDate })
    });
    fetchPlans(userId);
    setSelectedLoc('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Отменить эту проверку?')) return;
    await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
    fetchPlans(userId);
  };

  // --- ЛОГИКА ГРУППИРОВКИ ПО ДНЯМ И РАСКРАСКИ ---

  // 1. Группируем планы по датам
  const groupPlansByDate = (plansArray: any[]) => {
    const groups: Record<string, any[]> = {};
    
    plansArray.forEach(plan => {
      // Приводим дату к формату ГГГГ-ММ-ДД для надежной группировки
      const dateObj = new Date(plan.date);
      const dateKey = dateObj.toISOString().split('T')[0]; 
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(plan);
    });

    // Сортируем даты по возрастанию
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedKeys.map(key => ({
      dateString: key,
      items: groups[key]
    }));
  };

  // 2. Получаем красивое название дня (например, "Понедельник", "13 апреля")
  const formatDayHeader = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return {
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), // Делаем с большой буквы
      dayMonth
    };
  };

  // 3. Каждому дню недели — свой цвет!
  const getColorTheme = (dateString: string) => {
    const day = new Date(dateString).getDay();
    const themes: Record<number, any> = {
      1: { text: 'text-blue-600', border: 'border-blue-200', iconBg: 'bg-blue-500', bgHover: 'hover:border-blue-300' }, // ПН
      2: { text: 'text-purple-600', border: 'border-purple-200', iconBg: 'bg-purple-500', bgHover: 'hover:border-purple-300' }, // ВТ
      3: { text: 'text-pink-600', border: 'border-pink-200', iconBg: 'bg-pink-500', bgHover: 'hover:border-pink-300' }, // СР
      4: { text: 'text-emerald-600', border: 'border-emerald-200', iconBg: 'bg-emerald-500', bgHover: 'hover:border-emerald-300' }, // ЧТ
      5: { text: 'text-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-500', bgHover: 'hover:border-amber-300' }, // ПТ
      6: { text: 'text-red-600', border: 'border-red-200', iconBg: 'bg-red-500', bgHover: 'hover:border-red-300' }, // СБ
      0: { text: 'text-orange-600', border: 'border-orange-200', iconBg: 'bg-orange-500', bgHover: 'hover:border-orange-300' }, // ВС
    };
    return themes[day];
  };

  const groupedPlans = groupPlansByDate(plans);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 md:p-8 max-w-2xl mx-auto">
      
      {/* Шапка */}
      <header className="flex items-center mb-8 mt-4 relative">
        <Link 
          href="/audit" 
          className="absolute left-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-lg font-black text-gray-900">Мой план</h1>
      </header>

      {/* Форма добавления с декоративным фоном */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden mb-10">
        {/* Размытое пятно для красоты */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <h2 className="font-black text-gray-900 mb-5 text-lg relative z-10">Запланировать визит</h2>
        
        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">Дата проверки</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:bg-white focus:border-[#F25C05] font-bold text-gray-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">Точка (Подразделение)</label>
            <select 
              value={selectedLoc} 
              onChange={(e) => setSelectedLoc(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:bg-white focus:border-[#F25C05] font-bold text-gray-900 transition-colors appearance-none"
            >
              <option value="" disabled>Нажмите для выбора...</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <button 
            onClick={handleAdd} 
            disabled={!selectedLoc || !selectedDate}
            className="w-full bg-[#F25C05] text-white py-4 mt-2 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:shadow-none"
          >
            Добавить в план
          </button>
        </div>
      </div>

      {/* Вывод сгруппированных планов */}
      <div className="flex-1">
        <h2 className="font-black text-gray-900 mb-6 text-xl ml-1">Мои будущие проверки</h2>
        
        {groupedPlans.length === 0 ? (
          <div className="text-center text-gray-400 font-bold mt-6 p-10 bg-white rounded-3xl border border-gray-100 border-dashed">
            План пока пуст. <br/> Запланируйте свою первую проверку!
          </div>
        ) : (
          groupedPlans.map((group) => {
            const { weekday, dayMonth } = formatDayHeader(group.dateString);
            const theme = getColorTheme(group.dateString);

            return (
              <div key={group.dateString} className="mb-8">
                {/* Красивый заголовок дня недели */}
                <div className="flex items-baseline gap-3 mb-4 ml-1">
                  <h3 className={`text-2xl font-black tracking-tight ${theme.text}`}>
                    {weekday}
                  </h3>
                  <span className="text-sm font-bold text-gray-400">
                    {dayMonth}
                  </span>
                </div>

                {/* Список проверок в этот день */}
                <div className="space-y-3">
                  {group.items.map(plan => (
                    <div 
                      key={plan.id} 
                      className={`bg-white p-4 rounded-3xl shadow-sm flex justify-between items-center border-2 border-transparent transition-all hover:-translate-y-1 ${theme.bgHover}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Иконка с цветом дня недели */}
                        <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} text-white flex items-center justify-center font-black text-xl shadow-md`}>
                          📍
                        </div>
                        <div>
                          <div className="font-black text-gray-900 text-lg leading-tight">
                            {plan.location?.name}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                            План на день
                          </div>
                        </div>
                      </div>
                      
                      {/* Кнопка удаления */}
                      <button 
                        onClick={() => handleDelete(plan.id)} 
                        className="w-10 h-10 bg-gray-50 text-red-400 rounded-xl flex items-center justify-center active:scale-95 transition-colors hover:bg-red-50 hover:text-red-500 ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}