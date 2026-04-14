'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // ИСПРАВЛЕНИЕ: Добавили состояние для полноэкранного просмотра фото
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const session = await getSession();
        const userId = (session?.user as any)?.id;
        const res = await fetch('/api/audits');
        const data = await res.json();
        const myAudits = data.filter((a: any) => a.userId === userId);
        setAudits(myAudits);
      } catch (err) {
        console.error('Ошибка загрузки истории:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getMaxScore = (checklist: any) => {
    if (!checklist || !checklist.items) return 0;
    try {
      const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
      return items.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0);
    } catch (e) { return 0; }
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

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      
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

      <header className="bg-white p-4 sm:p-6 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">История</h1>
          <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wider truncate">Ваши прошлые проверки</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10 max-w-3xl mx-auto w-full">
        {audits.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 font-medium text-sm">Вы еще не провели ни одного аудита</div>
        ) : (
          audits.map((audit) => {
            const maxScore = getMaxScore(audit.checklist);
            return (
              <div key={audit.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                <div onClick={() => toggleExpand(audit.id)} className="p-4 sm:p-5 cursor-pointer active:bg-gray-50 flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{formatDate(audit.date)}</div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight truncate">{audit.location?.name || 'Неизвестная точка'}</h2>
                    <div className="text-xs text-gray-500 font-medium mt-1 truncate">{audit.checklist?.title || 'Чек-лист удален'}</div>
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0">
                    <div className="text-xl sm:text-2xl font-black text-[#F25C05] whitespace-nowrap">{audit.score} <span className="text-xs sm:text-sm text-gray-400">/ {maxScore} б.</span></div>
                  </div>
                </div>

                {expandedId === audit.id && (
                  <div className="bg-gray-50 p-4 sm:p-5 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Детали проверки</h3>
                      <button onClick={(e) => exportToPDF(e, audit)} className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#F25C05] hover:bg-orange-600 px-4 py-2.5 rounded-lg transition-colors shadow-md shadow-orange-500/20">
                        Скачать PDF
                      </button>
                    </div>

                    <div className="mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Сотрудники на смене</h4>
                        <div className="flex flex-wrap gap-2">
                          {audit.shiftEmployees && audit.shiftEmployees.length > 0 ? (
                            audit.shiftEmployees.map((emp: string, i: number) => (
                              <span key={i} className="bg-orange-50 text-[#F25C05] px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100">
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
                        {audit.answers.map((ans: any) => {
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

                              {/* ИСПРАВЛЕНИЕ: Сделали миниатюру кликабельной */}
                              {photosToRender.length > 0 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                  {photosToRender.map((photo: string, idx: number) => (
                                    <div 
                                      key={idx} 
                                      className="overflow-hidden rounded-lg border border-gray-200 flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 cursor-zoom-in hover:opacity-80 transition-opacity"
                                      onClick={() => setZoomedPhoto(photo)}
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
          })
        )}
      </main>
    </div>
  );
}