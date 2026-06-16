import React from 'react';

// Расширяем интерфейс, чтобы получить доступ к вопросам и ответам
interface FinalStepAuditState {
  questions: any[];
  answers: Record<number, any>;
  employees: string[];
  handleEmployeeChange: (idx: number, value: string) => void;
  setEmployees: React.Dispatch<React.SetStateAction<string[]>>;
  generalComment: string;
  setGeneralComment: (value: string) => void;
}

interface FinalStepProps {
  audit: FinalStepAuditState;
}

export function FinalStep({ audit }: FinalStepProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full max-h-[70vh]">
      <h2 className="text-xl font-black text-gray-900 mb-6">Итоги проверки</h2>
      
      {/* СВОДКА ОТВЕТОВ */}
      <div className="mb-6 flex-1 overflow-hidden flex flex-col">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Сводка по пунктам</label>
        <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {audit.questions.map((q, idx) => {
            const ans = audit.answers[idx];
            const isOk = ans?.isOk;
            const hasPhoto = ans?.photos && ans.photos.length > 0;
            
            return (
              <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                <span className="truncate flex-1 mr-3 font-medium text-gray-700">
                  <span className="text-gray-400 mr-1">{idx + 1}.</span> {q.text}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {hasPhoto && <span title="Фото прикреплено" className="text-sm">📸</span>}
                  <span className="font-bold">
                    {isOk === true ? <span className="text-green-500">Всё отлично</span> : 
                     isOk === false ? <span className="text-red-500">Проблема</span> : 
                     <span className="text-gray-400">Пропущено</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 shrink-0">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Сотрудники на смене *</label>
        <div className="space-y-3">
          {audit.employees.map((emp: string, idx: number) => (
            <div key={idx} className="flex gap-2 items-center">
              <input type="text" value={emp} onChange={(e) => audit.handleEmployeeChange(idx, e.target.value)} placeholder="Имя Фамилия" className="flex-1 px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white text-sm outline-none font-bold text-gray-700" />
              {audit.employees.length > 1 && (
                <button onClick={() => audit.setEmployees((e: string[]) => e.filter((_, i) => i !== idx))} className="w-10 h-10 text-red-400 bg-red-50 rounded-xl font-bold">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => audit.setEmployees((e: string[]) => [...e, ''])} className="mt-3 text-sm font-bold text-[#F25C05] bg-orange-50 px-4 py-2 rounded-lg">+ Добавить</button>
      </div>
      
      <div className="shrink-0">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Общий комментарий</label>
        <textarea value={audit.generalComment} onChange={(e) => audit.setGeneralComment(e.target.value)} placeholder="Впечатления от смены..." className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium outline-none resize-none focus:bg-white focus:border-[#F25C05] transition-colors" rows={3} />
      </div>
    </div>
  );
}