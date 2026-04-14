'use client';

import { useState, useEffect } from 'react';
import React from 'react';

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // ИСПРАВЛЕНИЕ: Добавили состояние для полноэкранного просмотра фото
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const res = await fetch(`/api/audits?t=${new Date().getTime()}`, { cache: 'no-store' });
      const data = await res.json();
      setAudits(data);
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const getMaxScore = (checklist: any) => {
    if (!checklist || !checklist.items) return 0;
    try {
      const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
      return items.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0);
    } catch (e) { return 0; }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Точно удалить этот аудит?')) return;
    
    try {
      const res = await fetch(`/api/audits?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка сервера');
      
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Ошибка при удалении. Возможно, аудит уже удален.');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('ВНИМАНИЕ! Это действие удалит АБСОЛЮТНО ВСЕ аудиты из базы. Продолжить?')) return;
    if (!confirm('Вы абсолютно уверены? Это нельзя отменить.')) return;

    try {
      const res = await fetch(`/api/audits?clearAll=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка сервера');

      setAudits([]);
      setExpandedId(null);
    } catch (err) {
      alert('Ошибка при очистке истории');
    }
  };

  const exportToPDF = async (e: React.MouseEvent, audit: any) => {
    e.stopPropagation();
    
    const html2pdf = (await import('html2pdf.js')).default;

    const maxScore = getMaxScore(audit.checklist);
    const date = formatDate(audit.date);
    const violations = audit.answers?.filter((a: any) => !a.isOk) || [];
    
    const employees = audit.shiftEmployees && audit.shiftEmployees.length > 0 
      ? audit.shiftEmployees.join(', ') 
      : 'Не указаны';

    const violationsHtml = violations.length === 0
      ? '<p style="color: #777; font-size: 14px;">Нарушений нет</p>'
      : violations.map((v: any) => `
        <div class="item">
          <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
          <div class="question-text">${v.question}</div>
          ${v.comment ? `<div class="comment">Комментарий: ${v.comment}</div>` : ''}
        </div>
      `).join('');

    const fullReportHtml = (!audit.answers || audit.answers.length === 0)
      ? '<p>Детализация отсутствует.</p>'
      : audit.answers.map((v: any) => {
          const photosArray = v.photos && v.photos.length > 0 ? v.photos : (v.photoBase64 ? [v.photoBase64] : []);
          const photosHtml = photosArray.length > 0 
            ? `<div class="photos-container">${photosArray.map((img: string) => `<img class="photo" src="${img}" />`).join('')}</div>` 
            : '';

          return `
            <div class="item">
              <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
              <table class="item-table">
                <tr>
                  <td class="icon-cell ${v.isOk ? 'icon-green' : 'icon-red'}">◯</td>
                  <td>
                    <div class="question-text">${v.question}</div>
                    <div class="${v.isOk ? 'status-green' : 'status-red'}">
                      ${v.isOk ? 'соответствие' : 'несоответствие'}
                    </div>
                    ${v.comment ? `<div class="comment">Комментарий: ${v.comment}</div>` : ''}
                    ${photosHtml}
                  </td>
                </tr>
              </table>
            </div>
          `;
      }).join('');

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        .pdf-container { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .info-label { font-size: 13px; color: #777; font-weight: bold; padding-bottom: 8px; padding-right: 15px; width: 160px; }
        .info-value { font-size: 13px; font-weight: 900; color: #000; padding-bottom: 8px; }
        .logo-img { max-width: 140px; filter: invert(1); }
        .score-block { margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee; }
        .score-label { font-size: 14px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 1px; }
        .score-value { font-size: 36px; font-weight: 900; color: #000; display: inline-block; margin-left: 15px; }
        .score-max { font-size: 18px; color: #999; font-weight: normal; }
        .general-comment { background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 25px; font-size: 13px; color: #444; }
        .section-wrapper { padding-top: 35px; }
        .section-title { font-size: 18px; font-weight: 900; color: #111; margin-bottom: 15px; }
        .red-banner { background-color: #f1416c; color: white; padding: 10px 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; border-radius: 4px; margin-bottom: 15px; }
        .gray-banner { background-color: #f5f8fa; color: #5e6278; padding: 10px 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; border-radius: 4px; margin-bottom: 15px; }
        .item { border-bottom: 1px solid #eee; padding: 15px 0; page-break-inside: avoid; }
        .zone-badge { display: inline-block; background-color: #e8f0fe; color: #1967d2; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
        .item-table { width: 100%; }
        .icon-cell { width: 30px; font-size: 20px; font-weight: 900; line-height: 1; }
        .icon-green { color: #50cd89; }
        .icon-red { color: #f1416c; }
        .question-text { font-size: 13px; font-weight: bold; color: #222; line-height: 1.4; margin-bottom: 4px; }
        .status-green { color: #50cd89; font-size: 11px; font-weight: bold; }
        .status-red { color: #f1416c; font-size: 11px; font-weight: bold; }
        .comment { color: #009ef7; font-size: 12px; font-weight: bold; margin-top: 6px; }
        .photos-container { margin-top: 10px; }
        .photo { max-width: 180px; max-height: 180px; border-radius: 6px; display: inline-block; margin-right: 10px; margin-bottom: 10px; }
      </style>
      <div class="pdf-container">
        <table>
          <tr>
            <td>
              <table>
                <tr><td class="info-label">Чек-лист:</td><td class="info-value">${audit.checklist?.title || 'Без названия'}</td></tr>
                <tr><td class="info-label">Подразделение:</td><td class="info-value">${audit.location?.name || 'Неизвестно'}</td></tr>
                <tr><td class="info-label">Аудитор:</td><td class="info-value">${audit.user?.login || 'Неизвестно'}</td></tr>
                <tr><td class="info-label">Дата и время:</td><td class="info-value">${date}</td></tr>
                <tr><td class="info-label">Сотрудники:</td><td class="info-value">${employees}</td></tr>
              </table>
            </td>
            <td style="width: 30%; text-align: right;">
              <img src="/logo3.png" class="logo-img" alt="UPPETIT" />
            </td>
          </tr>
        </table>
        <div class="score-block">
          <span class="score-label">Оценка</span>
          <span class="score-value">${audit.score} <span class="score-max">/ ${maxScore} б.</span></span>
        </div>
        ${audit.generalComment ? `
          <div class="general-comment">
            <b>Общий комментарий к проверке:</b><br/><br/>
            ${audit.generalComment}
          </div>
        ` : ''}
        <div class="section-wrapper">
          <div class="section-title">Выявленные нарушения</div>
          <div class="red-banner">Ошибки и недочеты</div>
          ${violationsHtml}
        </div>
        <div class="section-wrapper">
          <div class="section-title">Полный отчет</div>
          <div class="gray-banner">Все ответы</div>
          ${fullReportHtml}
        </div>
      </div>
    `;

    const opt = {
      margin:       12,
      filename:     `Аудит_${audit.location?.name || 'Точка'}_${date.replace(/[, :.]/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
  };

  if (isLoading) return <div className="p-4 md:p-8 text-center text-gray-500 font-bold">Загрузка данных...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto relative">
      
      {/* ИСПРАВЛЕНИЕ: Окно полноэкранного просмотра фото */}
      {zoomedPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out transition-opacity"
          onClick={() => setZoomedPhoto(null)}
        >
          <img 
            src={zoomedPhoto} 
            alt="Увеличенное фото" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <button 
            className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setZoomedPhoto(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">История проверок</h1>
          <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-base">Результаты всех проведенных аудитов</p>
        </div>
        {audits.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="w-full sm:w-auto text-red-500 bg-red-50 hover:bg-red-100 px-4 py-3 sm:py-2 rounded-xl font-bold text-sm transition-colors text-center"
          >
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
                const maxScore = getMaxScore(audit.checklist);
                const isPerfect = audit.score === maxScore;

                return (
                  <React.Fragment key={audit.id}>
                    <tr 
                      onClick={() => toggleExpand(audit.id)}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="p-4 text-sm font-bold text-gray-900 whitespace-nowrap">{formatDate(audit.date)}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{audit.location?.name || 'Удалена'}</td>
                      <td className="p-4 text-sm text-gray-500">{audit.checklist?.title || 'Удален'}</td>
                      <td className="p-4 text-sm text-gray-500">{audit.user?.login || 'Удален'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${isPerfect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {isPerfect ? 'Отлично' : 'Есть проблемы'} ({audit.score} / {maxScore} б.)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={(e) => handleDelete(e, audit.id)}
                          className="text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-wider bg-white px-2 py-1 rounded shadow-sm border border-red-100"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>

                    {expandedId === audit.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-4 sm:p-6 shadow-inner border-b border-gray-200">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">
                              Подробности проверки
                            </h3>
                            <button 
                              onClick={(e) => exportToPDF(e, audit)}
                              className="w-full sm:w-auto bg-[#F25C05] hover:bg-orange-600 text-white px-4 py-3 sm:py-2 rounded-lg font-bold text-xs transition-colors shadow-md shadow-orange-500/20 text-center"
                            >
                              Скачать PDF
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
                              {audit.answers.map((ans: any) => {
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
                                          // ИСПРАВЛЕНИЕ: Сделали миниатюру кликабельной (cursor-zoom-in)
                                          <div 
                                            key={idx} 
                                            className="overflow-hidden rounded-lg border border-gray-200 flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 cursor-zoom-in hover:opacity-80 transition-opacity"
                                            onClick={() => setZoomedPhoto(photo)}
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