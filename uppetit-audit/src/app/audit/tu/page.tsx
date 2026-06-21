'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTuLocations } from '@/hooks/useTuLocations';
import { TuLocationCard } from '@/components/tu/TuLocationCard';

export default function TuLocationsPage() {
  const { locations, audits, isLoading } = useTuLocations();
  const [searchQuery, setSearchQuery] = useState('');

  // Фильтруем точки по введенному тексту
  const filteredLocations = locations?.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative pb-20">
      
      <header className="bg-white p-4 sm:p-6 shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4 sm:mb-6">
          <Link href="/audit" className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-all flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate">Мои точки</h1>
            <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider truncate">Зона ответственности ТУ</p>
          </div>
        </div>

        {/* ПОИСК ПО ТОЧКАМ */}
        {locations && locations.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Найти точку..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none text-sm font-bold text-gray-700 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10 max-w-3xl mx-auto w-full relative z-10">
        {!locations || locations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 border-dashed">
            <div className="text-4xl mb-3">📍</div>
            <p className="text-gray-500 font-bold text-sm">У вас пока нет привязанных точек.</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 border-dashed">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 font-bold text-sm">По вашему запросу точки не найдены.</p>
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