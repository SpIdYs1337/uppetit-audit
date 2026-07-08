import React, { useState } from 'react';
import { EnrichedAudit, ParsedAnswer } from '@/hooks/useAdminAudits';

interface AuditCardProps {
  audit: EnrichedAudit;
  onZoomPhoto: (url: string) => void;
}

export function AuditCard({ audit, onZoomPhoto }: AuditCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const maxScore = audit.maxScore || 0;
  const locName = audit.location?.name || audit.locationName || 'Неизвестная точка';

  const formatDate = (dateValue: Date | string) => {
    return new Date(dateValue).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return; 
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/pdf/${audit.id}`);
      if (!response.ok) throw new Error('Ошибка генерации PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Аудит_${locName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch { alert('Не удалось скачать PDF'); } finally { setIsDownloading(false); }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300">
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex justify-between items-center gap-3 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 mb-1">{formatDate(audit.date)}</div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100 leading-tight truncate">{locName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium truncate">{audit.checklist?.title || 'Чек-лист удален'}</div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end flex-shrink-0">
          <div className="text-xl sm:text-2xl font-black text-[#F25C05] whitespace-nowrap">
            {audit.score} <span className="text-xs sm:text-sm text-gray-400 dark:text-zinc-500">/ {maxScore} б.</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-zinc-950 p-4 sm:p-5 border-t border-gray-100 dark:border-zinc-800 transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase">Детали проверки</h3>
            <button onClick={exportToPDF} className="w-full sm:w-auto text-xs font-bold text-white bg-[#F25C05] px-4 py-2.5 rounded-lg shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95">
              {isDownloading ? 'Формируем...' : 'Скачать PDF'}
            </button>
          </div>
          {/* Далее логика вопросов... */}
        </div>
      )}
    </div>
  );
}