import React, { useState } from 'react';
import { EnrichedAudit, ParsedAnswer } from './AuditCard';

interface AuditDetailsProps {
  audit: EnrichedAudit;
  onZoomPhoto: (url: string) => void;
}

export function AuditDetails({ audit, onZoomPhoto }: AuditDetailsProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const exportToPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return; // Защита от двойного клика

    try {
      setIsDownloading(true);
      
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
    <td colSpan={6} className="bg-gray-50 p-4 sm:p-6 shadow-inner border-b border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">
          Подробности проверки
        </h3>
        <button
          onClick={exportToPDF}
          disabled={isDownloading}
          className={`w-full sm:w-auto text-white px-4 py-3 sm:py-2 rounded-lg font-bold text-xs transition-colors shadow-md shadow-orange-500/20 text-center ${isDownloading ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#F25C05] hover:bg-orange-600'}`}
        >
          {isDownloading ? 'Загрузка...' : 'Скачать PDF'}
        </button>
      </div>

      <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="mb-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Сотрудники на смене</h4>
          <div className="flex flex-wrap gap-2">
            {audit.shiftEmployees && audit.shiftEmployees.length > 0 ? (
              audit.shiftEmployees.map((emp: string, i: number) => (
                <span key={i} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                  {emp}
                </span>
              ))
            ) : (
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">Не указаны</span>
            )}
          </div>
        </div>
        
        {audit.generalComment && (
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Общий комментарий</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
              "{audit.generalComment}"
            </p>
          </div>
        )}
      </div>

      {(!audit.answers || audit.answers.length === 0) ? (
        <div className="text-sm bg-orange-100 text-orange-700 p-4 rounded-xl font-bold border border-orange-200">
          Детализация для этого аудита отсутствует.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {audit.answers.map((ans: ParsedAnswer) => {
            const photosToRender = ans.photos && ans.photos.length > 0 ? ans.photos : (ans.photoBase64 ? [ans.photoBase64] : []);
            
            return (
              <div key={ans.id} className={`p-4 rounded-xl border ${ans.isOk ? 'bg-green-50/30 border-green-100' : 'bg-white border-red-100 shadow-sm'}`}>
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                    {ans.zone || 'Основной раздел'}
                  </span>
                </div>

                <div className="flex justify-between gap-3 mb-2 items-start">
                  <span className={`text-sm font-bold leading-snug ${ans.isOk ? 'text-gray-600' : 'text-gray-900'}`}>
                    {ans.question}
                  </span>
                  
                  {ans.isOk ? (
                    <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-1 rounded-md h-fit whitespace-nowrap">
                      ✓ Ок
                    </span>
                  ) : (
                    <span className="text-xs font-black text-red-500 bg-red-50 px-2 py-1 rounded-md h-fit whitespace-nowrap">
                      -{ans.penalty} б.
                    </span>
                  )}
                </div>
                
                {photosToRender.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {photosToRender.map((photo: string, idx: number) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-lg border border-gray-200 flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 cursor-zoom-in hover:opacity-80 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); onZoomPhoto(photo); }}
                      >
                        <img src={photo} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                
                {ans.comment && (
                  <div className="mt-2 text-sm text-gray-700 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                    <span className="font-bold text-gray-500 mr-1">Комментарий:</span> {ans.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </td>
  );
}