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
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col gap-6 transition-colors duration-300">
      <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 transition-colors">Итоги проверки</h2>
      
      {/* 1. СОТРУДНИКИ НА СМЕНЕ */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-3 transition-colors">Сотрудники на смене *</label>
        <div className="space-y-3">
          {audit.employees.map((emp: string, idx: number) => (
            <div key={idx} className="flex gap-2 items-center">
              <input 
                type="text" 
                value={emp} 
                onChange={(e) => audit.handleEmployeeChange(idx, e.target.value)} 
                placeholder="Имя Фамилия" 
                className="flex-1 px-4 py-3 rounded-xl border border-transparent dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 text-sm outline-none font-bold text-gray-700 dark:text-zinc-300 transition-colors focus:border-[#F25C05] dark:focus:border-[#F25C05]" 
              />
              {audit.employees.length > 1 && (
                <button 
                  onClick={() => audit.setEmployees((e: string[]) => e.filter((_, i) => i !== idx))} 
                  className="w-10 h-10 text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button 
          onClick={() => audit.setEmployees((e: string[]) => [...e, ''])} 
          className="mt-3 text-sm font-bold text-[#F25C05] dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors px-4 py-2 rounded-lg"
        >
          + Добавить
        </button>
      </div>
      
      {/* 2. ОБЩИЙ КОММЕНТАРИЙ */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-3 transition-colors">Общий комментарий</label>
        <textarea 
          value={audit.generalComment} 
          onChange={(e) => audit.setGeneralComment(e.target.value)} 
          placeholder="Впечатления от смены..." 
          className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-700 text-sm font-medium text-gray-900 dark:text-zinc-200 outline-none resize-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors" 
          rows={3} 
        />
      </div>

      {/* 3. СВОДКА ОТВЕТОВ */}
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-3 transition-colors">Сводка по пунктам</label>
        <div className="space-y-2">
          {audit.questions.map((q, idx) => {
            const ans = audit.answers[idx];
            const isOk = ans?.isOk;
            const hasPhoto = ans?.photos && ans.photos.length > 0;
            
            return (
              <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 hover:border-gray-200 dark:hover:border-zinc-700 transition-colors">
                <span className="flex-1 font-medium text-gray-700 dark:text-zinc-300">
                  <span className="text-gray-400 dark:text-zinc-500 mr-1 font-bold">{idx + 1}.</span> {q.text}
                </span>
                <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {hasPhoto && <span title="Фото прикреплено" className="text-sm">📸</span>}
                    <span className="font-bold">
                      {isOk === true ? <span className="text-green-500 dark:text-green-400">Всё отлично</span> : 
                       isOk === false ? <span className="text-red-500 dark:text-red-400">Проблема</span> : 
                       <span className="text-gray-400 dark:text-zinc-500">Пропущено</span>}
                    </span>
                  </div>
                  <button 
                    onClick={() => audit.handlers.handleGoToQuestion(idx)}
                    className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:text-[#F25C05] dark:hover:text-[#F25C05] hover:border-[#F25C05] dark:hover:border-[#F25C05] px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
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