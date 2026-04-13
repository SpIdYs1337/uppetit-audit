'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';

export default function TuLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLocId, setExpandedLocId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const session = await getSession();
      const userId = (session?.user as any)?.id;

      const [locRes, audRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/audits')
      ]);

      const allLocations = await locRes.json();
      const allAudits = await audRes.json();

      // Оставляем только точки этого ТУ
      const myLocations = allLocations.filter((loc: any) => loc.tuId === userId);
      setLocations(myLocations);

      // Оставляем только аудиты по этим точкам
      const myLocationIds = myLocations.map((l: any) => l.id);
      const myAudits = allAudits.filter((aud: any) => myLocationIds.includes(aud.locationId));
      setAudits(myAudits);

    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => setExpandedLocId(expandedLocId === id ? null : id);

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

  // ФУНКЦИЯ ВЫГРУЗКИ ПДФ (с вашим дизайном)
  const exportToPDF = async (e: React.MouseEvent, audit: any) => {
    e.stopPropagation();
    const html2pdf = (await import('html2pdf.js')).default;
    const maxScore = getMaxScore(audit.checklist);
    const date = formatDate(audit.date);
    const violations = audit.answers?.filter((a: any) => !a.isOk) || [];
    const employees = audit.shiftEmployees && audit.shiftEmployees.length > 0 ? audit.shiftEmployees.join(', ') : 'Не указаны';

    const violationsHtml = violations.length === 0 ? '<p style="color: #777; font-size: 14px;">Нарушений нет</p>' : violations.map((v: any) => `
        <div class="item">
          <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
          <div class="question-text">${v.question}</div>
          ${v.comment ? `<div class="comment">Комментарий: ${v.comment}</div>` : ''}
        </div>
      `).join('');

    const fullReportHtml = (!audit.answers || audit.answers.length === 0) ? '<p>Детализация отсутствует.</p>' : audit.answers.map((v: any) => `
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
        ${audit.generalComment ? `<div class="general-comment"><b>Общий комментарий к проверке:</b><br/><br/>${audit.generalComment}</div>` : ''}
        <div class="section-wrapper"><div class="section-title">Выявленные нарушения</div><div class="red-banner">Ошибки и недочеты</div>${violationsHtml}</div>
        <div class="section-wrapper"><div class="section-title">Полный отчет</div><div class="gray-banner">Все ответы</div>${fullReportHtml}</div>
      </div>
    `;

    const opt = {
      margin: 12,
      filename: `Аудит_${audit.location?.name || 'Точка'}_${date.replace(/[, :.]/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).save();
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">Мои точки</h1>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Зона ответственности ТУ</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10">
        {locations.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 font-medium text-sm">У вас пока нет привязанных точек</div>
        ) : (
          locations.map((loc) => {
            const locAudits = audits.filter(a => a.locationId === loc.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastAudit = locAudits[0];

            return (
              <div key={loc.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                <div onClick={() => toggleExpand(loc.id)} className="p-5 cursor-pointer active:bg-gray-50 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight mb-1">{loc.name}</h2>
                    {lastAudit ? (
                      <div className="text-xs font-bold text-[#F25C05]">Последний аудит: {formatDate(lastAudit.date)}</div>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium">Проверок еще не было</div>
                    )}
                  </div>
                  <div className="text-right flex items-center justify-center bg-gray-50 w-8 h-8 rounded-full">
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedLocId === loc.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedLocId === loc.id && (
                  <div className="bg-gray-50 p-5 border-t border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">История проверок</h3>
                    
                    {locAudits.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">На этой точке еще никто не проводил аудит.</p>
                    ) : (
                      <div className="space-y-3">
                        {locAudits.map(audit => {
                          const maxScore = getMaxScore(audit.checklist);
                          const isPerfect = audit.score === maxScore;

                          return (
                            <div key={audit.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 mb-1">{formatDate(audit.date)}</div>
                                  <div className="text-sm font-bold text-gray-900">{audit.checklist?.title}</div>
                                  <div className="text-xs text-gray-500 mt-1">Аудитор: <span className="font-bold">{audit.user?.login}</span></div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${isPerfect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {audit.score} / {maxScore} б.
                                </span>
                              </div>
                              
                              <button 
                                onClick={(e) => exportToPDF(e, audit)}
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
          })
        )}
      </main>
    </div>
  );
}