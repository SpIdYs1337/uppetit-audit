import React from 'react';

// Расширяем интерфейс, чтобы получить доступ к вопросам, ответам и обработчикам
interface FinalStepAuditState {
  questions: any[];
  answers: Record<number, any>;
  employees: string[];
  handleEmployeeChange: (idx: number, value: string) => void;
  setEmployees: React.Dispatch<React.SetStateAction<string[]>>;
  generalComment: string;
  setGeneralComment: (value: string) => void;
  handlers: {
    handleGoToQuestion: (idx: number) => void;
  };
}

interface FinalStepProps {
  audit: FinalStepAuditState;
}

export function FinalStep({ audit }: FinalStepProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
      <h2 className="text-xl font-black text-gray-900">Итоги проверки</h2>
      
      {/* 1. СОТРУДНИКИ НА СМЕНЕ (ПЕРЕНЕСЕНО НАВЕРХ) */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Сотрудники на смене *</label>
        <div className="space-y-3">
          {audit.employees.map((emp: string, idx: number) => (
            <div key={idx} className="flex gap-2 items-center">
              <input type="text" value={emp} onChange={(e) => audit.handleEmployeeChange(idx, e.target.value)} placeholder="Имя Фамилия" className="flex-1 px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white text-sm outline-none font-bold text-gray-700 transition-colors focus:border-[#F25C05]" />
              {audit.employees.length > 1 && (
                <button onClick={() => audit.setEmployees((e: string[]) => e.filter((_, i) => i !== idx))} className="w-10 h-10 text-red-400 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => audit.setEmployees((e: string[]) => [...e, ''])} className="mt-3 text-sm font-bold text-[#F25C05] bg-orange-50 hover:bg-orange-100 transition-colors px-4 py-2 rounded-lg">+ Добавить</button>
      </div>
      
      {/* 2. ОБЩИЙ КОММЕНТАРИЙ (ПЕРЕНЕСЕНО НАВЕРХ) */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Общий комментарий</label>
        <textarea value={audit.generalComment} onChange={(e) => audit.setGeneralComment(e.target.value)} placeholder="Впечатления от смены..." className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium outline-none resize-none focus:bg-white focus:border-[#F25C05] transition-colors" rows={3} />
      </div>

      {/* 3. СВОДКА ОТВЕТОВ (ПЕРЕНЕСЕНО ВНИЗ) */}
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Сводка по пунктам</label>
        <div className="space-y-2">
          {audit.questions.map((q, idx) => {
            const ans = audit.answers[idx];
            const isOk = ans?.isOk;
            const hasPhoto = ans?.photos && ans.photos.length > 0;
            
            return (
              <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors">
                <span className="flex-1 font-medium text-gray-700">
                  <span className="text-gray-400 mr-1 font-bold">{idx + 1}.</span> {q.text}
                </span>
                <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {hasPhoto && <span title="Фото прикреплено" className="text-sm">📸</span>}
                    <span className="font-bold">
                      {isOk === true ? <span className="text-green-500">Всё отлично</span> : 
                       isOk === false ? <span className="text-red-500">Проблема</span> : 
                       <span className="text-gray-400">Пропущено</span>}
                    </span>
                  </div>
                  {/* ДОБАВЛЕНО: Кнопка перехода к пункту */}
                  <button 
                    onClick={() => audit.handlers.handleGoToQuestion(idx)}
                    className="bg-white border border-gray-200 text-gray-600 hover:text-[#F25C05] hover:border-[#F25C05] px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    К пункту ⤻
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}