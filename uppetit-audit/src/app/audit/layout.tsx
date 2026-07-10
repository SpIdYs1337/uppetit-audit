'use client';
import { usePathname } from 'next/navigation';

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // Убрали bg-dotted отсюда
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0a0a0a] transition-colors duration-300 relative overflow-hidden">
      
      {/* --- ФИКСИРОВАННЫЙ ФОН С ТОЧКАМИ (Решает проблему мобильных браузеров) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-dotted"></div>

      {/* --- ФОНОВЫЕ СВЕЧЕНИЯ (AMBIENT GLOW) --- */}
      {/* Главное оранжевое свечение сверху по центру */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] sm:w-[1000px] sm:h-[600px] bg-[#F25C05]/10 dark:bg-[#F25C05]/15 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none z-0"></div>
      
      {/* Дополнительное мягкое свечение снизу справа для объема */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-orange-400/5 dark:bg-orange-500/10 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Основной контент */}
      <div 
        key={pathname}
        className="w-full max-w-5xl mx-auto min-h-screen flex flex-col relative z-10 animate-page-fade"
      >
        {children}
      </div>
    </div>
  );
}