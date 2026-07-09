'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation'; 
import { APP_VERSION } from '@/lib/version'; 
import PushSubscribe from '@/components/PushSubscribe'; 
import { ThemeToggle } from '@/components/ThemeToggle'; 

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); 
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/admin', label: 'Дэшборд' },
    { href: '/admin/users', label: 'Сотрудники' },
    { href: '/admin/locations', label: 'Точки' },
    { href: '/admin/checklists', label: 'Чек-листы' },
    { href: '/admin/audits', label: 'Аудиты' },
    { href: '/admin/schedule', label: 'Календарь проверок' }, 
  ];

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-zinc-950 bg-dotted transition-colors duration-300 flex flex-col md:flex-row relative">
      
      {/* --- МОБИЛЬНАЯ ШАПКА --- */}
      <div className="md:hidden bg-[#0a0a0a]/90 dark:bg-zinc-900/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-50 shadow-md border-b border-zinc-800 transition-colors duration-300">
        <div className="flex items-center gap-3">
          {/* ЛОГОТИП (МОБИЛЬНАЯ ВЕРСИЯ) */}
          <div className="relative flex items-center">
            <Image 
              src="/logo3.png" 
              alt="UPPETIT" 
              width={120} 
              height={28} 
              className="object-contain relative z-10 dark:hidden" 
              priority
              unoptimized 
            />
            <Image 
              src="/logo.jpg" 
              alt="UPPETIT" 
              width={120} 
              height={28} 
              className="object-contain hidden dark:block relative z-10" 
              priority
              unoptimized 
            />
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5 border-l border-zinc-800 pl-3 relative z-10">
            Админ
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white focus:outline-none bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 rounded-lg active:scale-95 transition-all"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- БОКОВОЕ МЕНЮ (САЙДБАР) ПК --- */}
      {/* ИСПРАВЛЕНИЕ: Добавлен md:sticky md:top-0 md:h-screen, чтобы зафиксировать сайдбар */}
      <aside className={`
        fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-[70]
        w-64 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-zinc-800/50 flex flex-col shadow-2xl md:shadow-sm
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* ВЕРХНЯЯ ЧАСТЬ САЙДБАРА (ЛОГОТИП) */}
        <div className="shrink-0 p-6 mb-4 hidden md:block">
          <div className="relative inline-block mb-3">
            <Image 
              src="/logo3.png" 
              alt="UPPETIT" 
              width={160} 
              height={40} 
              className="object-contain relative z-10 dark:hidden" 
              priority
              unoptimized 
            />
            <Image 
              src="/logo.jpg" 
              alt="UPPETIT" 
              width={160} 
              height={40} 
              className="object-contain hidden dark:block relative z-10" 
              priority
              unoptimized 
            />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 font-bold ml-1 transition-colors relative z-10">
            Админ-панель
          </div>
        </div>

        <div className="h-4 shrink-0 md:hidden"></div>

        {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ (НАВИГАЦИЯ, СКРОЛЛИТСЯ) */}
        <div className="flex-1 px-4 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="px-1">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push('/audit/new?backTo=/admin/audits');
              }}
              className="flex items-center justify-center gap-2 w-full bg-[#F25C05] dark:bg-[#E65604] hover:bg-orange-600 dark:hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all duration-300 shadow-md shadow-orange-500/10 hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-95 text-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Провести аудит
            </button>
          </div>

          <nav className="space-y-1.5 pb-4">
            {navLinks.map((link) => {
              const isActive = link.href === '/admin' 
                ? pathname === '/admin' 
                : pathname.startsWith(link.href);

              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#F25C05] dark:bg-[#E65604] text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 scale-[1.02]'
                      : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-100 hover:translate-x-1'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* НИЖНЯЯ ЧАСТЬ (ФИКСИРОВАННАЯ ПАНЕЛЬ ИНСТРУМЕНТОВ) */}
        {/* ИСПРАВЛЕНИЕ: Новый премиальный дизайн для нижней панели */}
        <div className="shrink-0 p-4 bg-gray-50/50 dark:bg-zinc-950/30 border-t border-gray-200/50 dark:border-zinc-800/50 transition-colors duration-300">
          
          <div className="bg-white dark:bg-zinc-900/80 border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl p-2 shadow-sm flex flex-col gap-1 transition-colors duration-300">
            {/* Строка с темой */}
            <div className="flex items-center justify-between px-2 py-2">
               <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest transition-colors">Тема</span>
               <ThemeToggle />
            </div>

            {/* Уведомления */}
            <div className="px-1">
              <PushSubscribe />
            </div>

            <div className="h-px w-full bg-gray-100 dark:bg-zinc-800/80 my-1 transition-colors"></div>

            {/* Кнопка выхода */}
            <button 
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all duration-300 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.825" />
              </svg>
              Выйти из системы
            </button>
          </div>
          
          <div className="mt-4 text-center text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em] transition-colors">
            Версия {APP_VERSION}
          </div>
        </div>
      </aside>

      {/* --- ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ --- */}
      <main 
        key={pathname} 
        className="flex-1 p-0 md:p-8 overflow-x-hidden text-gray-900 dark:text-zinc-100 transition-colors duration-300 animate-page-fade"
      >
        {children}
      </main>
      
    </div>
  );
}