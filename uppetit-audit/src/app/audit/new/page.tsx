'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewAuditPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем списки из нашей базы
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, checkRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/checklists')
        ]);
        if (locRes.ok) setLocations(await locRes.json());
        if (checkRes.ok) setChecklists(await checkRes.json());
      } catch (err) {
        console.error('Ошибка загрузки:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleContinue = () => {
    if (!selectedLocation || !selectedChecklist) return;
    router.push(`/audit/run?location=${selectedLocation}&checklist=${selectedChecklist}`);
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-gray-50 min-h-screen">
      
      {/* Шапка с кнопкой Назад */}
      <header className="flex items-center mb-8 mt-4 relative">
        <Link 
          href="/audit" 
          className="absolute left-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-lg font-black text-gray-900">Новая проверка</h1>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold">
          Загрузка данных...
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-8">
          
          {/* КРАСОЧНЫЙ ВЫБОР ТОЧКИ */}
          <div>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 ml-1">1. Выберите точку</h2>
            <div className="grid grid-cols-2 gap-3">
              {locations.map((loc: any) => (
                <div 
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`relative p-4 rounded-3xl cursor-pointer border-2 transition-all duration-200 overflow-hidden group ${
                    selectedLocation === loc.id 
                      ? 'border-[#F25C05] bg-orange-50 shadow-md scale-[0.98]' 
                      : 'border-transparent bg-white shadow-sm hover:border-orange-200'
                  }`}
                >
                  {/* Декоративный фоновый элемент */}
                  <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 transition-colors ${selectedLocation === loc.id ? 'bg-[#F25C05]' : 'bg-gray-400 group-hover:bg-orange-300'}`}></div>
                  
                  <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center text-white font-bold text-lg ${selectedLocation === loc.id ? 'bg-[#F25C05] shadow-lg shadow-orange-500/30' : 'bg-gray-800'}`}>
                    📍
                  </div>
                  <div className={`font-black text-sm leading-tight ${selectedLocation === loc.id ? 'text-[#F25C05]' : 'text-gray-900'}`}>
                    {loc.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* КРАСОЧНЫЙ ВЫБОР ЧЕК-ЛИСТА (Появляется только после выбора точки) */}
          <div className={`transition-all duration-500 ${selectedLocation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 ml-1">2. Выберите чек-лист</h2>
            <div className="grid grid-cols-1 gap-3">
              {checklists.map((chk: any) => (
                <div 
                  key={chk.id}
                  onClick={() => setSelectedChecklist(chk.id)}
                  className={`flex items-center p-4 rounded-3xl cursor-pointer border-2 transition-all duration-200 ${
                    selectedChecklist === chk.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-[0.99]' 
                      : 'border-transparent bg-white shadow-sm hover:border-blue-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl mr-4 flex items-center justify-center text-xl shadow-inner ${selectedChecklist === chk.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    📋
                  </div>
                  <div>
                    <div className={`font-black text-lg leading-tight ${selectedChecklist === chk.id ? 'text-blue-700' : 'text-gray-900'}`}>
                      {chk.title}
                    </div>
                    <div className="text-xs text-gray-400 font-bold mt-1">Основной чек-лист</div>
                  </div>
                  
                  {selectedChecklist === chk.id && (
                    <div className="ml-auto text-blue-500">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1"></div>

          {/* Кнопка продолжить */}
          <button 
            onClick={handleContinue}
            disabled={!selectedLocation || !selectedChecklist}
            className="w-full bg-[#F25C05] text-white py-5 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 disabled:bg-gray-300 disabled:shadow-none mb-4"
          >
            Начать заполнение
          </button>
        </div>
      )}
    </div>
  );
}