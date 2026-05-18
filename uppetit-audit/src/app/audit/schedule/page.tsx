'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSchedule } from '@/hooks/useSchedule';

export default function AuditorSchedulePage() {
  const { 
    locations, 
    groupedPlans, 
    isLoading, 
    addPlan, 
    deletePlan, 
    formatDayHeader, 
    getColorTheme 
  } = useSchedule();
  
  const [selectedLoc, setSelectedLoc] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // --- НОВОЕ: Стейт для вкладок ---
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'ARCHIVE'>('UPCOMING');

  const handleAdd = async () => {
    if (!selectedLoc || !selectedDate) return alert('Выберите точку и дату');
    try {
      await addPlan(selectedLoc, selectedDate);
      setSelectedLoc(''); 
    } catch {
      alert('Ошибка при сохранении плана');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Отменить эту проверку?')) return;
    try {
      await deletePlan(id);
    } catch {
      alert('Ошибка при удалении плана');
    }
  };

  // --- НОВОЕ: Логика фильтрации вкладок ---
  const filteredGroups = groupedPlans.map((group: any) => {
    const filteredItems = group.items.filter((plan: any) => {
      const planDate = new Date(plan.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      if (activeTab === 'UPCOMING') {
        // Текущие: Показываем всё, что сегодня/в будущем, ПЛЮС старые, но НЕ выполненные задачи (долги)
        return planDate >= today || plan.status !== 'DONE';
      } else {
        // Архив: Только ВЫПОЛНЕННЫЕ задачи из прошлого
        return planDate < today && plan.status === 'DONE';
      }
    });
    return { ...group, items: filteredItems };
  }).filter((group: any) => group.items.length > 0); 

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка календаря...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 md:bg-transparent flex flex-col p-4 md:p-8 max-w-6xl mx-auto pb-20">
      
      {/* Шапка Мобильная */}
      <header className="flex items-center mb-8 mt-4 relative md:hidden">
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

      {/* Шапка ПК */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Календарь проверок</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Планируйте свои визиты на точки</p>
        </div>
        <Link 
          href="/audit" 
          className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          Назад на главную
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ЛЕВАЯ КОЛОНКА: Форма добавления */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
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
                  className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:bg-white focus:border-[#F25C05] font-bold text-gray-900 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled>Нажмите для выбора...</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
        </div>

        {/* ПРАВАЯ КОЛОНКА: Вывод сгруппированных планов */}
        <div className="w-full lg:w-2/3">
          
          {/* ИЗМЕНЕНО: Заголовок и переключатель вкладок */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 ml-1 gap-4">
            <h2 className="font-black text-gray-900 text-xl hidden lg:block">Расписание</h2>
            
            <div className="flex bg-gray-200/50 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'UPCOMING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Текущие
              </button>
              <button 
                onClick={() => setActiveTab('ARCHIVE')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'ARCHIVE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Архив
              </button>
            </div>
          </div>
          
          {filteredGroups.length === 0 ? (
            <div className="text-center text-gray-400 font-bold mt-6 p-10 bg-white rounded-3xl border border-gray-100 border-dashed">
              <div className="text-4xl mb-3">{activeTab === 'UPCOMING' ? '📅' : '🗄️'}</div>
              {activeTab === 'UPCOMING' 
                ? <>Текущих задач нет. <br/> Запланируйте визит в форме слева.</> 
                : <>В архиве пока пусто.</>}
            </div>
          ) : (
            filteredGroups.map((group: any) => {
              const { weekday, dayMonth } = formatDayHeader(group.dateString);
              const theme = getColorTheme(group.dateString);

              return (
                <div key={group.dateString} className="mb-8 relative">
                  
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
                    {group.items.map((plan: any) => {
                      const isDone = plan.status === 'DONE';
                      const assignerName = plan.assigner ? (plan.assigner.name || plan.assigner.login) : null;

                      return (
                        <div 
                          key={plan.id} 
                          className={`p-4 md:p-5 rounded-3xl shadow-sm flex justify-between items-center border-2 border-transparent transition-all ${isDone ? 'bg-gray-50 opacity-70' : `bg-white hover:-translate-y-1 ${theme.bgHover}`}`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Иконка */}
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl shadow-sm ${isDone ? 'bg-green-100 text-green-500' : `${theme.iconBg} text-white shadow-md`}`}>
                              {isDone ? '✓' : '📍'}
                            </div>
                            
                            <div>
                              <div className={`font-black text-lg md:text-xl leading-tight ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {plan.location?.name}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Статус выполнения */}
                                {isDone ? (
                                  <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Выполнено
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Ожидает проверки
                                  </span>
                                )}

                                {/* Кто поставил задачу */}
                                {assignerName ? (
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Назначил: {assignerName}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    Личный план
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Кнопка удаления (прячем, если аудит уже пройден) */}
                          {!isDone && (
                            <button 
                              onClick={() => handleDelete(plan.id)} 
                              className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 text-red-400 rounded-xl flex items-center justify-center active:scale-95 transition-colors hover:bg-red-50 hover:text-red-500 ml-2 shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
      </div>
    </div>
  );
}