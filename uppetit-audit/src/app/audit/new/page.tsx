'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useNewAudit } from '@/hooks/useNewAudit';
import { EnrichedLocation } from '@/hooks/useAdminAudits';
import { User, Checklist } from '@prisma/client'; 

// --- Внутренний компонент с основной логикой ---
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
    if (!checklists || !userRole) return checklists || [];
    if (userRole === 'ADMIN') return checklists;

    return checklists.filter((chk: Checklist) => {
      try {
        const allowedRoles = typeof chk.allowedRoles === 'string' 
          ? JSON.parse(chk.allowedRoles) 
          : (chk.allowedRoles || []);
          
        return allowedRoles.includes(userRole);
      } catch (e) {
        console.error('Ошибка парсинга allowedRoles:', e);
        return false;
      }
    });
  }, [checklists, userRole]);

  const handleContinue = () => {
    if (!selectedLocation || !selectedChecklist) return;
    router.push(`/audit/run?location=${selectedLocation}&checklist=${selectedChecklist}&backTo=${encodeURIComponent(backToUrl)}`);
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold min-h-screen">Загрузка данных...</div>;
  }

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-gray-50 md:bg-white min-h-screen">
      <header className="flex items-center mb-8 mt-4 relative md:hidden">
        <Link 
          href={backToUrl} 
          className="absolute left-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-lg font-black text-gray-900">Новая проверка</h1>
      </header>

      <div className="hidden md:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Новая проверка</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Выберите параметры для старта аудита</p>
        </div>
        <Link 
          href={backToUrl} 
          className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors"
        >
          {backToUrl.includes('admin') ? 'Назад в админку' : 'Назад на главную'}
        </Link>
      </div>

      <div className="flex-1 flex flex-col space-y-8 md:space-y-10 md:max-w-4xl">
        {/* 1. ВЫБОР ТУ */}
        <div>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5">
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
                        ? 'border-[#F25C05] bg-[#F25C05] text-white shadow-lg scale-[0.98] md:scale-100 md:-translate-y-1'
                        : 'border-black bg-black text-white shadow-lg scale-[0.98] md:scale-100 md:-translate-y-1' 
                      : 'border-transparent bg-white md:bg-gray-50 shadow-sm md:shadow-none hover:border-gray-200 hover:bg-white text-gray-900'
                  }`}
                >
                  <div className="text-[10px] md:text-xs uppercase font-bold opacity-60 mb-1">
                    {isAllAdminMode ? 'Режим superficial-пользователя' : 'Управляющий'}
                  </div>
                  <div className="font-black text-sm md:text-base truncate">{tu.name || tu.login}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. ВЫБОР ТОЧКИ */}
        <div className={`transition-all duration-500 ${selectedTu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden md:block'}`}>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5">
            {selectedTu === 'all_admin_locations' ? '2. Выберите любую точку всей сети' : '2. Выберите точку'}
          </h2>
          {filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filteredLocations.map((loc: EnrichedLocation) => (
                <div 
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`relative p-4 md:p-5 rounded-3xl md:rounded-2xl cursor-pointer border-2 transition-all duration-200 overflow-hidden group flex items-start gap-4 ${
                    selectedLocation === loc.id 
                      ? 'border-[#F25C05] bg-orange-50 shadow-md scale-[0.98] md:scale-100 md:-translate-y-1' 
                      : 'border-transparent bg-white md:bg-gray-50 shadow-sm md:shadow-none hover:border-orange-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl transition-colors ${selectedLocation === loc.id ? 'bg-[#F25C05] shadow-lg shadow-orange-500/30' : 'bg-gray-800'}`}>
                    📍
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className={`font-black text-sm md:text-base leading-tight truncate ${selectedLocation === loc.id ? 'text-[#F25C05]' : 'text-gray-900'}`}>
                      {loc.name}
                    </div>
                    {loc.address && (
                      <div className={`text-xs mt-1 truncate ${selectedLocation === loc.id ? 'text-orange-600/80 font-medium' : 'text-gray-400 font-bold'}`}>
                        {loc.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 bg-gray-100 md:bg-gray-50 rounded-3xl text-center text-gray-400 text-sm md:text-base font-bold border-2 border-dashed border-gray-200 md:border-gray-300">
              На этой территории пока нет доступных точек
            </div>
          )}
        </div>

        {/* 3. ВЫБОР ЧЕК-ЛИСТА */}
        <div className={`transition-all duration-500 ${selectedLocation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden md:block'}`}>
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 ml-1 md:text-sm md:mb-5">3. Выберите чек-лист</h2>
          {filteredChecklists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filteredChecklists.map((chk: Checklist) => (
                <div 
                  key={chk.id}
                  onClick={() => setSelectedChecklist(chk.id)}
                  className={`flex items-center p-4 md:p-5 rounded-3xl md:rounded-2xl cursor-pointer border-2 transition-all duration-200 ${
                    selectedChecklist === chk.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-[0.99] md:scale-100 md:-translate-y-1' 
                      : 'border-transparent bg-white md:bg-gray-50 shadow-sm md:shadow-none hover:border-blue-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl mr-4 flex items-center justify-center text-xl md:text-2xl shadow-inner transition-colors ${selectedChecklist === chk.id ? 'bg-blue-500 text-white' : 'bg-gray-100 md:bg-white text-gray-400'}`}>
                    📋
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-black text-lg md:text-xl leading-tight truncate ${selectedChecklist === chk.id ? 'text-blue-700' : 'text-gray-900'}`}>
                      {chk.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 md:p-12 bg-gray-100 md:bg-gray-50 rounded-3xl text-center text-gray-400 text-sm md:text-base font-bold border-2 border-dashed border-gray-200 md:border-gray-300">
              Для вашей роли нет доступных чек-листов
            </div>
          )}
        </div>

        <button 
          onClick={handleContinue}
          disabled={!selectedLocation || !selectedChecklist}
          className="w-full md:w-auto md:min-w-[300px] bg-[#F25C05] text-white py-5 md:py-4 md:px-10 rounded-2xl md:rounded-xl font-bold text-lg md:text-base active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:bg-gray-300"
        >
          Начать заполнение
        </button>
      </div>
    </div>
  );
}

// --- Экспортируемая обертка ---
export default function NewAuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
      <NewAuditContent />
    </Suspense>
  );
}