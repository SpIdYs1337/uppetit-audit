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

  // Высчитываем максимальный балл из чек-листа
  const getMaxScore = (checklist: any) => {
    if (!checklist || !checklist.items) return 0;
    try {
      const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
      return items.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0);
    } catch (e) { return 0; }
  };

  // Удаление одного аудита
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

  // Очистка всей истории
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

  // Выгрузка полного отчета в Word
  // Выгрузка полного отчета в Word для Админа
  // ПОЛНАЯ ВЫГРУЗКА В WORD (ВСЕ ПУНКТЫ + ФОТО + КОММЕНТАРИИ)
  // Выгрузка полного отчета в Word для Админа (с исправленным размером фото)
  const exportToDoc = (e: React.MouseEvent, audit: any) => {
    e.stopPropagation();
    const maxScore = getMaxScore(audit.checklist);
    const date = formatDate(audit.date);

    const answersHtml = (!audit.answers || audit.answers.length === 0) 
      ? '<p>Детализация ответов отсутствует (старый формат аудита).</p>'
      : audit.answers.map((v: any) => `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
          <p style="font-size: 14pt; margin-bottom: 5px;"><b>Вопрос:</b> ${v.question}</p>
          ${v.isOk 
            ? `<p style="color: #0d652d; font-size: 12pt; margin-bottom: 5px;"><b>Статус:</b> ✓ Выполнено без замечаний</p>` 
            : `<p style="color: #d93025; font-size: 12pt; margin-bottom: 5px;"><b>Нарушение! Штраф:</b> -${v.penalty} б.</p>`
          }
          ${v.comment ? `<p style="font-size: 12pt; color: #555; margin-bottom: 10px;"><b>Комментарий:</b> ${v.comment}</p>` : ''}
          
          {/* ИСПРАВЛЕНИЕ ЗДЕСЬ: Добавили width="500" прямо в тег и обновили стили */}
          ${v.photoBase64 ? `<img src="${v.photoBase64}" width="500" style="width: 500px; height: auto; border-radius: 8px; margin-top: 10px; display: block;" />` : ''}
        </div>
      `).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>Аудит</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #F25C05; padding-bottom: 10px; margin-bottom: 20px;">Полный отчет по аудиту</h1>
        <table style="width: 100%; font-size: 12pt; margin-bottom: 30px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 150px;"><b>Точка:</b></td><td style="border-bottom: 1px solid #eee;">${audit.location?.name || 'Удалена'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><b>Чек-лист:</b></td><td style="border-bottom: 1px solid #eee;">${audit.checklist?.title || 'Удален'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><b>Проверяющий:</b></td><td style="border-bottom: 1px solid #eee;">${audit.user?.login || 'Удален'}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><b>Дата проверки:</b></td><td style="border-bottom: 1px solid #eee;">${date}</td></tr>
          <tr><td style="padding: 8px 0;"><b>Результат:</b></td><td style="font-weight: bold; font-size: 14pt;">${audit.score} из ${maxScore} баллов</td></tr>
        </table>
        <h2 style="color: #555; margin-top: 30px; margin-bottom: 15px;">Детализация чек-листа:</h2>
        ${answersHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Аудит_${audit.location?.name || 'Точка'}_${date.replace(/[ :.,]/g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // НОВАЯ ФУНКЦИЯ: КРАСИВАЯ ВЫГРУЗКА В PDF (в стиле скриншота)
  const exportToPDF = (e: React.MouseEvent, audit: any) => {
    e.stopPropagation();
    const maxScore = getMaxScore(audit.checklist);
    const scorePercent = maxScore > 0 ? ((audit.score / maxScore) * 100).toFixed(2) : '0.00';
    const date = formatDate(audit.date);

    const violations = audit.answers?.filter((a: any) => !a.isOk) || [];

    // Блок выявленных нарушений
    const violationsHtml = violations.length === 0
      ? '<p style="color: #777; font-size: 14px;">Нарушений нет</p>'
      : violations.map((v: any) => `
        <div class="item">
          <div class="question-text">${v.question}</div>
          ${v.comment ? `<div class="comment">Комментарий аудитора: ${v.comment}</div>` : ''}
        </div>
      `).join('');

    // Блок полного отчета
    const fullReportHtml = (!audit.answers || audit.answers.length === 0)
      ? '<p>Детализация отсутствует.</p>'
      : audit.answers.map((v: any) => `
        <div class="item">
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

    // Открываем новое скрытое окно для генерации PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Пожалуйста, разрешите всплывающие окна для этого сайта');
      return;
    }

    // Записываем HTML с красивым CSS
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
            <div class="score-value">${scorePercent}%</div>
          </div>
        </div>

        <div class="section-title">Выявленные нарушения</div>
        <div class="red-banner">ОСНОВНОЙ РАЗДЕЛ</div>
        ${violationsHtml}

        <div class="section-title">Полный отчет</div>
        <div class="gray-banner">ОСНОВНОЙ РАЗДЕЛ</div>
        ${fullReportHtml}

        <script>
          // Ждем полсекунды, чтобы картинки и шрифты загрузились, затем вызываем печать
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Закрываем окно после того, как пользователь нажал "Сохранить" или "Отмена"
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
                          
                          {/* ГРУППА КНОПОК ДЛЯ ВЫГРУЗКИ */}
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => exportToDoc(e, audit)}
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                            >
                              Скачать Word
                            </button>
                            <button 
                              onClick={(e) => exportToPDF(e, audit)}
                              className="bg-[#F25C05] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-md shadow-orange-500/20"
                            >
                              Скачать PDF
                            </button>
                          </div>

                        </div>

                        {(!audit.answers || audit.answers.length === 0) ? (
                           <div className="text-sm bg-orange-100 text-orange-700 p-4 rounded-xl font-bold border border-orange-200">
                             Детализация для этого аудита отсутствует (он был проведен до обновления системы).
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {audit.answers.map((ans: any) => (
                              <div key={ans.id} className={`p-4 rounded-xl border ${ans.isOk ? 'bg-green-50/30 border-green-100' : 'bg-white border-red-100 shadow-sm'}`}>
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
                                {/* Добавляем этот блок для вывода комментария в интерфейсе админа */}
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