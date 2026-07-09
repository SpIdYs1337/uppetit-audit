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

  const filteredGroups = groupedPlans.map((group: any) => {
    const filteredItems = group.items.filter((plan: any) => {
      const planDate = new Date(plan.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      if (activeTab === 'UPCOMING') {
        return planDate >= today || plan.status !== 'DONE';
      } else {
        return planDate < today && plan.status === 'DONE';
      }
    });
    return { ...group, items: filteredItems };
  }).filter((group: any) => group.items.length > 0); 

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 dark:text-zinc-500 bg-transparent transition-colors">Загрузка календаря...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col p-4 sm:p-6 md:p-8 max-w-6xl mx-auto pb-20 transition-colors duration-300">
      
      {/* Шапка Мобильная */}
      <header className="flex items-center mb-8 mt-4 relative md:hidden">
        <Link 
          href="/audit" 
          className="absolute left-0 w-10 h-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 shadow-sm border border-white/50 dark:border-zinc-800/50 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-xl font-black text-gray-900 dark:text-zinc-100">Мой план</h1>
      </header>

      {/* Шапка ПК */}
      <div className="hidden md:flex justify-between items-center mb-10 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Календарь проверок</h1>
          <p className="text-base text-gray-500 dark:text-zinc-400 font-medium mt-1 transition-colors">Планируйте свои визиты на точки</p>
        </div>
        <Link 
          href="/audit" 
          className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 text-gray-700 dark:text-zinc-300 px-6 py-3 rounded-2xl font-bold hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95"
        >
          Назад на главную
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start relative z-10">
        
        {/* ЛЕВАЯ КОЛОНКА (Добавление) */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-8">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-white/50 dark:border-zinc-800/50 relative overflow-hidden transition-colors">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <h2 className="font-black text-gray-900 dark:text-zinc-100 mb-6 text-xl relative z-10 transition-colors">Запланировать визит</h2>
            
            <div className="space-y-5 relative z-10">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 ml-1 uppercase tracking-wider transition-colors">Дата проверки</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white/50 dark:bg-zinc-950/50 border border-gray-200/50 dark:border-zinc-700/50 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-900 dark:text-zinc-100 transition-colors shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-zinc-500 mb-2 ml-1 uppercase tracking-wider transition-colors">Точка (Подразделение)</label>
                <select 
                  value={selectedLoc} 
                  onChange={(e) => setSelectedLoc(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white/50 dark:bg-zinc-950/50 border border-gray-200/50 dark:border-zinc-700/50 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-900 dark:text-zinc-100 transition-colors appearance-none cursor-pointer shadow-sm"
                >
                  <option value="" disabled className="text-gray-400">Нажмите для выбора...</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id} className="text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">{l.name}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAdd} 
                disabled={!selectedLoc || !selectedDate}
                className="w-full bg-[#F25C05] dark:bg-[#E65604] text-white py-4 mt-2 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/20 dark:shadow-orange-900/30 hover:bg-orange-600 dark:hover:bg-[#CC4D03] active:scale-[0.98] transition-all disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:shadow-none"
              >
                Добавить в план
              </button>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА (Список планов) */}
        <div className="w-full lg:w-2/3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 ml-1 gap-4 transition-colors">
            <h2 className="font-black text-gray-900 dark:text-zinc-100 text-2xl hidden lg:block">Расписание</h2>
            
            <div className="flex bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-2xl w-fit shadow-sm border border-white/50 dark:border-zinc-800/50 transition-colors">
              <button 
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'UPCOMING' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                Текущие
              </button>
              <button 
                onClick={() => setActiveTab('ARCHIVE')}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'ARCHIVE' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-md' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                Архив
              </button>
            </div>
          </div>
          
          {filteredGroups.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-zinc-500 font-bold mt-6 p-12 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[3rem] border border-gray-200/50 dark:border-zinc-800/50 border-dashed transition-colors">
              <div className="text-5xl mb-4 opacity-80">{activeTab === 'UPCOMING' ? '📅' : '🗄️'}</div>
              <div className="text-base">
                {activeTab === 'UPCOMING' 
                  ? <>Текущих задач нет. <br/> Запланируйте визит в форме слева.</> 
                  : <>В архиве пока пусто.</>}
              </div>
            </div>
          ) : (
            filteredGroups.map((group: any) => {
              const { weekday, dayMonth } = formatDayHeader(group.dateString);
              const theme = getColorTheme(group.dateString);

              return (
                <div key={group.dateString} className="mb-10 relative">
                  
                  <div className="flex items-baseline gap-3 mb-5 ml-1">
                    <h3 className={`text-3xl font-black tracking-tight ${theme.text}`}>
                      {weekday}
                    </h3>
                    <span className="text-base font-bold text-gray-400 dark:text-zinc-500 transition-colors">
                      {dayMonth}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {group.items.map((plan: any) => {
                      const isDone = plan.status === 'DONE';
                      const assignerName = plan.assigner ? (plan.assigner.name || plan.assigner.login) : null;

                      return (
                        <div 
                          key={plan.id} 
                          className={`p-5 sm:p-6 rounded-[2rem] flex justify-between items-center border transition-all duration-300 backdrop-blur-xl ${
                            isDone 
                              ? 'bg-white/40 dark:bg-zinc-900/30 border-white/30 dark:border-zinc-800/30 opacity-70' 
                              : `bg-white/80 dark:bg-zinc-900/80 border-white/50 dark:border-zinc-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 ${theme.bgHover}`
                          }`}
                        >
                          <div className="flex items-center gap-4 sm:gap-5">
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl sm:text-3xl transition-colors ${isDone ? 'bg-green-100/80 dark:bg-green-900/20 text-green-500 dark:text-green-400' : `${theme.iconBg} text-white shadow-lg`}`}>
                              {isDone ? '✓' : '📍'}
                            </div>
                            
                            <div>
                              <div className={`font-black text-lg sm:text-xl leading-tight transition-colors ${isDone ? 'text-gray-500 dark:text-zinc-500 line-through' : 'text-gray-900 dark:text-zinc-100'}`}>
                                {plan.location?.name}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {isDone ? (
                                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors">
                                    Выполнено
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors">
                                    Ожидает проверки
                                  </span>
                                )}

                                {assignerName ? (
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors">
                                    Назначил: {assignerName}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors">
                                    Личный план
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {!isDone && (
                            <button 
                              onClick={() => handleDelete(plan.id)} 
                              className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-zinc-800 text-red-400 dark:text-red-500 rounded-2xl flex items-center justify-center active:scale-95 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 ml-2 shrink-0 border border-gray-100/50 dark:border-zinc-700/50 shadow-sm hover:shadow-md"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
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