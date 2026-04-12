'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { APP_VERSION } from '@/lib/version'; // <-- ДОБАВИЛИ ЭТУ СТРОКУ

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Состояние для мобильного меню

  const navLinks = [
    { href: '/admin/users', label: 'Сотрудники' },
    { href: '/admin/locations', label: 'Точки' },
    { href: '/admin/checklists', label: 'Чек-листы' },
    { href: '/admin/audits', label: 'Аудиты' },
    { href: '/admin/schedule', label: 'Календарь проверок' }, 
  ];

  return (
    // На мобильных - колонка, на ПК - строка
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col md:flex-row">
      
      {/* --- МОБИЛЬНАЯ ШАПКА (видна только на экранах меньше 768px) --- */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="text-xl font-black text-black tracking-tighter">
          UPPETIT <span className="text-[10px] text-gray-400 ml-1 uppercase tracking-wider">Админ</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-500 hover:text-black focus:outline-none bg-gray-50 rounded-lg active:scale-95 transition-all"
        >
          {/* Иконка меняется с "бургера" на "крестик" */}
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Затемнение фона при открытом мобильном меню */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- БОКОВОЕ МЕНЮ (САЙДБАР) --- */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col shadow-2xl md:shadow-sm
        transform transition-transform duration-300 ease-in-out
        /* На мобилках выезжает/заезжает, на ПК всегда на месте */
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Логотип для ПК */}
        <div className="p-6 mb-4 hidden md:block">
          <div className="text-2xl font-black text-black tracking-tighter">UPPETIT</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
            Админ-панель
          </div>
        </div>

        {/* Отступ на мобилках, чтобы не прилипало к верху */}
        <div className="h-4 md:hidden"></div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            // Подсветка активной вкладки
            const isActive = pathname.startsWith(link.href);

            return (
              <Link 
                key={link.href} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)} // Закрываем меню при переходе на мобилке
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

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-4 py-3 text-gray-500 hover:text-red-500 font-bold transition-all rounded-xl hover:bg-red-50"
          >
            Выйти из системы
          </button>
          
          {/* --- НОВЫЙ БЛОК: ВЫВОД ВЕРСИИ --- */}
          <div className="mt-4 text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
            Версия {APP_VERSION}
          </div>
        </div>
        
      </aside>

      {/* --- ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ --- */}
      {/* На мобилках отступы меньше (p-4), на ПК больше (md:p-8) */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>
      
    </div>
  );
}