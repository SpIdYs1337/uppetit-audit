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
    <div className="p-4 md:p-8 max-w-6xl mx-auto relative">
      
      {/* Модалка для зума фото */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity" onClick={() => setZoomedPhoto(null)}>
          <img src={zoomedPhoto} alt="Увеличенное фото" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          <button className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full font-bold hover:bg-black/80 transition-colors">✕</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">История проверок</h1>
          <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-base">Результаты всех проведенных аудитов</p>
        </div>
        {audits.length > 0 && (
          <button onClick={handleClearHistory} className="w-full sm:w-auto text-red-500 bg-red-50 hover:bg-red-100 px-4 py-3 sm:py-2 rounded-xl font-bold text-sm transition-colors text-center">
            Очистить всю историю
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 uppercase text-[10px] tracking-wider text-gray-400 bg-gray-50/50">
                <th className="p-4 font-bold">Дата и время</th>
                <th className="p-4 font-bold">Точка</th>
                <th className="p-4 font-bold">Чек-лист</th>
                <th className="p-4 font-bold">Сотрудник</th>
                <th className="p-4 font-bold">Результат</th>
                <th className="p-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                const maxScore = audit.maxScore || 0;
                const isPerfect = audit.score === maxScore && maxScore > 0;
                const safeChecklist = audit.checklist as any;

                return (
                  <React.Fragment key={audit.id}>
                    <tr onClick={() => toggleExpand(audit.id)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatDate(audit.date)}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{audit.location?.name || 'Удалена'}</td>
                      <td className="p-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px] block">{safeChecklist?.title || 'Удален'}</span>
                          {safeChecklist?.version && <span className="bg-gray-100 border border-gray-200 text-gray-400 text-[10px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">v.{safeChecklist.version}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{audit.user?.login || 'Удален'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${isPerfect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {isPerfect ? 'Отлично' : 'Есть проблемы'} ({audit.score} / {maxScore} б.)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={(e) => handleDelete(e, audit.id)} className="text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-wider bg-white px-2 py-1 rounded shadow-sm border border-red-100">
                          Удалить
                        </button>
                      </td>
                    </tr>
                    
                    {/* Рендерим вынесенный компонент деталей */}
                    {expandedId === audit.id && (
                      <tr>
                        {/* Передаем через any, чтобы обойти разницу в типах между хуком и компонентом */}
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