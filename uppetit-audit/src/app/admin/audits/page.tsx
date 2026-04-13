'use client';

import { useState, useEffect } from 'react';
import React from 'react';

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const res = await fetch('/api/audits');
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
      await fetch(`/api/audits/${id}`, { method: 'DELETE' });
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('ВНИМАНИЕ! Это действие удалит АБСОЛЮТНО ВСЕ аудиты из базы. Продолжить?')) return;
    if (!confirm('Вы абсолютно уверены? Это нельзя отменить.')) return;

    try {
      await fetch(`/api/audits/all`, { method: 'DELETE' });
      setAudits([]);
      setExpandedId(null);
    } catch (err) {
      alert('Ошибка при очистке');
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
      : audit.answers.map((v: any) => `
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
                ${v.photoBase64 ? `<img class="photo" src="${v.photoBase64}" />` : ''}
              </td>
            </tr>
          </table>
        </div>
      `).join('');

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        .pdf-container { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; padding: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        
        .info-label { font-size: 13px; color: #777; font-weight: bold; padding-bottom: 8px; padding-right: 15px; width: 160px; }
        .info-value { font-size: 13px; font-weight: 900; color: #000; padding-bottom: 8px; }
        
        .logo-img { max-width: 140px; filter: invert(1); } /* Делаем белый логотип черным */

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
        .photo { max-width: 250px; max-height: 250px; border-radius: 6px; margin-top: 10px; display: block; }
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

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Загрузка данных...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">История проверок</h1>
          <p className="text-gray-500 mt-2">Результаты всех проведенных аудитов</p>
        </div>
        {audits.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            Очистить всю историю
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
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
                    <td className="p-4 text-sm font-bold text-gray-900">{formatDate(audit.date)}</td>
                    <td className="p-4 text-sm font-bold text-gray-900">{audit.location?.name || 'Удалена'}</td>
                    <td className="p-4 text-sm text-gray-500">{audit.checklist?.title || 'Удален'}</td>
                    <td className="p-4 text-sm text-gray-500">{audit.user?.login || 'Удален'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${isPerfect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                      <td colSpan={6} className="bg-gray-50 p-6 shadow-inner border-b border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">
                            Подробности проверки
                          </h3>
                          <button 
                            onClick={(e) => exportToPDF(e, audit)}
                            className="bg-[#F25C05] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-md shadow-orange-500/20"
                          >
                            Скачать PDF
                          </button>
                        </div>

                        <div className="mb-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
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
                            {audit.answers.map((ans: any) => (
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
                                
                                {ans.photoBase64 && (
                                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
                                    <img src={ans.photoBase64} alt="Фото" className="max-h-48 w-full object-cover" />
                                  </div>
                                )}
                                
                                {ans.comment && (
                                  <div className="mt-2 text-sm text-gray-700 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                                    <span className="font-bold text-gray-500 mr-1">Комментарий:</span> {ans.comment}
                                  </div>
                                )}
                              </div>
                            ))}
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
  );
}