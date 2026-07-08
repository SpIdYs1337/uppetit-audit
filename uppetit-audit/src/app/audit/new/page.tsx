'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useNewAudit } from '@/hooks/useNewAudit';
import { EnrichedLocation } from '@/hooks/useAdminAudits';
import { User, Checklist } from '@prisma/client'; 
import { ThemeToggle } from '@/components/ThemeToggle'; // <-- Импорт нашей кнопки

function NewAuditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const backToUrl = searchParams.get('backTo') || '/audit';

  const {
    tus,
    checklists,
    filteredLocations,
    selectedTu,
    selectedLocation,
    selectedChecklist,
    isLoading,
    handleTuSelect,
    setSelectedLocation,
    setSelectedChecklist
  } = useNewAudit();

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setUserRole((session?.user as any)?.role || null);
    };
    fetchSession();
  }, []);

  const filteredChecklists = useMemo(() => {
    if (!checklists) return [];
    const activeChecklists = (checklists as any[]).filter(chk => !chk.isArchived);
    if (!userRole) return activeChecklists;
    if (userRole === 'ADMIN') return activeChecklists;

    return activeChecklists.filter((chk) => {
      try {
        const allowedRoles = typeof chk.allowedRoles === 'string' 
          ? JSON.parse(chk.allowedRoles) 
          : (chk.allowedRoles || []);
        return allowedRoles.includes(userRole);
      } catch (e) {
        return false;
      }
    });
  }, [checklists, userRole]);

  const handleContinue = () => {
    if (!selectedLocation || !selectedChecklist) return;
    router.push(`/audit/run?location=${selectedLocation}&checklist=${selectedChecklist}&backTo=${encodeURIComponent(backToUrl)}`);
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-zinc-500 font-bold min-h-screen transition-colors">Загрузка...</div>;
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-gray-50 dark:bg-zinc-950 md:bg-white md:dark:bg-zinc-950 min-h-screen transition-colors duration-300">
      
      {/* HEADER с кнопкой темы */}
      <header className="flex items-center justify-between mb-8 mt-4 md:hidden">
        <Link href={backToUrl} className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-100 dark:border-zinc-800">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="font-black text-gray-900 dark:text-zinc-100">Новая проверка</h1>
        <ThemeToggle />
      </header>

      <div className="hidden md:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Новая проверка</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-1 transition-colors">Выберите параметры для старта аудита</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href={backToUrl} className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
            {backToUrl.includes('admin') ? 'Назад в админку' : 'Назад на главную'}
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-8 md:space-y-10 md:max-w-4xl">
        {/* 1. ВЫБОР ТУ */}
        <div>
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5 transition-colors">
            {userRole === 'TU' ? '1. Ваша учетная запись (ТУ)' : '1. Выберите территорию (ТУ)'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {tus.map((tu: User) => {
              const isAllAdminMode = tu.id === 'all_admin_locations';
              const isSelected = selectedTu === tu.id;
              return (
                <div 
                  key={tu.id}
                  onClick={() => handleTuSelect(tu.id)}
                  className={`p-4 md:p-5 rounded-3xl md:rounded-2xl cursor-pointer border-2 transition-all duration-200 ${
                    isSelected 
                      ? isAllAdminMode
                        ? 'border-[#F25C05] bg-[#F25C05] text-white shadow-lg'
                        : 'border-black dark:border-zinc-500 bg-black dark:bg-zinc-700 text-white shadow-lg' 
                      : 'border-transparent bg-white dark:bg-zinc-900 md:bg-gray-50 dark:md:bg-zinc-900 shadow-sm md:shadow-none hover:border-gray-200 dark:hover:border-zinc-700 hover:bg-white text-gray-900 dark:text-zinc-300'
                  }`}
                >
                  <div className="text-[10px] md:text-xs uppercase font-bold opacity-60 mb-1">{isAllAdminMode ? 'Режим superficial' : 'Управляющий'}</div>
                  <div className="font-black text-sm md:text-base truncate">{tu.name || tu.login}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. ВЫБОР ТОЧКИ */}
        <div className={`transition-all duration-500 ${selectedTu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden md:block'}`}>
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5 transition-colors">
            {selectedTu === 'all_admin_locations' ? '2. Выберите любую точку всей сети' : '2. Выберите точку'}
          </h2>
          {filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filteredLocations.map((loc: EnrichedLocation) => (
                <div 
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`relative p-4 md:p-5 rounded-3xl md:rounded-2xl cursor-pointer border-2 transition-all duration-200 overflow-hidden flex items-start gap-4 ${
                    selectedLocation === loc.id 
                      ? 'border-[#F25C05] bg-orange-50 dark:bg-orange-900/20 shadow-md' 
                      : 'border-transparent bg-white dark:bg-zinc-900 md:bg-gray-50 dark:md:bg-zinc-900 shadow-sm md:shadow-none hover:border-orange-200 dark:hover:border-orange-900/50 hover:bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl transition-colors ${selectedLocation === loc.id ? 'bg-[#F25C05]' : 'bg-gray-800 dark:bg-zinc-700'}`}>📍</div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className={`font-black text-sm md:text-base leading-tight truncate ${selectedLocation === loc.id ? 'text-[#F25C05]' : 'text-gray-900 dark:text-zinc-200'}`}>{loc.name}</div>
                    {loc.address && <div className={`text-xs mt-1 truncate ${selectedLocation === loc.id ? 'text-orange-600/80' : 'text-gray-400 dark:text-zinc-500 font-bold'}`}>{loc.address}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 bg-gray-100 dark:bg-zinc-900 rounded-3xl text-center text-gray-400 dark:text-zinc-600 font-bold border-2 border-dashed border-gray-200 dark:border-zinc-800 transition-colors">
              На этой территории пока нет доступных точек
            </div>
          )}
        </div>

        {/* 3. ВЫБОР ЧЕК-ЛИСТА */}
        <div className={`transition-all duration-500 ${selectedLocation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden md:block'}`}>
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5 transition-colors">3. Выберите чек-лист</h2>
          {filteredChecklists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filteredChecklists.map((chk: any) => (
                <div 
                  key={chk.id}
                  onClick={() => setSelectedChecklist(chk.id)}
                  className={`flex items-center p-4 md:p-5 rounded-3xl md:rounded-2xl cursor-pointer border-2 transition-all duration-200 ${
                    selectedChecklist === chk.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                      : 'border-transparent bg-white dark:bg-zinc-900 md:bg-gray-50 dark:md:bg-zinc-900 shadow-sm md:shadow-none hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl mr-4 flex items-center justify-center text-xl md:text-2xl shadow-inner transition-colors ${selectedChecklist === chk.id ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'}`}>📋</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-black text-lg md:text-xl leading-tight truncate ${selectedChecklist === chk.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-zinc-200'}`}>{chk.title}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 bg-gray-100 dark:bg-zinc-900 rounded-3xl text-center text-gray-400 dark:text-zinc-600 font-bold border-2 border-dashed border-gray-200 dark:border-zinc-800 transition-colors">
              Для вашей роли нет доступных чек-листов
            </div>
          )}
        </div>

        <button 
          onClick={handleContinue}
          disabled={!selectedLocation || !selectedChecklist}
          className="w-full md:w-auto md:min-w-[300px] bg-[#F25C05] text-white py-5 md:py-4 md:px-10 rounded-2xl md:rounded-xl font-bold text-lg md:text-base active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-zinc-800"
        >
          Начать заполнение
        </button>
      </div>
    </div>
  );
}

export default function NewAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <NewAuditContent />
    </Suspense>
  );
}