'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTuLocations } from '@/hooks/useTuLocations';
import { TuLocationCard } from '@/components/tu/TuLocationCard';

export default function TuLocationsPage() {
  const { locations, audits, isLoading } = useTuLocations();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = locations?.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 dark:text-zinc-500 bg-transparent transition-colors">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative pb-20 transition-colors duration-300">
      
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-4 sm:p-6 shadow-sm sticky top-0 z-30 border-b border-white/50 dark:border-zinc-800/50 transition-colors">
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <Link href="/audit" className="w-10 h-10 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-100 dark:border-zinc-700/50 active:scale-95 transition-all flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 truncate transition-colors">Мои точки</h1>
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-zinc-500 font-bold mt-1 uppercase tracking-wider truncate transition-colors">Зона ответственности ТУ</p>
          </div>
        </div>

        {/* ПОИСК ПО ТОЧКАМ */}
        {locations && locations.length > 0 && (
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Найти точку..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 sm:pl-14 pr-4 py-3.5 sm:py-4 rounded-2xl border border-white/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#F25C05] dark:focus:border-[#F25C05] outline-none text-sm font-bold text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 transition-all shadow-inner focus:shadow-md"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 font-bold transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-4 pb-10 max-w-3xl mx-auto w-full relative z-10">
        {!locations || locations.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[2rem] border border-gray-200/50 dark:border-zinc-800/50 border-dashed transition-colors shadow-sm">
            <div className="text-5xl mb-4 opacity-80">📍</div>
            <p className="text-gray-500 dark:text-zinc-400 font-bold text-base transition-colors">У вас пока нет привязанных точек.</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-[2rem] border border-gray-200/50 dark:border-zinc-800/50 border-dashed transition-colors shadow-sm">
            <div className="text-5xl mb-4 opacity-80">🔍</div>
            <p className="text-gray-500 dark:text-zinc-400 font-bold text-base transition-colors">По вашему запросу точки не найдены.</p>
          </div>
        ) : (
          filteredLocations.map((loc) => (
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