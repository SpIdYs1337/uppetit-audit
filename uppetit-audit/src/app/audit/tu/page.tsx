'use client';

import Link from 'next/link';
import { useTuLocations } from '@/hooks/useTuLocations';
import { TuLocationCard } from '@/components/tu/TuLocationCard';

export default function TuLocationsPage() {
  const { locations, audits, isLoading } = useTuLocations();

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">Мои точки</h1>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Зона ответственности ТУ</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10 max-w-3xl mx-auto w-full">
        {locations.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 font-medium text-sm">У вас пока нет привязанных точек</div>
        ) : (
          locations.map((loc) => (
            <TuLocationCard 
              key={loc.id} 
              loc={loc} 
              audits={audits} 
            />
          ))
        )}
      </main>
    </div>
  );
}