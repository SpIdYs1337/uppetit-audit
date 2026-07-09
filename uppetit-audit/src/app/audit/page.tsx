'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut, getSession } from 'next-auth/react'; 
import Image from 'next/image';
import PushSubscribe from '@/components/PushSubscribe';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuditDashboard() {
  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window !== 'undefined') return !!localStorage.getItem('last_active_audit');
    return false;
  });
  const [userRole, setUserRole] = useState<string | null>(null); 

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      setUserRole((session?.user as any)?.role || null);
    };
    checkSession();

    const draft = localStorage.getItem('last_active_audit');
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 w-full bg-transparent transition-colors duration-300 relative z-10">
      
      {/* ШАПКА: На мобилках простая, на ПК в виде плашки с эффектом стекла */}
      <header className="flex justify-between items-center mb-8 md:mb-10 mt-2 md:mt-4 md:bg-white/80 dark:md:bg-zinc-900/80 md:backdrop-blur-xl md:p-6 rounded-3xl md:rounded-[2rem] md:shadow-sm md:border border-transparent md:border-white/50 dark:md:border-zinc-800/50 transition-colors duration-300 z-20 relative">
        <div>
          {/* ЛОГОТИП */}
          <div className="relative inline-block mb-1">
            {/* Черный лого для светлой темы */}
            <Image 
              src="/logo3.png" 
              alt="UPPETIT" 
              width={140} 
              height={34} 
              className="object-contain relative z-10 dark:hidden" 
              priority 
              unoptimized 
            />
            {/* Белый лого для темной темы */}
            <Image 
              src="/logo.jpg" 
              alt="UPPETIT" 
              width={140} 
              height={34} 
              className="object-contain hidden dark:block relative z-10" 
              priority 
              unoptimized 
            />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 font-bold mt-1 md:ml-1 transition-colors relative z-10">
            Аудит качества
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />
          
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-10 h-10 md:w-auto md:px-5 md:py-2.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md md:bg-white/50 dark:md:bg-zinc-800/50 border border-gray-200/50 dark:border-zinc-700/50 rounded-full md:rounded-xl flex items-center justify-center gap-2 text-gray-700 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-900/50 transition-all shadow-sm active:scale-95"
          >
            <span className="hidden md:block text-sm font-bold">Выйти</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.825" />
            </svg>
          </button>
        </div>
      </header>

      {/* ПРИВЕТСТВИЕ */}
      <div className="mb-8 md:mb-10 relative z-10">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Привет! </h1>
        <p className="text-gray-500 dark:text-zinc-400 font-medium mt-2 text-sm md:text-base transition-colors">Выбери, что хочешь сделать</p>
      </div>

      {/* СЕТКА КНОПОК */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 relative z-10">
        
        {hasDraft && (
          <Link href="/audit/run" className="col-span-1 md:col-span-2 block w-full bg-blue-600/90 dark:bg-blue-600/80 backdrop-blur-xl border border-blue-500/50 dark:border-blue-500/30 text-white p-6 md:p-8 rounded-[2rem] shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-black mb-1">Продолжить аудит</h2>
              <p className="text-blue-100/90 text-sm md:text-base font-medium">У вас есть незавершенная проверка</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 md:w-48 md:h-48 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all"></div>
          </Link>
        )}

        <Link href="/audit/new" className="block w-full bg-[#F25C05]/95 dark:bg-[#E65604]/90 backdrop-blur-xl border border-orange-400/50 dark:border-orange-500/30 text-white p-6 md:p-8 rounded-[2rem] shadow-lg shadow-orange-500/20 dark:shadow-orange-900/30 active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black mb-1">Начать проверку</h2>
            <p className="text-orange-100/90 text-sm font-medium">Новый аудит точки</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all"></div>
        </Link>

        {userRole === 'TU' && (
          <Link href="/audit/tu" className="block w-full bg-zinc-900/90 dark:bg-zinc-800/80 backdrop-blur-xl text-white p-6 md:p-8 rounded-[2rem] shadow-lg active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden group border border-zinc-700/50">
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-black mb-1 flex items-center gap-2">
                <span>🏢</span> Мои точки
              </h2>
              <p className="text-zinc-400 text-sm font-medium">Отчеты по вашей территории</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          </Link>
        )}

        <Link href="/audit/schedule" className="block w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-white/50 dark:border-zinc-800/50 active:scale-[0.98] hover:-translate-y-1 hover:shadow-md transition-all duration-300 group">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-zinc-100 mb-1 transition-colors">Мой план</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium transition-colors">Календарь будущих проверок</p>
        </Link>

        <Link href="/audit/history" className="block w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 text-gray-900 dark:text-zinc-100 p-6 md:p-8 rounded-[2rem] shadow-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <h2 className="text-xl md:text-2xl font-black mb-1 transition-colors">История проверок</h2>
          <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium transition-colors">Посмотреть прошлые аудиты</p>
        </Link>
        
        <Link href="/audit/guide" className="block w-full bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-xl border border-blue-100/50 dark:border-blue-900/30 text-gray-900 dark:text-zinc-100 p-6 md:p-8 rounded-[2rem] shadow-sm active:scale-[0.98] hover:-translate-y-1 hover:shadow-md transition-all duration-300 group">
          <h2 className="text-xl md:text-2xl font-black text-blue-700 dark:text-blue-400 md:text-gray-900 dark:md:text-zinc-100 mb-1 flex items-center gap-2 transition-colors">
            <span>📖</span> Инструкция
          </h2>
          <p className="text-blue-600/80 dark:text-blue-400/80 md:text-gray-500 dark:md:text-zinc-400 text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">Как правильно проводить аудит</p>
        </Link>

      </div>

      {(userRole === 'TU' || userRole === 'ADMIN') && (
        <div className="mt-8 md:mt-12 pt-6 border-t border-gray-200/50 dark:border-zinc-800/50 flex justify-center md:justify-start transition-colors duration-300 relative z-10">
          <PushSubscribe />
        </div>
      )}

    </div>
  );
}