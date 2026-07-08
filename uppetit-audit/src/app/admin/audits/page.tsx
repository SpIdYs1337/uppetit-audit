'use client';

import { useState, useMemo } from 'react';
import React from 'react';
import { useAdminAudits } from '@/hooks/useAdminAudits';
import { AuditDetails } from '@/components/audits/AuditDetails';

export default function AdminAuditsPage() {
  const { audits, isLoading, deleteAudit, clearHistory } = useAdminAudits();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    locations: [] as string[],
    auditors: [] as string[],
    tus: [] as string[]
  });

  const [openDropdown, setOpenDropdown] = useState<'locations' | 'auditors' | 'tus' | null>(null);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const formatDate = (dateValue: Date | string) => {
    const d = new Date(dateValue);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Точно удалить этот аудит?')) return;
    try { await deleteAudit(id); } 
    catch { alert('Ошибка при удалении.'); } 
  };

  const handleClearHistory = async () => {
    if (!confirm('ВНИМАНИЕ! Это действие удалит АБСОЛЮТНО ВСЕ аудиты. Продолжить?')) return;
    if (!confirm('Вы абсолютно уверены? Это нельзя отменить.')) return;
    try {
      await clearHistory();
      setExpandedId(null);
    } catch { alert('Ошибка при очистке истории'); }
  };

  const uniqueLocations = Array.from(new Set(audits.map(a => a.locationName || a.location?.name || 'Удалена'))).filter(Boolean).sort();
  const uniqueAuditors = Array.from(new Set(audits.map(a => a.auditorName || a.user?.login || 'Удален'))).filter(Boolean).sort();
  
  const allTus = audits.flatMap(a => {
    if (a.tuName) {
      if (a.tuName === 'Не был назначен') return ['Не был назначен'];
      return a.tuName.split(',').map(s => s.trim()); 
    }
    if (a.location?.tus && a.location.tus.length > 0) {
      return a.location.tus.map(tu => tu.name || tu.login);
    }
    return ['Не был назначен'];
  });
  const uniqueTUs = Array.from(new Set(allTus)).filter(Boolean).sort();

  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      const auditDateStr = new Date(audit.date).toISOString().split('T')[0];
      
      const locName = audit.locationName || audit.location?.name || 'Удалена';
      const auditorName = audit.auditorName || audit.user?.login || 'Удален';
      
      let auditTus: string[] = ['Не был назначен'];
      if (audit.tuName) {
        if (audit.tuName !== 'Не был назначен') {
          auditTus = audit.tuName.split(',').map(s => s.trim());
        }
      } else if (audit.location?.tus && audit.location.tus.length > 0) {
        auditTus = audit.location.tus.map(tu => tu.name || tu.login);
      }

      const matchDateFrom = filters.dateFrom ? auditDateStr >= filters.dateFrom : true;
      const matchDateTo = filters.dateTo ? auditDateStr <= filters.dateTo : true;
      
      const matchLocation = filters.locations.length === 0 || filters.locations.includes(locName);
      const matchAuditor = filters.auditors.length === 0 || filters.auditors.includes(auditorName);
      const matchTu = filters.tus.length === 0 || filters.tus.some(tu => auditTus.includes(tu));

      return matchDateFrom && matchDateTo && matchLocation && matchAuditor && matchTu;
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
      a.download = `Аудиты_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
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

  const toggleFilterItem = (key: 'locations' | 'auditors' | 'tus', value: string) => {
    setFilters(prev => {
      const currentList = prev[key];
      const updatedList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
      return { ...prev, [key]: updatedList };
    });
    setCurrentPage(1);
    setExpandedId(null);
  };

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setExpandedId(null);
  };

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', locations: [], auditors: [], tus: [] });
    setCurrentPage(1);
    setExpandedId(null);
  };

  const isAnyFilterActive = filters.dateFrom || filters.dateTo || filters.locations.length > 0 || filters.auditors.length > 0 || filters.tus.length > 0;

  const renderMultiSelect = (label: string, options: string[], filterKey: 'locations' | 'auditors' | 'tus') => {
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

  if (isLoading) return <div className="p-4 md:p-8 text-center text-gray-500 dark:text-zinc-500 font-bold transition-colors">Загрузка данных...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative pb-20 transition-colors duration-300">

      {zoomedPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity" onClick={() => setZoomedPhoto(null)}>
          <img src={zoomedPhoto} alt="Увеличенное фото" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          <button className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full font-bold hover:bg-black/80 transition-colors">✕</button>
        </div>
      )}

      {/* ШАПКА */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-8 relative z-10 transition-colors">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">История проверок</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 md:mt-2 text-sm md:text-base transition-colors">
            Найдено аудитов: <span className="font-bold text-gray-800 dark:text-zinc-300">{filteredAudits.length}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {filteredAudits.length > 0 && (
            <button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full sm:w-auto text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-900/30 px-4 py-3 sm:py-2 rounded-xl font-bold text-sm transition-all text-center shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isExporting ? 'Формируем...' : '📊 Выгрузить в Excel'}
            </button>
          )}

          {audits.length > 0 && (
            <button 
              onClick={handleClearHistory} 
              className="w-full sm:w-auto text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30 px-4 py-3 sm:py-2 rounded-xl font-bold text-sm transition-all text-center shadow-sm active:scale-95"
            >
              Очистить историю
            </button>
          )}
        </div>
      </div>

      {/* ПАНЕЛЬ ФИЛЬТРОВ */}
      <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-6 relative z-20 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-black text-gray-900 dark:text-zinc-100 transition-colors">Фильтры поиска</h2>
          {isAnyFilterActive && (
            <button onClick={resetFilters} className="text-xs font-bold text-[#F25C05] hover:text-orange-600 dark:hover:text-[#CC4D03] bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg transition-colors">
              ✕ Сбросить всё
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          <div className="relative z-10">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wider transition-colors">Период (От и До)</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                className="w-full p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
              <span className="text-gray-300 dark:text-zinc-600 font-bold transition-colors">-</span>
              <input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                className="w-full p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {renderMultiSelect('Точки', uniqueLocations, 'locations')}
          {renderMultiSelect('Аудиторы', uniqueAuditors, 'auditors')}
          {renderMultiSelect('ТУ (Террит. упр.)', uniqueTUs, 'tus')}

        </div>
      </div>

      {/* ТАБЛИЦА */}
      {paginatedAudits.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 border-dashed relative transition-colors duration-300">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 dark:text-zinc-400 font-bold transition-colors">Аудиты по вашему запросу не найдены.</p>
        </div>
      ) : (
        <div className="bg-transparent md:bg-white dark:md:bg-zinc-900 rounded-none md:rounded-3xl shadow-none md:shadow-sm md:border border-gray-100 dark:border-zinc-800 overflow-hidden mb-6 relative transition-colors duration-300">
          <div className="md:overflow-x-auto">
            <table className="w-full text-left border-collapse md:min-w-[900px] block md:table">
              
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-gray-100 dark:border-zinc-800 uppercase text-[10px] tracking-wider text-gray-400 dark:text-zinc-500 bg-gray-50/50 dark:bg-zinc-800/50 transition-colors">
                  <th className="p-4 font-bold">Дата и время</th>
                  <th className="p-4 font-bold">Точка</th>
                  <th className="p-4 font-bold">Чек-лист</th>
                  <th className="p-4 font-bold">Аудитор</th>
                  <th className="p-4 font-bold">ТУ</th>
                  <th className="p-4 font-bold">Результат</th>
                  <th className="p-4 font-bold text-right">Действия</th>
                </tr>
              </thead>
              
              <tbody className="block md:table-row-group">
                {paginatedAudits.map((audit) => {
                  const maxScore = audit.maxScore || 0;
                  const isPerfect = audit.score === maxScore && maxScore > 0;
                  const isExpanded = expandedId === audit.id;

                  const locName = audit.locationName || audit.location?.name || 'Удалена';
                  const auditorName = audit.auditorName || audit.user?.login || 'Удален';
                  
                  let auditTusStr = 'Не был назначен';
                  if (audit.tuName) {
                    auditTusStr = audit.tuName;
                  } else if (audit.location?.tus && audit.location.tus.length > 0) {
                    auditTusStr = audit.location.tus.map(tu => tu.name || tu.login).join(', ');
                  }

                  return (
                    <React.Fragment key={audit.id}>
                      <tr 
                        onClick={() => toggleExpand(audit.id)} 
                        className={`block md:table-row bg-white dark:bg-zinc-900 md:bg-transparent md:dark:bg-transparent p-5 md:p-0 cursor-pointer transition-colors relative md:hover:bg-gray-50 dark:md:hover:bg-zinc-800/50 
                          ${isExpanded ? 'rounded-t-3xl md:rounded-none mb-0 border-b-0 md:border-b border-gray-100 dark:border-zinc-800 md:border-gray-50 dark:md:border-zinc-800 shadow-sm md:shadow-none' : 'rounded-3xl md:rounded-none mb-4 md:mb-0 border border-gray-100 dark:border-zinc-800 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 dark:md:border-zinc-800 shadow-sm md:shadow-none'}
                        `}
                      >
                        <td className="block md:table-cell p-0 md:p-4 text-xs md:text-sm font-bold text-gray-400 dark:text-zinc-500 md:text-gray-900 dark:md:text-zinc-100 mb-1 md:mb-0 uppercase md:normal-case transition-colors">
                          {formatDate(audit.date)}
                        </td>
                        <td className="block md:table-cell p-0 md:p-4 text-lg md:text-sm font-black md:font-bold text-gray-900 dark:text-zinc-100 mb-3 md:mb-0 pr-24 md:pr-0 leading-tight transition-colors">
                          {locName}
                        </td>
                        <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 dark:text-zinc-400 mb-1 md:mb-0 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Чек-лист:</span>
                            <span className="truncate max-w-[200px] block">{audit.checklist?.title || 'Удален'}</span>
                            {audit.checklist?.version && <span className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 text-[10px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors">v.{audit.checklist.version}</span>}
                          </div>
                        </td>
                        <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 dark:text-zinc-400 mb-1 md:mb-0 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Аудитор:</span>
                            <span className="font-bold md:font-normal text-gray-700 dark:text-zinc-300 md:text-gray-500 dark:md:text-zinc-400">{auditorName}</span>
                          </div>
                        </td>
                        <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 dark:text-zinc-400 mb-4 md:mb-0 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="md:hidden text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">ТУ:</span>
                            <span className="font-bold md:font-normal text-gray-700 dark:text-zinc-300 md:text-gray-500 dark:md:text-zinc-400">{auditTusStr}</span>
                          </div>
                        </td>
                        <td className="block md:table-cell absolute top-4 right-4 md:static p-0 md:p-4">
                          <span className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shadow-sm md:shadow-none transition-colors ${isPerfect ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30 md:border-0' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 md:border-0'}`}>
                            <span className="hidden lg:inline">{isPerfect ? 'Отлично' : 'Есть проблемы'}</span>
                            ({audit.score} / {maxScore} б.)
                          </span>
                        </td>
                        <td className="block md:table-cell p-0 md:p-4 text-right border-t border-gray-50 dark:border-zinc-800 md:border-0 pt-4 mt-3 md:pt-0 md:mt-0 transition-colors">
                          <button 
                            onClick={(e) => handleDelete(e, audit.id)} 
                            className="w-full md:w-auto text-red-500 dark:text-red-400 md:text-red-400 dark:md:text-red-500 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs uppercase tracking-wider bg-red-50 dark:bg-red-900/20 md:bg-white dark:md:bg-transparent px-2 py-3 md:py-1 rounded-xl md:rounded shadow-sm md:shadow-none border border-red-100 dark:border-transparent transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <svg className="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Удалить
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="block md:table-row bg-gray-50 dark:bg-zinc-800/30 md:bg-transparent dark:md:bg-transparent rounded-b-3xl md:rounded-none mb-4 md:mb-0 border border-gray-100 dark:border-zinc-800 md:border-0 border-t-0 shadow-sm md:shadow-none overflow-hidden transition-colors">
                          <AuditDetails audit={audit as any} onZoomPhoto={setZoomedPhoto} />
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ПАГИНАЦИЯ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative transition-colors duration-300">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            ← Назад
          </button>
          
          <div className="text-sm font-bold text-gray-500 dark:text-zinc-400 transition-colors">
            Страница <span className="text-gray-900 dark:text-zinc-100">{currentPage}</span> из {totalPages}
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

    </div>
  );
}