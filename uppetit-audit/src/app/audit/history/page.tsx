'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuditHistory } from '@/hooks/useAuditHistory';
import { AuditCard } from '@/components/audits/AuditCard';

export default function AuditHistoryPage() {
  const { audits, isLoading } = useAuditHistory();
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    locations: [] as string[],
    auditors: [] as string[],
  });

  const [openDropdown, setOpenDropdown] = useState<'locations' | 'auditors' | null>(null);

  const uniqueLocations = Array.from(new Set(audits.map(a => a.locationName || a.location?.name || 'Удалена'))).filter(Boolean).sort();
  const uniqueAuditors = Array.from(new Set(audits.map(a => a.auditorName || a.user?.login || 'Удален'))).filter(Boolean).sort();

  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      const auditDateStr = new Date(audit.date).toISOString().split('T')[0];
      const locName = audit.locationName || audit.location?.name || 'Удалена';
      const auditorName = audit.auditorName || audit.user?.login || 'Удален';

      const matchDateFrom = filters.dateFrom ? auditDateStr >= filters.dateFrom : true;
      const matchDateTo = filters.dateTo ? auditDateStr <= filters.dateTo : true;
      const matchLocation = filters.locations.length === 0 || filters.locations.includes(locName);
      const matchAuditor = filters.auditors.length === 0 || filters.auditors.includes(auditorName);

      return matchDateFrom && matchDateTo && matchLocation && matchAuditor;
    });
  }, [audits, filters]);

  const handleExport = async () => {
    if (filteredAudits.length === 0) return alert('Нет данных для выгрузки');
    
    try {
      setIsExporting(true);
      const auditIds = filteredAudits.map(a => a.id);
      
      const response = await fetch('/api/audits/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditIds })
      });

      if (!response.ok) throw new Error('Ошибка скачивания');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Мои_Локации_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Не удалось сформировать Excel');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(filteredAudits.length / itemsPerPage) || 1;
  const paginatedAudits = filteredAudits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleFilterItem = (key: 'locations' | 'auditors', value: string) => {
    setFilters(prev => {
      const currentList = prev[key];
      const updatedList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
      return { ...prev, [key]: updatedList };
    });
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', locations: [], auditors: [] });
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const isAnyFilterActive = filters.dateFrom || filters.dateTo || filters.locations.length > 0 || filters.auditors.length > 0;

  const renderMultiSelect = (label: string, options: string[], filterKey: 'locations' | 'auditors') => {
    const selectedCount = filters[filterKey].length;
    const isOpen = openDropdown === filterKey;

    return (
      <div key={filterKey} className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wider transition-colors">{label}</label>
        
        <div 
          onClick={() => setOpenDropdown(isOpen ? null : filterKey)}
          className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border outline-none font-bold text-sm cursor-pointer flex justify-between items-center transition-colors ${isOpen ? 'border-[#F25C05] bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100' : 'border-gray-100 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100/50 dark:hover:bg-zinc-700/50'}`}
        >
          <span className="truncate pr-2">
            {selectedCount === 0 ? 'Все' : `Выбрано: ${selectedCount}`}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}></div>
            <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[240px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar transition-colors">
              {options.map(option => {
                const isChecked = filters[filterKey].includes(option);
                return (
                  <div 
                    key={option} 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      toggleFilterItem(filterKey, option);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[#F25C05] border-[#F25C05]' : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-[#F25C05]'}`}>
                      {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm truncate select-none transition-colors ${isChecked ? 'font-bold text-gray-900 dark:text-zinc-100' : 'font-medium text-gray-700 dark:text-zinc-400'}`}>{option}</span>
                  </div>
                );
              })}
              {options.length === 0 && (
                <div className="p-3 text-center text-sm font-bold text-gray-400 dark:text-zinc-600">Нет данных</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400 dark:text-zinc-500 transition-colors">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 md:bg-transparent dark:bg-zinc-950 dark:md:bg-transparent flex flex-col relative pb-20 transition-colors duration-300">
      
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

      {/* ШАПКА */}
      <header className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md p-4 sm:p-6 shadow-sm sticky top-0 z-30 flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <Link href="/audit" className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 active:scale-95 transition-all flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-zinc-100 truncate transition-colors">История</h1>
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-zinc-500 font-bold mt-0.5 uppercase tracking-wider truncate transition-colors">Аудиты на вашей территории</p>
          </div>
        </div>
        
        {filteredAudits.length > 0 && (
          <button 
            onClick={handleExport} 
            disabled={isExporting}
            className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-900/30 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? '⏳' : '📊'} <span className="hidden sm:inline">Выгрузить Excel</span>
          </button>
        )}
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full flex flex-col gap-6 relative z-10">
        
        {/* ПАНЕЛЬ ФИЛЬТРОВ */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-gray-900 dark:text-zinc-100 transition-colors">Фильтры поиска</h2>
            {isAnyFilterActive && (
              <button onClick={resetFilters} className="text-xs font-bold text-[#F25C05] hover:text-orange-600 dark:hover:text-[#CC4D03] bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg transition-colors">
                ✕ Сбросить всё
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            
            <div className="relative z-10 lg:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wider transition-colors">Период (От и До)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filters.dateFrom}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                />
                <span className="text-gray-300 dark:text-zinc-600 font-bold transition-colors">-</span>
                <input 
                  type="date" 
                  value={filters.dateTo}
                  onChange={(e) => handleDateChange('dateTo', e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {renderMultiSelect('Точки', uniqueLocations, 'locations')}
            {renderMultiSelect('Аудиторы', uniqueAuditors, 'auditors')}
            
          </div>
        </div>

        {/* СПИСОК АУДИТОВ (Карточки) */}
        <div className="space-y-4">
          {paginatedAudits.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 border-dashed transition-colors">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 dark:text-zinc-400 font-bold transition-colors">По вашему запросу аудитов не найдено.</p>
            </div>
          ) : (
            paginatedAudits.map((audit) => (
              <AuditCard 
                key={audit.id} 
                audit={audit as any} 
                onZoomPhoto={setZoomedPhoto} 
              />
            ))
          )}
        </div>

        {/* ПАГИНАЦИЯ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              ← Назад
            </button>
            <div className="text-sm font-bold text-gray-500 dark:text-zinc-400 transition-colors">
              Стр. <span className="text-gray-900 dark:text-zinc-100">{currentPage}</span> из {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Вперед →
            </button>
          </div>
        )}

      </main>
    </div>
  );
}