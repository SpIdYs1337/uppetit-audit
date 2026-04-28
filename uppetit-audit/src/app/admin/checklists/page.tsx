'use client';

import { useState } from 'react';
import { useChecklists, ExtendedChecklist } from '@/hooks/useChecklists';
import { ChecklistEditor } from '@/components/checklists/ChecklistEditor';

// Описываем структуру распарсенного вопроса
interface ParsedItem {
  score?: number | string;
  zone?: string;
}

export default function AdminChecklistsPage() {
  const { checklists, isLoading, saveChecklist, deleteChecklist } = useChecklists();
  
  const [editingChecklist, setEditingChecklist] = useState<ExtendedChecklist | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const openEditor = (checklist: ExtendedChecklist | null = null) => {
    setEditingChecklist(checklist);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить этот чек-лист?')) return;
    try {
      await deleteChecklist(id);
    } catch {
      alert('Ошибка при удалении');
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500 font-bold">Загрузка...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Чек-листы</h1>
          <p className="text-gray-500 mt-2 text-sm md:text-base">Управление списками проверок и их зонами</p>
        </div>
        {!isEditorOpen && (
          <button onClick={() => openEditor(null)} className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
            + Создать чек-лист
          </button>
        )}
      </div>

      {isEditorOpen ? (
        <ChecklistEditor 
          initialData={editingChecklist} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={saveChecklist} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.map(checklist => {
            const itemsList: ParsedItem[] = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : (checklist.items || []);
            const maxScore = itemsList.reduce((sum: number, i: ParsedItem) => sum + (Number(i.score) || 0), 0);
            const zones = Array.from(new Set(itemsList.map((i: ParsedItem) => i.zone || 'Основной раздел')));
            
            let rolesList: string[] = ['AUDITOR', 'TU'];
            try { rolesList = typeof checklist.allowedRoles === 'string' ? JSON.parse(checklist.allowedRoles) : (checklist.allowedRoles || []); } catch{}
            const roleLabels: Record<string, string> = { AUDITOR: 'Аудиторы', TU: 'ТУ', ADMIN: 'Админы' };

            return (
              <div key={checklist.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-xl font-black text-gray-900 mb-1">{checklist.title}</h3>
                <p className="text-sm text-gray-500 font-medium mb-3">{itemsList.length} вопросов • {maxScore} баллов максимум</p>
                
                <div className="mb-4 flex flex-wrap gap-1 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Доступ:</span>
                  {rolesList.map((r: string) => (
                    <span key={r} className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                      {roleLabels[r] || r}
                    </span>
                  ))}
                </div>

                <div className="flex gap-1 mb-4">
                  <div className="flex-1 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold py-1 text-center rounded-l-md">&lt; {checklist.redThreshold} б.</div>
                  <div className="flex-1 bg-yellow-50 border border-yellow-100 text-yellow-600 text-[10px] font-bold py-1 text-center">{checklist.redThreshold} - {checklist.yellowThreshold - 1} б.</div>
                  <div className="flex-1 bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold py-1 text-center rounded-r-md">{checklist.yellowThreshold} б.+</div>
                </div>
                
                <div className="mb-6 flex flex-wrap gap-2">
                  {zones.map((z: string) => <span key={z} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{z}</span>)}
                </div>

                <div className="mt-auto flex gap-2 pt-4 border-t border-gray-50">
                  <button onClick={() => openEditor(checklist)} className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                    Редактировать
                  </button>
                  <button onClick={() => handleDelete(checklist.id)} className="px-4 bg-red-50 text-red-500 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors">
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}