'use client';

import { useState } from 'react';
import React from 'react';
import { useAdminAudits } from '@/hooks/useAdminAudits';
import { AuditDetails } from '@/components/audits/AuditDetails';

export default function AdminAuditsPage() {
  const { audits, isLoading, deleteAudit, clearHistory } = useAdminAudits();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

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

  if (isLoading) return <div className="p-4 md:p-8 text-center text-gray-500 font-bold">Загрузка данных...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto relative pb-20">
      
      {/* Модалка для зума фото */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity" onClick={() => setZoomedPhoto(null)}>
          <img src={zoomedPhoto} alt="Увеличенное фото" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          <button className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full font-bold hover:bg-black/80 transition-colors">✕</button>
        </div>
      )}

      {/* ШАПКА */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">История проверок</h1>
          <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-base">Результаты всех проведенных аудитов</p>
        </div>
        {audits.length > 0 && (
          <button onClick={handleClearHistory} className="w-full sm:w-auto text-red-500 bg-red-50 hover:bg-red-100 px-4 py-3 sm:py-2 rounded-xl font-bold text-sm transition-colors text-center shadow-sm">
            Очистить всю историю
          </button>
        )}
      </div>

      {/* ТАБЛИЦА (Карточки на мобилках, классика на ПК) */}
      <div className="bg-transparent md:bg-white rounded-none md:rounded-3xl shadow-none md:shadow-sm md:border border-gray-100 overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="w-full text-left border-collapse md:min-w-[900px] block md:table">
            
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-gray-100 uppercase text-[10px] tracking-wider text-gray-400 bg-gray-50/50">
                <th className="p-4 font-bold">Дата и время</th>
                <th className="p-4 font-bold">Точка</th>
                <th className="p-4 font-bold">Чек-лист</th>
                <th className="p-4 font-bold">Аудитор</th>
                <th className="p-4 font-bold">ТУ (на момент проверки)</th>
                <th className="p-4 font-bold">Результат</th>
                <th className="p-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            
            <tbody className="block md:table-row-group">
              {audits.map((audit) => {
                const maxScore = audit.maxScore || 0;
                const isPerfect = audit.score === maxScore && maxScore > 0;
                const safeChecklist = audit.checklist as any;
                const isExpanded = expandedId === audit.id;
                // Читаем наш слепок (если аудит старый и слепка нет, пишем 'Нет данных')
                const actingTu = (audit as any).tuName || 'Не был назначен';

                return (
                  <React.Fragment key={audit.id}>
                    {/* СТРОКА ТАБЛИЦЫ / КАРТОЧКА */}
                    <tr 
                      onClick={() => toggleExpand(audit.id)} 
                      className={`block md:table-row bg-white md:bg-transparent p-5 md:p-0 cursor-pointer transition-colors relative md:hover:bg-gray-50 
                        ${isExpanded ? 'rounded-t-3xl md:rounded-none mb-0 border-b-0 md:border-b border-gray-100 md:border-gray-50 shadow-sm md:shadow-none' : 'rounded-3xl md:rounded-none mb-4 md:mb-0 border border-gray-100 md:border-b md:border-x-0 md:border-t-0 md:border-gray-50 shadow-sm md:shadow-none'}
                      `}
                    >
                      {/* Дата */}
                      <td className="block md:table-cell p-0 md:p-4 text-xs md:text-sm font-bold text-gray-400 md:text-gray-900 mb-1 md:mb-0 uppercase md:normal-case">
                        {formatDate(audit.date)}
                      </td>
                      
                      {/* Точка */}
                      <td className="block md:table-cell p-0 md:p-4 text-lg md:text-sm font-black md:font-bold text-gray-900 mb-3 md:mb-0 pr-24 md:pr-0 leading-tight">
                        {audit.location?.name || 'Удалена'}
                      </td>
                      
                      {/* Чек-лист */}
                      <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 mb-1 md:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[10px] uppercase font-bold text-gray-400">Чек-лист:</span>
                          <span className="truncate max-w-[200px] block">{safeChecklist?.title || 'Удален'}</span>
                          {safeChecklist?.version && <span className="bg-gray-100 border border-gray-200 text-gray-400 text-[10px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">v.{safeChecklist.version}</span>}
                        </div>
                      </td>
                      
                      {/* Аудитор */}
                      <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 mb-1 md:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[10px] uppercase font-bold text-gray-400">Аудитор:</span>
                          <span className="font-bold md:font-normal text-gray-700 md:text-gray-500">{audit.user?.login || 'Удален'}</span>
                        </div>
                      </td>

                      {/* ТУ ТОЧКИ (Слепок) */}
                      <td className="block md:table-cell p-0 md:p-4 text-sm text-gray-500 mb-4 md:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="md:hidden text-[10px] uppercase font-bold text-gray-400">ТУ:</span>
                          <span className="font-bold md:font-normal text-gray-700 md:text-gray-500">{actingTu}</span>
                        </div>
                      </td>
                      
                      {/* Результат */}
                      <td className="block md:table-cell absolute top-4 right-4 md:static p-0 md:p-4">
                        <span className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shadow-sm md:shadow-none ${isPerfect ? 'bg-green-50 text-green-700 border border-green-100 md:border-0' : 'bg-red-50 text-red-700 border border-red-100 md:border-0'}`}>
                          <span className="hidden lg:inline">{isPerfect ? 'Отлично' : 'Есть проблемы'}</span>
                          ({audit.score} / {maxScore} б.)
                        </span>
                      </td>
                      
                      {/* Кнопка удаления */}
                      <td className="block md:table-cell p-0 md:p-4 text-right border-t border-gray-50 md:border-0 pt-4 mt-3 md:pt-0 md:mt-0">
                        <button 
                          onClick={(e) => handleDelete(e, audit.id)} 
                          className="w-full md:w-auto text-red-500 md:text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-wider bg-red-50 md:bg-white px-2 py-3 md:py-1 rounded-xl md:rounded shadow-sm md:shadow-none border border-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Удалить
                        </button>
                      </td>
                    </tr>
                    
                    {/* РАСКРЫТЫЕ ДЕТАЛИ АУДИТА */}
                    {isExpanded && (
                      <tr className="block md:table-row bg-gray-50 md:bg-transparent rounded-b-3xl md:rounded-none mb-4 md:mb-0 border border-gray-100 md:border-0 border-t-0 shadow-sm md:shadow-none overflow-hidden">
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
    </div>
  );
}