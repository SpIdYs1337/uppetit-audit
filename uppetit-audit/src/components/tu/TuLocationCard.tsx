import React, { useState } from 'react';

interface TuLocationCardProps {
  loc: any;
  audits: any[];
}

export function TuLocationCard({ loc, audits }: TuLocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Сортируем аудиты от новых к старым
  const locAudits = audits.filter(a => a.locationId === loc.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastAudit = locAudits[0];

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // МАГИЯ: Серверная генерация PDF вместо огромного клиентского скрипта
  const exportToPDF = (e: React.MouseEvent, auditId: string) => {
    e.stopPropagation();
    window.open(`/api/pdf/${auditId}`, '_blank');
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-5 cursor-pointer active:bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-gray-900 leading-tight mb-1">{loc.name}</h2>
          {lastAudit ? (
            <div className="text-xs font-bold text-[#F25C05]">Последний аудит: {formatDate(lastAudit.date)}</div>
          ) : (
            <div className="text-xs text-gray-400 font-medium">Проверок еще не было</div>
          )}
        </div>
        <div className="text-right flex items-center justify-center bg-gray-50 w-8 h-8 rounded-full">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 p-5 border-t border-gray-100">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">История проверок</h3>
          
          {locAudits.length === 0 ? (
            <p className="text-sm text-gray-500 italic">На этой точке еще никто не проводил аудит.</p>
          ) : (
            <div className="space-y-3">
              {locAudits.map(audit => {
                const maxScore = audit.maxScore || 0;
                const isPerfect = audit.score === maxScore && maxScore > 0;

                return (
                  <div key={audit.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 mb-1">{formatDate(audit.date)}</div>
                        <div className="text-sm font-bold text-gray-900">{audit.checklist?.title || 'Чек-лист удален'}</div>
                        <div className="text-xs text-gray-500 mt-1">Аудитор: <span className="font-bold">{audit.user?.login || 'Неизвестно'}</span></div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${isPerfect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {audit.score} / {maxScore} б.
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => exportToPDF(e, audit.id)}
                      className="w-full bg-[#F25C05] text-white py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
                    >
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