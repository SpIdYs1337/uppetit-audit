'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
// ИСПРАВЛЕНО: Добавили useRouter для корректного перехода
import { usePathname, useRouter } from 'next/navigation'; 
import { APP_VERSION } from '@/lib/version'; 
import PushSubscribe from '@/components/PushSubscribe'; 

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); 
  const router = useRouter(); // Инициализируем роутер
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/admin/users', label: 'Сотрудники' },
    { href: '/admin/locations', label: 'Точки' },
    { href: '/admin/checklists', label: 'Чек-листы' },
    { href: '/admin/audits', label: 'Аудиты' },
    { href: '/admin/schedule', label: 'Календарь проверок' }, 
  ];

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col md:flex-row">
      
      {/* --- МОБИЛЬНАЯ ШАПКА --- */}
      {/* ИСПРАВЛЕНО: Повысили z-index до 50 */}
      <div className="md:hidden bg-[#0a0a0a] p-4 flex justify-between items-center sticky top-0 z-50 shadow-md border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.jpg" 
            alt="UPPETIT" 
            width={100} 
            height={24} 
            className="object-contain" 
            priority 
          />
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5 border-l border-zinc-800 pl-3">
            Админ
          </span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white focus:outline-none bg-zinc-900 border border-zinc-800 rounded-lg active:scale-95 transition-all"
        >
          {isMobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Затемнение фона при открытом мобильном меню */}
      {isMobileMenuOpen && (
        <div 
          /* ИСПРАВЛЕНО: Повысили z-index до 60 */
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- БОКОВОЕ МЕНЮ (САЙДБАР) ПК --- */}
      {/* ИСПРАВЛЕНО: Повысили z-index до 70 */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-[70]
        w-64 bg-white border-r border-gray-200 flex flex-col shadow-2xl md:shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* --- ШАПКА ДЛЯ ПК --- */}
        <div className="p-6 mb-2 hidden md:block">
          <Image 
            src="/logo3.png" 
            alt="UPPETIT" 
            width={130} 
            height={32} 
            className="object-contain mb-2" 
            priority
            unoptimized 
          />
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold ml-1">
            Админ-панель
          </div>
        </div>

        {/* Отступ на мобилках */}
        <div className="h-4 md:hidden"></div>

        {/* --- НАВИГАЦИЯ --- */}
        <div className="flex-1 px-4 space-y-4 overflow-y-auto">
          
          <div className="px-1">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push('/audit/new?backTo=/admin/audits');
              }}
              className="flex items-center justify-center gap-2 w-full bg-[#F25C05] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-95 text-center cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Провести аудит
            </button>
          </div>

          <nav className="space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);

              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    isActive 
                      ? 'bg-[#F25C05] text-white shadow-md shadow-orange-500/20'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* --- НИЖНЯЯ ПАНЕЛЬ СЕРВИСОВ --- */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
          <div className="mb-2">
            <PushSubscribe />
          </div>

          <button 
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-4 py-3 text-gray-500 hover:text-red-500 font-bold transition-all rounded-xl hover:bg-red-50"
          >
            Выйти из системы
          </button>
          
          <div className="mt-2 text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
            Версия {APP_VERSION}
          </div>
        </div>
        
      </aside>

      {/* --- ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ --- */}
      <main className="flex-1 p-0 md:p-8 overflow-x-hidden">
        {children}
      </main>
      
    </div>
  );
}