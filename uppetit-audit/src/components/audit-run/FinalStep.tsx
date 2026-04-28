import React from 'react';

// Описываем, что именно мы ждем от хука
interface FinalStepAuditState {
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
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
      <h2 className="text-xl font-black text-gray-900 mb-6">Итоги проверки</h2>
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Сотрудники на смене *</label>
        <div className="space-y-3">
          {audit.employees.map((emp: string, idx: number) => (
            <div key={idx} className="flex gap-2 items-center">
              <input type="text" value={emp} onChange={(e) => audit.handleEmployeeChange(idx, e.target.value)} placeholder="Имя Фамилия" className="flex-1 px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white text-sm outline-none" />
              {audit.employees.length > 1 && (
                <button onClick={() => audit.setEmployees((e: string[]) => e.filter((_, i) => i !== idx))} className="w-10 h-10 text-red-400 bg-red-50 rounded-xl">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => audit.setEmployees((e: string[]) => [...e, ''])} className="mt-3 text-sm font-bold text-[#F25C05] bg-orange-50 px-4 py-2 rounded-lg">+ Добавить</button>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Общий комментарий</label>
        <textarea value={audit.generalComment} onChange={(e) => audit.setGeneralComment(e.target.value)} placeholder="Впечатления от смены..." className="w-full p-4 rounded-2xl bg-gray-50 border text-sm outline-none resize-none" rows={4} />
      </div>
    </div>
  );
}