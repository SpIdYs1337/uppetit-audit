'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/lib/version';

export default function UpdateChecker() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Добавляем случайный параметр, чтобы телефон точно не кэшировал этот запрос
        const res = await fetch(`/api/version?t=${new Date().getTime()}`);
        if (res.ok) {
          const data = await res.json();
          // Если версия сервера отличается от версии в браузере сотрудника
          if (data.version !== APP_VERSION) {
            setHasUpdate(true);
          }
        }
      } catch (err) {
        console.error('Ошибка проверки обновлений', err);
      }
    };

    // Проверяем при загрузке
    checkVersion();

    // Проверяем каждые 10 минут (600000 мс), если приложение просто висит открытым
    const interval = setInterval(checkVersion, 600000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    // Жестко перезагружаем страницу с очисткой кэша
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-orange-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 text-[#F25C05] flex items-center justify-center text-xl">
            🚀
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Доступно обновление!</h3>
            <p className="text-[11px] font-bold text-gray-400 mt-0.5">Вышла новая версия приложения.</p>
          </div>
        </div>
        <button 
          onClick={handleUpdate}
          className="bg-[#F25C05] hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
        >
          Обновить
        </button>
      </div>
    </div>
  );
}