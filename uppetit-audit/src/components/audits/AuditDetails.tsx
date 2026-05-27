'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { EnrichedAudit, ParsedAnswer } from '@/hooks/useAdminAudits';

interface AuditDetailsProps {
  audit: EnrichedAudit;
  onZoomPhoto: (url: string) => void;
}

export function AuditDetails({ audit: initialAudit, onZoomPhoto }: AuditDetailsProps) {
  const { data: session } = useSession();
  const [audit, setAudit] = useState<EnrichedAudit>(initialAudit);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updatingAnswerId, setUpdatingAnswerId] = useState<string | null>(null);

  // Стейт для нашего нового красивого модального окна
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    ansId: string;
    currentIsOk: boolean;
  } | null>(null);

  // Проверяем, является ли текущий пользователь администратором
  const isAdmin = session?.user?.role === 'ADMIN';

  const exportToPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return; 

    try {
      setIsDownloading(true);
      
      const response = await fetch(`/api/pdf/${audit.id}`);
      if (!response.ok) throw new Error('Ошибка генерации PDF');
      
      const blob = await response.blob();
      const locName = audit.location?.name || audit.locationName || audit.id;
      const filename = `Аудит_${locName}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Не удалось скачать PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // 1. Функция открытия модального окна (вместо прямого запроса)
  const openConfirmModal = (e: React.MouseEvent, ansId: string, currentIsOk: boolean) => {
    e.stopPropagation(); // Предотвращаем закрытие спойлера таблицы
    setConfirmDialog({ isOpen: true, ansId, currentIsOk });
  };

  // 2. Функция реального выполнения запроса (вызывается из модалки)
  const executeToggleStatus = async () => {
    if (!confirmDialog) return;
    
    const { ansId, currentIsOk } = confirmDialog;
    setConfirmDialog(null); // Сразу прячем модалку

    if (updatingAnswerId) return;

    setUpdatingAnswerId(ansId);
    try {
      const response = await fetch(`/api/audits/${audit.id}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerId: ansId, isOk: !currentIsOk }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при изменении статуса пункта');
      }

      const data = await response.json();

      // Мгновенно обновляем локальный стейт, пересчитывая общий балл и статусы
      setAudit((prev) => ({
        ...prev,
        score: data.newScore,
        answers: prev.answers.map((ans) => 
          ans.id === ansId ? { ...ans, isOk: !currentIsOk, penalty: !currentIsOk ? 0 : data.answers.find((a: any) => a.id === ansId)?.penalty || ans.penalty } : ans
        )
      }));

    } catch (err: any) {
      console.error('Ошибка редактирования:', err);
      alert(err.message || 'Не удалось обновить балл пункта.');
    } finally {
      setUpdatingAnswerId(null);
    }
  };

  return (
    <td colSpan={6} className="bg-gray-50 p-4 sm:p-6 shadow-inner border-b border-gray-200">
      
      {/* Шапка деталей */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">
            Подробности проверки
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase">
            Текущий балл в системе: <span className="text-[#F25C05] font-black">{audit.score} б.</span>
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={isDownloading}
          className={`w-full sm:w-auto text-white px-4 py-3 sm:py-2 rounded-lg font-bold text-xs transition-colors shadow-md shadow-orange-500/20 text-center ${isDownloading ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#F25C05] hover:bg-orange-600'}`}
        >
          {isDownloading ? 'Загрузка...' : 'Скачать PDF'}
        </button>
      </div>

      {/* Инфо по сотрудникам */}
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

      {/* Список ответов с возможностью административного перешивания */}
      {(!audit.answers || audit.answers.length === 0) ? (
        <div className="text-sm bg-orange-100 text-orange-700 p-4 rounded-xl font-bold border border-orange-200">
          Детализация для этого аудита отсутствует.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {audit.answers.map((ans: ParsedAnswer) => {
            const photosToRender = ans.photos && ans.photos.length > 0 ? ans.photos : (ans.photoBase64 ? [ans.photoBase64] : []);
            const isLoadingThis = updatingAnswerId === ans.id;

            return (
              <div key={ans.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${ans.isOk ? 'bg-green-50/30 border-green-100' : 'bg-white border-red-100 shadow-sm'}`}>
                <div>
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
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
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

                {/* АДМИНИСТРАТИВНАЯ КНОПКА ИЗМЕНЕНИЯ БАЛЛА */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      disabled={isLoadingThis}
                      onClick={(e) => openConfirmModal(e, ans.id, ans.isOk)}
                      className={`text-[10px] uppercase tracking-wider font-black px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 border ${
                        ans.isOk
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoadingThis ? 'Считаем...' : ans.isOk ? '⚠ Поставить нарушение' : '✓ Зачесть исправление'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* НОВОЕ КРАСИВОЕ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ */}
      {confirmDialog && confirmDialog.isOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { e.stopPropagation(); setConfirmDialog(null); }}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()} // Чтобы клик внутри белого окна не закрывал его
          >
            {/* Иконка */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-6 ${
              confirmDialog.currentIsOk ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'
            }`}>
              {confirmDialog.currentIsOk ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <h3 className="text-xl font-black text-center text-gray-900 mb-2">
              Вы уверены?
            </h3>
            
            <p className="text-sm text-gray-500 text-center mb-8 font-medium">
              {confirmDialog.currentIsOk
                ? 'Вы собираетесь отменить успешный ответ и начислить штрафные баллы. Это напрямую повлияет на общий результат проверки.'
                : 'Вы собираетесь зачесть этот пункт как успешный. Штрафные баллы по нему будут аннулированы.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={executeToggleStatus}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-md ${
                  confirmDialog.currentIsOk
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                }`}
              >
                {confirmDialog.currentIsOk ? 'Оштрафовать' : 'Зачесть'}
              </button>
            </div>
          </div>
        </div>
      )}

    </td>
  );
}