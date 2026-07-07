'use client';

import { useState } from 'react';
import { useChecklists, ExtendedChecklist } from '@/hooks/useChecklists';
import { ChecklistEditor } from '@/components/checklists/ChecklistEditor';

// Расширяем тип для поддержки поля архивации
type ChecklistWithArchive = ExtendedChecklist & { isArchived?: boolean };

// Описываем структуру распарсенного вопроса
interface ParsedItem {
  score?: number | string;
  zone?: string;
  text?: string;
  title?: string;
  question?: string;
  isCritical?: boolean;
  isStar?: boolean;
  requiresPhoto?: boolean;
  [key: string]: any;
}

export default function AdminChecklistsPage() {
  // Функция deleteChecklist нам здесь больше не нужна для UI
  const { checklists, isLoading, saveChecklist } = useChecklists();
  
  const [editingChecklist, setEditingChecklist] = useState<ChecklistWithArchive | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const openEditor = (checklist: ChecklistWithArchive | null = null) => {
    setEditingChecklist(checklist);
    setIsEditorOpen(true);
  };

  const handleArchiveToggle = async (checklist: ChecklistWithArchive, archiveStatus: boolean) => {
    const actionText = archiveStatus ? 'отправить в архив' : 'восстановить';
    if (!confirm(`Точно ${actionText} этот чек-лист?`)) return;
    
    try {
      // Сохраняем чек-лист с обновленным статусом
      await saveChecklist({
        ...checklist,
        isArchived: archiveStatus
      });
    } catch (error) {
      console.error(error);
      alert('Ошибка при изменении статуса');
    }
  };

  const handleExportExcel = async (checklist: ChecklistWithArchive) => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();

      const ws1 = workbook.addWorksheet('Зоны и вопросы');

      ws1.columns = [
        { header: 'Зона', key: 'zone', width: 25 },
        { header: 'Вопрос', key: 'question', width: 50 },
        { header: 'Штраф', key: 'score', width: 10 },
        { header: 'Метка критического замечания', key: 'critical', width: 20 },
        { header: 'Фото к пункту', key: 'photo', width: 30 }
      ];

      ws1.getRow(1).height = 60;
      ws1.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      const itemsList: ParsedItem[] = typeof checklist.items === 'string' 
        ? JSON.parse(checklist.items) 
        : (checklist.items || []);

      let maxScore = 0;
      
      // Словарь для перевода статусов
      const photoStatusMap: Record<string, string> = {
        OPTIONAL: 'По желанию',
        REQUIRED: 'Обязательно',
        VIOLATION: 'Только при нарушении'
      };

      itemsList.forEach(item => {
        const score = Number(item.score) || 0;
        maxScore += score;
        
        // Читаем новый статус или fallback для старых данных
        let photoText = 'По желанию';
        if (item.photoRequirement) {
          photoText = photoStatusMap[item.photoRequirement] || 'По желанию';
        } else if (item.isPhotoRequired) {
          photoText = 'Обязательно';
        }

        ws1.addRow({
          zone: item.zone || 'Основной раздел',
          question: item.text || item.title || item.question || '',
          score: score,
          critical: item.isCritical || item.isStar ? 'Да' : 'Нет',
          photo: photoText
        });
      });

      ws1.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
          });
          row.getCell(2).alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
        }
      });

      const ws2 = workbook.addWorksheet('Разделение на Зоны качества');

      ws2.columns = [
        { header: 'Зона', key: 'zoneLabel', width: 15 },
        { header: 'Красная', key: 'red', width: 20 },
        { header: 'Желтая', key: 'yellow', width: 20 },
        { header: 'Зеленая', key: 'green', width: 20 },
        { header: 'Максимальный балл', key: 'max', width: 25 }
      ];

      ws2.getRow(1).height = 30;
      ws2.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      const redThresh = checklist.redThreshold || 0;
      const yellowThresh = checklist.yellowThreshold || 0;

      ws2.addRow({
        zoneLabel: 'Балл',
        red: `0 — ${redThresh - 1} б`,
        yellow: `${redThresh} — ${yellowThresh - 1} б`,
        green: `От ${yellowThresh} б`,
        max: `${maxScore} б`
      });

      ws2.getRow(2).height = 25;
      ws2.getRow(2).eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${checklist.title || 'Чек-лист'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при выгрузке в Excel:', error);
      alert('Произошла ошибка при формировании Excel файла.');
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500 font-bold">Загрузка...</div>;

  // Фильтруем чек-листы в зависимости от выбранной вкладки
  const displayedChecklists = (checklists as ChecklistWithArchive[]).filter(c => 
    activeTab === 'active' ? !c.isArchived : c.isArchived
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
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

      {!isEditorOpen && (
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-2 font-bold transition-colors border-b-2 text-sm uppercase tracking-wider ${activeTab === 'active' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Активные
          </button>
          <button 
            onClick={() => setActiveTab('archived')}
            className={`pb-3 px-2 font-bold transition-colors border-b-2 text-sm uppercase tracking-wider ${activeTab === 'archived' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Архив
          </button>
        </div>
      )}

      {isEditorOpen ? (
        <ChecklistEditor 
          initialData={editingChecklist} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={saveChecklist} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedChecklists.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-3xl">
              {activeTab === 'active' ? 'Нет активных чек-листов' : 'Архив пуст'}
            </div>
          )}
          
          {displayedChecklists.map(checklist => {
            const itemsList: ParsedItem[] = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : (checklist.items || []);
            const maxScore = itemsList.reduce((sum: number, i: ParsedItem) => sum + (Number(i.score) || 0), 0);
            const zones = Array.from(new Set(itemsList.map((i: ParsedItem) => i.zone || 'Основной раздел')));
            
            let rolesList: string[] = ['AUDITOR', 'TU'];
            try { rolesList = typeof checklist.allowedRoles === 'string' ? JSON.parse(checklist.allowedRoles) : (checklist.allowedRoles || []); } catch{}
            const roleLabels: Record<string, string> = { AUDITOR: 'Аудиторы', TU: 'ТУ', ADMIN: 'Админы' };

            return (
              <div key={checklist.id} className={`bg-white p-6 rounded-3xl shadow-sm border ${activeTab === 'archived' ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex flex-col`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xl font-black text-gray-900">{checklist.title}</h3>
                  {activeTab === 'archived' && (
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Архив</span>
                  )}
                </div>
                
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
                  {activeTab === 'active' ? (
                    <>
                      <button onClick={() => openEditor(checklist)} className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                        Ред.
                      </button>
                      <button onClick={() => handleExportExcel(checklist)} className="px-3 bg-green-50 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors" title="Выгрузить в Excel">
                        Excel
                      </button>
                      <button onClick={() => handleArchiveToggle(checklist, true)} className="px-3 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors" title="В архив">
                        В архив
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleExportExcel(checklist)} className="flex-1 bg-green-50 text-green-600 py-2 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors" title="Выгрузить в Excel">
                        Excel
                      </button>
                      <button onClick={() => handleArchiveToggle(checklist, false)} className="flex-2 px-4 bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors">
                        Восстановить
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}