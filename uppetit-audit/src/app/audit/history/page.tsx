'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuditHistory } from '@/hooks/useAuditHistory';
import { AuditCard } from '@/components/audits/AuditCard';

export default function AuditHistoryPage() {
  const { audits, isLoading } = useAuditHistory();
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      
      {/* Окно полноэкранного просмотра фото (остается на уровне страницы, чтобы перекрывать всё) */}
      {zoomedPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity"
          onClick={() => setZoomedPhoto(null)}
        >
          <img src={zoomedPhoto} alt="Увеличенное фото" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          <button className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-colors">
            ✕
          </button>
        </div>
      )}

      <header className="bg-white p-4 sm:p-6 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">История</h1>
          <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wider truncate">Ваши прошлые проверки</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10 max-w-3xl mx-auto w-full">
        {audits.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 font-medium text-sm">Вы еще не провели ни одного аудита</div>
        ) : (
          audits.map((audit) => (
            <AuditCard 
              key={audit.id} 
              audit={audit} 
              onZoomPhoto={setZoomedPhoto} 
            />
          ))
        )}
      </main>
    </div>
  );
}