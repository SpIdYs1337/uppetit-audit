import React, { useState } from 'react';
import { Audit, Location, Checklist } from '@prisma/client';

// Описываем структуру ответа, которая хранится в JSON (или как отдельная таблица)
export interface ParsedAnswer {
  id: string;
  zone?: string;
  question: string;
  isOk: boolean;
  penalty: number;
  comment?: string;
  photos?: string[];
  photoBase64?: string;
}

// Описываем аудит со всеми подтянутыми связями
export interface EnrichedAudit extends Audit {
  location?: Location | null;
  checklist?: (Checklist & { version?: number | string }) | null;
  answers: ParsedAnswer[];
}

interface AuditCardProps {
  audit: EnrichedAudit;
  onZoomPhoto: (url: string) => void;
}

export function AuditCard({ audit, onZoomPhoto }: AuditCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const maxScore = audit.maxScore || 0;
  
  // Приводим дату к строке, так как из Prisma она может прийти объектом Date
  const formatDate = (dateValue: Date | string) => {
    const d = new Date(dateValue);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return; // Защита от двойного клика

    try {
      setIsDownloading(true);
      
      // Скачиваем PDF в фоне
      const response = await fetch(`/api/pdf/${audit.id}`);
      if (!response.ok) throw new Error('Ошибка генерации PDF');
      
      const blob = await response.blob();
      const filename = `Аудит_${audit.location?.name || audit.id}.pdf`;

      // Универсальное классическое скачивание для ВСЕХ устройств (ПК, Android, iOS)
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Убираем за собой мусор
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Не удалось скачать PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
      {/* ШАПКА КАРТОЧКИ */}
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 sm:p-5 cursor-pointer active:bg-gray-50 flex justify-between items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{formatDate(audit.date)}</div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">{audit.location?.name || 'Неизвестная точка'}</h2>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="text-xs text-gray-500 font-medium truncate">{audit.checklist?.title || 'Чек-лист удален'}</div>
            {audit.checklist?.version && (
              <span className="bg-gray-100 border border-gray-200 text-gray-400 text-[9px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">
                v.{audit.checklist.version}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end flex-shrink-0">
          <div className="text-xl sm:text-2xl font-black text-[#F25C05] whitespace-nowrap">
            {audit.score} <span className="text-xs sm:text-sm text-gray-400">/ {maxScore} б.</span>
          </div>
        </div>
      </div>

      {/* РАСКРЫВАЮЩАЯСЯ ДЕТАЛИЗАЦИЯ */}
      {isExpanded && (
        <div className="bg-gray-50 p-4 sm:p-5 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase">Детали проверки</h3>
            <button
              onClick={exportToPDF}
              disabled={isDownloading}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-white px-4 py-2.5 rounded-lg transition-colors shadow-md shadow-orange-500/20 ${isDownloading ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#F25C05] hover:bg-orange-600'}`}
            >
              {isDownloading ? 'Формируем...' : 'Скачать PDF'}
            </button>
          </div>

          <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Сотрудники на смене</h4>
              <div className="flex flex-wrap gap-2">
                {audit.shiftEmployees && audit.shiftEmployees.length > 0 ? (
                  audit.shiftEmployees.map((emp: string, i: number) => (
                    <span key={i} className="bg-orange-50 text-[#F25C05] px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100">{emp}</span>
                  ))
                ) : (
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">Не указаны</span>
                )}
              </div>
            </div>
            
            {audit.generalComment && (
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Общий комментарий</h4>
                <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100 italic">
                  "{audit.generalComment}"
                </p>
              </div>
            )}
          </div>
          
          {(!audit.answers || audit.answers.length === 0) ? (
            <div className="text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl border border-orange-100">Детализация не сохранилась.</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {audit.answers.map((ans: ParsedAnswer) => {
                const photosToRender = ans.photos && ans.photos.length > 0 ? ans.photos : (ans.photoBase64 ? [ans.photoBase64] : []);
                
                return (
                  <div key={ans.id} className={`p-4 rounded-2xl border ${ans.isOk ? 'bg-white border-gray-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div className="mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                        {ans.zone || 'Основной раздел'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-900 leading-snug">{ans.question}</span>
                      {ans.isOk ? (
                        <span className="text-[10px] sm:text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">✓ Ок</span>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-black text-red-500 bg-red-100 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">-{ans.penalty} б.</span>
                      )}
                    </div>
                    
                    {ans.comment && (
                      <div className="mt-2 text-xs sm:text-sm text-gray-700 bg-gray-100/50 p-3 rounded-xl border border-gray-200/50">
                        <span className="font-bold text-gray-500 mr-1">Комментарий:</span> {ans.comment}
                      </div>
                    )}

                    {photosToRender.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {photosToRender.map((photo: string, idx: number) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-lg border border-gray-200 flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onZoomPhoto(photo); }}
                          >
                            <img src={photo} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
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