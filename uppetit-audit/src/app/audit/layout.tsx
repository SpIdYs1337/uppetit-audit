'use client';
import { usePathname } from 'next/navigation';

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 md:bg-[#F5F6F8] md:dark:bg-zinc-950 bg-dotted transition-colors duration-300">
      <div 
        key={pathname}
        className="w-full max-w-5xl mx-auto min-h-screen flex flex-col relative animate-page-fade"
      >
        {children}
      </div>
    </div>
  );
}