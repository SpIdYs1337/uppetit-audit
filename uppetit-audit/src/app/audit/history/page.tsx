'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import Link from 'next/link';

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const getMaxScore = (checklist: any) => {
    if (!checklist || !checklist.items) return 0;
    try {
      const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
      return items.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0);
    } catch (e) { return 0; }
  };

  // КРАСИВАЯ ВЫГРУЗКА В PDF
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
          <div class="zone-badge">${v.zone || 'Основной раздел'}</div>
          <div class="question-text">${v.question}</div>
          ${v.comment ? `<div class="comment">Комментарий аудитора: ${v.comment}</div>` : ''}
        </div>
      `).join('');

    // Блок полного отчета
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

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-400">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-10 flex items-center gap-4">
        <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900">История</h1>
          <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Ваши прошлые проверки</p>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-10">
        {audits.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 font-medium text-sm">Вы еще не провели ни одного аудита</div>
        ) : (
          audits.map((audit) => {
            const maxScore = getMaxScore(audit.checklist);
            return (
              <div key={audit.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                <div onClick={() => toggleExpand(audit.id)} className="p-5 cursor-pointer active:bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{formatDate(audit.date)}</div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">{audit.location?.name || 'Неизвестная точка'}</h2>
                    <div className="text-xs text-gray-500 font-medium mt-1">{audit.checklist?.title || 'Чек-лист удален'}</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-2xl font-black text-[#F25C05] whitespace-nowrap">{audit.score} <span className="text-sm text-gray-400">/ {maxScore} б.</span></div>
                  </div>
                </div>

                {expandedId === audit.id && (
                  <div className="bg-gray-50 p-5 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Детали проверки</h3>
                      <button onClick={(e) => exportToPDF(e, audit)} className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#F25C05] hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-orange-500/20">
                        Скачать PDF
                      </button>
                    </div>
                    
                    {(!audit.answers || audit.answers.length === 0) ? (
                      <div className="text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl border border-orange-100">Детализация не сохранилась (старый аудит).</div>
                    ) : (
                      <div className="space-y-4 mt-3">
                        {audit.answers.map((ans: any) => (
                          <div key={ans.id} className={`p-4 rounded-2xl border ${ans.isOk ? 'bg-white border-gray-100' : 'bg-red-50/50 border-red-100'}`}>
                            {/* БЛОК ЗОНЫ */}
                            <div className="mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                                {ans.zone || 'Основной раздел'}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <span className="text-sm font-bold text-gray-900 leading-tight">{ans.question}</span>
                              {ans.isOk ? (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg whitespace-nowrap">✓ Ок</span>
                              ) : (
                                <span className="text-xs font-black text-red-500 bg-red-100 px-2 py-1 rounded-lg whitespace-nowrap">-{ans.penalty} б.</span>
                              )}
                            </div>
                            
                            {ans.comment && (
                              <div className="mt-2 text-sm text-gray-700 bg-gray-100/50 p-3 rounded-xl border border-gray-200/50">
                                <span className="font-bold text-gray-500 mr-1">Комментарий:</span> {ans.comment}
                              </div>
                            )}

                            {ans.photoBase64 && !ans.isOk && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                                <img src={ans.photoBase64} alt="Фото" className="w-full h-auto object-cover" />
                              </div>
                            )}
                          </div>
                        ))}
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