import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableChecklistItem } from './SortableChecklistItem';
import { Checklist } from '@prisma/client';

export interface ChecklistItemType {
  id: string;
  zone: string;
  text: string;
  score: number | string;
  isCritical: boolean;
  photoRequirement?: 'OPTIONAL' | 'REQUIRED' | 'VIOLATION'; // <-- Новое поле
}

export type ExtendedChecklist = Checklist & {
  items?: any;
};

interface ChecklistEditorProps {
  initialData: ExtendedChecklist | null;
  onClose: () => void;
  onSave: (body: any, isUpdate: boolean) => Promise<void>;
}

export function ChecklistEditor({ initialData, onClose, onSave }: ChecklistEditorProps) {
  const isUpdate = !!initialData;
  const [title, setTitle] = useState(initialData?.title || '');
  
  const [redThreshold, setRedThreshold] = useState<number | string>(initialData?.redThreshold ?? 70);
  const [yellowThreshold, setYellowThreshold] = useState<number | string>(initialData?.yellowThreshold ?? 90);
  
  const [allowedRoles, setAllowedRoles] = useState<string[]>(() => {
    if (!initialData?.allowedRoles) return ['AUDITOR', 'TU'];
    try { return typeof initialData.allowedRoles === 'string' ? JSON.parse(initialData.allowedRoles) : initialData.allowedRoles; } 
    catch { return ['AUDITOR', 'TU']; }
  });

  const [items, setItems] = useState<ChecklistItemType[]>(() => {
    if (!initialData?.items) return [{ id: Math.random().toString(36).substring(2, 9), zone: 'Основной раздел', text: '', score: 0, isCritical: false, photoRequirement: 'OPTIONAL' }];
    try {
      const parsedItems = typeof initialData.items === 'string' ? JSON.parse(initialData.items as string) : initialData.items;
      return parsedItems.map((item: any) => ({ 
        ...item, 
        id: item.id || Math.random().toString(36).substring(2, 9),
        // Безопасно подхватываем старые галочки, если они еще остались в кэше
        photoRequirement: item.photoRequirement || (item.isPhotoRequired ? 'REQUIRED' : 'OPTIONAL')
      }));
    } catch { return []; }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleRoleToggle = (role: string) => {
    setAllowedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleAddItem = () => {
    const lastZone = items.length > 0 ? items[items.length - 1].zone : 'Основной раздел';
    setItems([...items, { id: Math.random().toString(36).substring(2, 9), zone: lastZone, text: '', score: 0, isCritical: false, photoRequirement: 'OPTIONAL' }]);
  };

  const handleUpdateItem = (id: string, field: string, value: any) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleRemoveItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || items.length === 0) return alert('Заполните название и добавьте вопросы');
    if (allowedRoles.length === 0) return alert('Выберите хотя бы одну роль');
    if (Number(redThreshold) >= Number(yellowThreshold)) return alert('Красная зона должна быть меньше желтой!');

    const body = {
      id: initialData?.id,
      title,
      items: JSON.stringify(items),
      redThreshold: Number(redThreshold) || 0,
      yellowThreshold: Number(yellowThreshold) || 0,
      allowedRoles: JSON.stringify(allowedRoles)
    };

    try {
      await onSave(body, isUpdate);
      onClose();
    } catch {
      alert('Ошибка при сохранении');
    }
  };

  const rVal = Number(redThreshold) || 0;
  const yVal = Number(yellowThreshold) || 0;

  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-900">{isUpdate ? 'Редактирование' : 'Новый чек-лист'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕ Закрыть</button>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Название чек-листа</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[#F25C05] outline-none font-bold text-gray-900" placeholder="Например: Утренний Бар" />
      </div>

      <div className="mb-6 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Кто может проводить аудит?</label>
        <div className="flex flex-wrap gap-3">
          {[{ id: 'AUDITOR', label: 'Аудиторы' }, { id: 'TU', label: 'ТУ' }, { id: 'ADMIN', label: 'Админы' }].map(role => (
            <label key={role.id} className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 hover:border-[#F25C05] transition-colors shadow-sm select-none">
              <input type="checkbox" className="w-5 h-5 text-[#F25C05] rounded focus:ring-[#F25C05] cursor-pointer" checked={allowedRoles.includes(role.id)} onChange={() => handleRoleToggle(role.id)} />
              <span className="text-sm font-bold text-gray-700">{role.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-8 p-4 md:p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Настройка оценки (в баллах)</h3>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-1 rounded-md uppercase tracking-wider w-fit">
            Границы считаются автоматически
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex flex-col">
            <label className="block text-xs font-bold text-red-500 mb-1">Красная (строго меньше)</label>
            <div className="text-[10px] text-gray-400 mb-3 leading-tight">Баллы ниже этого числа</div>
            <input type="number" min="0" value={redThreshold} onChange={e => setRedThreshold(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 text-xl font-black text-red-600 bg-red-50 rounded-lg outline-none text-center mb-auto" />
            <div className="mt-3 text-[11px] text-center font-bold text-red-500 bg-red-50/80 py-1.5 rounded-lg border border-red-100/50">
              Попадают: 0 — {rVal > 0 ? rVal - 1 : 0} б.
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm flex flex-col">
            <label className="block text-xs font-bold text-yellow-600 mb-1">Желтая (строго меньше)</label>
            <div className="text-[10px] text-gray-400 mb-3 leading-tight">Баллы от красной до этого числа</div>
            <input type="number" min="0" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 text-xl font-black text-yellow-600 bg-yellow-50 rounded-lg outline-none text-center mb-auto" />
            <div className="mt-3 text-[11px] text-center font-bold text-yellow-600 bg-yellow-50/80 py-1.5 rounded-lg border border-yellow-100/50">
              Попадают: {rVal} — {yVal > 0 ? yVal - 1 : 0} б.
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex flex-col opacity-90">
            <label className="block text-xs font-bold text-green-600 mb-1">Зеленая (включительно)</label>
            <div className="text-[10px] text-gray-400 mb-3 leading-tight">Все баллы начиная с этого числа</div>
            <div className="w-full p-2 text-xl font-black text-green-600 bg-green-50 rounded-lg text-center mb-auto flex items-center justify-center min-h-[44px]">
              {yVal} и выше
            </div>
            <div className="mt-3 text-[11px] text-center font-bold text-green-600 bg-green-50/80 py-1.5 rounded-lg border border-green-100/50">
              Попадают: От {yVal} б. до максимума
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Вопросы и зоны</label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableChecklistItem key={item.id} item={item} handleUpdateItem={handleUpdateItem} handleRemoveItem={handleRemoveItem} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-100 pt-6 mt-4 gap-4">
        <button onClick={handleAddItem} className="w-full sm:w-auto text-[#F25C05] font-bold bg-orange-50 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors">+ Добавить вопрос</button>
        <button onClick={handleSubmit} className="w-full sm:w-auto bg-[#F25C05] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">Сохранить</button>
      </div>
    </div>
  );
}