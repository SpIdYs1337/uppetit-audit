'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut, getSession } from 'next-auth/react'; // ИЗМЕНЕНО: используем getSession
import Image from 'next/image';
import PushSubscribe from '@/components/PushSubscribe';

export default function AuditDashboard() {
  const [hasDraft, setHasDraft] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null); // Состояние для роли

  useEffect(() => {
    // 1. Узнаем, кто зашел (ТУ или обычный аудитор)
    const checkSession = async () => {
      const session = await getSession();
      setUserRole((session?.user as any)?.role || null);
    };
    checkSession();

    // 2. Проверяем, есть ли в памяти устройства незаконченный аудит
    const draft = localStorage.getItem('last_active_audit');
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full">
      
      <header className="flex justify-between items-center mb-10 mt-4">
        <div>
          <Image src="/logo.jpg" alt="UPPETIT" width={120} height={30} className="object-contain" priority />
          <div className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold mt-1">
            Аудит качества
          </div>
        </div>
        
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.825" />
          </svg>
        </button>
      </header>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Привет! 👋</h1>
        <p className="text-gray-500 font-medium mt-2 text-sm">Выбери, что хочешь сделать</p>
      </div>

      <div className="space-y-4">
        
        {/* КНОПКА ЧЕРНОВИКА */}
        {hasDraft && (
          <Link href="/audit/run" className="block w-full bg-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-1">Продолжить аудит</h2>
              <p className="text-blue-100 text-sm font-medium">У вас есть незавершенная проверка</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
          </Link>
        )}

        <Link href="/audit/new" className="block w-full bg-[#F25C05] text-white p-6 rounded-3xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-1">Начать проверку</h2>
            <p className="text-orange-100 text-sm font-medium">Новый аудит точки</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </Link>

        <Link href="/audit/schedule" className="block w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
          <h2 className="text-xl font-black text-gray-900 mb-1">Мой план</h2>
          <p className="text-sm text-gray-500 font-medium">Календарь будущих проверок</p>
        </Link>

        <Link href="/audit/history" className="block w-full bg-gray-50 border border-gray-100 text-gray-900 p-6 rounded-3xl active:scale-[0.98] transition-all">
          <h2 className="text-xl font-bold mb-1">История проверок</h2>
          <p className="text-gray-500 text-sm font-medium">Посмотреть прошлые аудиты</p>
        </Link>

        {/* НОВАЯ КНОПКА ТОЛЬКО ДЛЯ ТУ */}
        {userRole === 'TU' && (
          <Link href="/audit/tu" className="block w-full bg-zinc-900 text-white p-6 rounded-3xl shadow-lg active:scale-[0.98] transition-all relative overflow-hidden mt-2">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <span>🏢</span> Мои точки
              </h2>
              <p className="text-zinc-400 text-sm font-medium">Отчеты по вашей территории</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          </Link>
        )}
        <div className="space-y-4">
        {/* ... твои старые кнопки (Начать проверку, Мои точки и т.д.) ... */}

        {/* Кнопка включения уведомлений (будет полезна для ТУ) */}
        {(userRole === 'TU' || userRole === 'ADMIN') && (
          <div className="pt-4 border-t border-gray-200">
            <PushSubscribe />
          </div>
        )}
      </div>

      </div>

    </div>
  );
}