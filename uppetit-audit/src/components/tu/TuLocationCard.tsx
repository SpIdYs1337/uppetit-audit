import React, { useState } from 'react';
import { EnrichedLocation, EnrichedAudit } from '@/hooks/useAdminAudits'; 

interface TuLocationCardProps {
  loc: EnrichedLocation;
  audits: EnrichedAudit[];
}

export function TuLocationCard({ loc, audits }: TuLocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const locAudits = audits.filter(a => a.locationId === loc.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastAudit = locAudits[0];

  const formatDate = (dateValue: Date | string) => {
    return new Date(dateValue).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToPDF = (e: React.MouseEvent, auditId: string) => {
    e.stopPropagation();
    window.open(`/api/pdf/${auditId}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300">
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex justify-between items-center transition-colors">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 leading-tight mb-1 transition-colors">{loc.name}</h2>
          {lastAudit ? (
            <div className="text-xs font-bold text-[#F25C05]">Последний Simple-аудит: {formatDate(lastAudit.date)}</div>
          ) : (
            <div className="text-xs text-gray-400 dark:text-zinc-500 font-medium transition-colors">Проверок еще не было</div>
          )}
        </div>
        <div className="text-right flex items-center justify-center bg-gray-50 dark:bg-zinc-800 w-8 h-8 rounded-full transition-colors">
          <svg className={`w-4 h-4 text-gray-400 dark:text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 dark:bg-zinc-950 p-5 border-t border-gray-100 dark:border-zinc-800 transition-colors">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 transition-colors">История проверок</h3>
          {locAudits.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-600 italic transition-colors">На этой точке еще никто не проводил аудит.</p>
          ) : (
            <div className="space-y-3">
              {locAudits.map(audit => {
                const maxScore = audit.maxScore || 0;
                const isPerfect = audit.score === maxScore && maxScore > 0;
                return (
                  <div key={audit.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 transition-colors">{formatDate(audit.date)}</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 transition-colors">{audit.checklist?.title || 'Чек-лист удален'}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 transition-colors">Аудитор: <span className="font-bold text-gray-700 dark:text-zinc-300">{audit.user?.login || audit.auditorName || 'Неизвестно'}</span></div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${isPerfect ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                        {audit.score} / {maxScore} б.
                      </span>
                    </div>
                    <button onClick={(e) => exportToPDF(e, audit.id)} className="w-full bg-[#F25C05] dark:bg-[#E65604] text-white py-2 rounded-xl text-xs font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-sm">
                      Скачать PDF отчет
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}