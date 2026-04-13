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

  // КРАСИВАЯ ВЫГРУЗКА В PDF
  const exportToPDF = (e: React.MouseEvent, audit: any) => {
    e.stopPropagation();
    const maxScore = getMaxScore(audit.checklist);
    const scorePercent = maxScore > 0 ? ((audit.score / maxScore) * 100).toFixed(2) : '0.00';
    const date = formatDate(audit.date);

    const violations = audit.answers?.filter((a: any) => !a.isOk) || [];

    const violationsHtml = violations.length === 0
      ? '<p style="color: #777; font-size: 14px;">Нарушений нет</p>'
      : violations.map((v: any) => `
        <div class="item">
          <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
          <div class="question-text">${v.question}</div>
          ${v.comment ? `<div class="comment">Комментарий аудитора: ${v.comment}</div>` : ''}
        </div>
      `).join('');

    const fullReportHtml = (!audit.answers || audit.answers.length === 0)
      ? '<p>Детализация отсутствует.</p>'
      : audit.answers.map((v: any) => `
        <div class="item">
          <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
          <div class="item-header">
            <div class="${v.isOk ? 'icon-green' : 'icon-red'}">◯</div>
            <div>
              <div class="question-text">${v.question}</div>
              <div class="${v.isOk ? 'status-green' : 'status-red'}">
                ${v.isOk ? 'соответствие' : 'несоответствие'}
              </div>
              ${v.comment ? `<div class="comment">Комментарий аудитора: ${v.comment}</div>` : ''}
              ${v.photoBase64 && !v.isOk ? `<img class="photo" src="${v.photoBase64}" />` : ''}
            </div>
          </div>
        </div>
      `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Пожалуйста, разрешите всплывающие окна для этого сайта');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Отчет_${audit.location?.name}_${date}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; color: #333; padding: 40px; max-width: 900px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
          .logo-placeholder { width: 60px; height: 60px; background-color: #4A148C; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; background-image: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); }
          .info-block { font-size: 13px; color: #9e9e9e; line-height: 1.8; }
          .score-block { text-align: right; }
          .score-title { font-size: 16px; font-weight: 900; color: #b5b5c3; letter-spacing: 1px; text-transform: uppercase; }
          .score-value { font-size: 38px; font-weight: 900; color: #181c32; margin-top: 5px; }
          .section-title { font-size: 22px; font-weight: 900; margin: 50px 0 20px; color: #181c32; }
          .red-banner { background-color: #f1416c; color: white; padding: 12px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-radius: 4px; }
          .gray-banner { background-color: #f5f8fa; color: #5e6278; padding: 12px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-radius: 4px; }
          .zone-badge { display: inline-block; background-color: #e8f0fe; color: #1967d2; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .item { padding: 20px 0; border-bottom: 1px solid #eff2f5; page-break-inside: avoid; }
          .item-header { display: flex; align-items: flex-start; gap: 15px; }
          .icon-green { color: #50cd89; font-weight: 900; font-size: 22px; line-height: 0.8; }
          .icon-red { color: #f1416c; font-weight: 900; font-size: 22px; line-height: 0.8; }
          .question-text { font-size: 14px; font-weight: 700; color: #3f4254; line-height: 1.5; }
          .status-green { color: #50cd89; font-size: 12px; font-weight: 700; margin-top: 6px; text-transform: lowercase; }
          .status-red { color: #f1416c; font-size: 12px; font-weight: 700; margin-top: 6px; text-transform: lowercase; }
          .comment { color: #009ef7; font-size: 13px; font-weight: 700; margin-top: 8px; }
          .photo { max-width: 350px; max-height: 350px; border-radius: 8px; margin-top: 15px; display: block; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-placeholder">UP</div>
            <div class="info-block">
              <div>Чек-лист: <b>${audit.checklist?.title || 'Без названия'}</b></div>
              <div>Подразделение: <b>${audit.location?.name || 'Неизвестно'}</b></div>
              <div>Аудитор: <b>${audit.user?.login || 'Неизвестно'}</b></div>
              <div>Дата и время: <b>${date}</b></div>
            </div>
          </div>
          <div class="score-block">
            <div class="score-title">ОЦЕНКА</div>
            <div class="score-value">${audit.score} / ${maxScore}</div>
          </div>
        </div>

        <div class="section-title">Выявленные нарушения</div>
        <div class="red-banner">ОШИБКИ И НЕДОЧЕТЫ</div>
        ${violationsHtml}

        <div class="section-title">Полный отчет</div>
        <div class="gray-banner">ВСЕ ОТВЕТЫ</div>
        ${fullReportHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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

                        {(!audit.answers || audit.answers.length === 0) ? (
                           <div className="text-sm bg-orange-100 text-orange-700 p-4 rounded-xl font-bold border border-orange-200">
                             Детализация для этого аудита отсутствует (он был проведен до обновления системы).
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {audit.answers.map((ans: any) => (
                              <div key={ans.id} className={`p-4 rounded-xl border ${ans.isOk ? 'bg-green-50/30 border-green-100' : 'bg-white border-red-100 shadow-sm'}`}>
                                {/* БЛОК ЗОНЫ */}
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
                                
                                {!ans.isOk && ans.photoBase64 && (
                                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
                                    <img src={ans.photoBase64} alt="Фото нарушения" className="max-h-48 w-full object-cover" />
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