'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/lib/version';

export default function UpdateChecker() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Усиленная защита от кэширования браузером и Next.js
        const res = await fetch(`/api/version?t=${new Date().getTime()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Проверяем, что версия пришла и она отличается от локальной
          if (data.version && data.version !== APP_VERSION) {
            setHasUpdate(true);
          }
        } else {
          console.warn(`UpdateChecker: Ошибка ответа API. Статус: ${res.status}`);
        }
      } catch (err) { 
        console.error('Ошибка проверки обновлений', err); 
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 600000); // Проверка каждые 10 минут
    
    const handleVisibilityChange = () => { 
      if (document.visibilityState === 'visible') checkVersion(); 
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { 
      clearInterval(interval); 
      document.removeEventListener('visibilitychange', handleVisibilityChange); 
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      window.location.reload();
    } catch (error) { 
      window.location.reload(); 
    }
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl border border-orange-100 dark:border-orange-900/30 flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 text-[#F25C05] dark:text-orange-400 flex items-center justify-center text-xl shrink-0 transition-colors">
            🚀
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 transition-colors">Доступно обновление!</h3>
            <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 mt-0.5 transition-colors">Вышла новая версия приложения.</p>
          </div>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className={`text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all whitespace-nowrap active:scale-95 ${isUpdating ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#F25C05] dark:bg-[#E65604] hover:bg-orange-600 dark:hover:bg-[#CC4D03]'}`}
        >
          {isUpdating ? 'Обновляем...' : 'Обновить'}
        </button>
      </div>
    </div>
  );
}