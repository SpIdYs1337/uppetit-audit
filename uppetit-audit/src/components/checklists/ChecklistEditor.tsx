import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableChecklistItem } from './SortableChecklistItem';
import { Checklist } from '@prisma/client';

export interface ChecklistItemType {
  id: string;
  zone: string;
  text: string;
  score: number | string; // ИЗМЕНЕНО: теперь принимает и строку (для пустой ячейки)
  isCritical: boolean;
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
  
  // ИЗМЕНЕНО: Добавлена типизация <number | string>
  const [redThreshold, setRedThreshold] = useState<number | string>(initialData?.redThreshold ?? 70);
  const [yellowThreshold, setYellowThreshold] = useState<number | string>(initialData?.yellowThreshold ?? 90);
  
  const [allowedRoles, setAllowedRoles] = useState<string[]>(() => {
    if (!initialData?.allowedRoles) return ['AUDITOR', 'TU'];
    try { return typeof initialData.allowedRoles === 'string' ? JSON.parse(initialData.allowedRoles) : initialData.allowedRoles; } 
    catch { return ['AUDITOR', 'TU']; }
  });

  const [items, setItems] = useState<ChecklistItemType[]>(() => {
    if (!initialData?.items) return [{ id: Math.random().toString(36).substring(2, 9), zone: 'Основной раздел', text: '', score: 0, isCritical: false }];
    try {
      const parsedItems = typeof initialData.items === 'string' ? JSON.parse(initialData.items as string) : initialData.items;
      return parsedItems.map((item: any) => ({ ...item, id: item.id || Math.random().toString(36).substring(2, 9) }));
    } catch { return []; }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleRoleToggle = (role: string) => {
    setAllowedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleAddItem = () => {
    const lastZone = items.length > 0 ? items[items.length - 1].zone : 'Основной раздел';
    setItems([...items, { id: Math.random().toString(36).substring(2, 9), zone: lastZone, text: '', score: 0, isCritical: false }]);
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
      redThreshold: Number(redThreshold) || 0, // Принудительно конвертируем перед отправкой
      yellowThreshold: Number(yellowThreshold) || 0, // Принудительно конвертируем перед отправкой
      allowedRoles: JSON.stringify(allowedRoles)
    };

    try {
      await onSave(body, isUpdate);
      onClose();
    } catch {
      alert('Ошибка при сохранении');
    }
  };

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
        <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Настройка оценки (в баллах)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
            <label className="block text-xs font-bold text-red-500 mb-2">Красная (до)</label>
            {/* ИЗМЕНЕНО: Проверка на пустую строку */}
            <input type="number" min="0" value={redThreshold} onChange={e => setRedThreshold(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 text-xl font-black text-red-600 bg-red-50 rounded-lg outline-none text-center" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm">
            <label className="block text-xs font-bold text-yellow-600 mb-2">Желтая (до)</label>
            {/* ИЗМЕНЕНО: Проверка на пустую строку */}
            <input type="number" min="0" value={yellowThreshold} onChange={e => setYellowThreshold(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 text-xl font-black text-yellow-600 bg-yellow-50 rounded-lg outline-none text-center" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center opacity-80">
            <label className="block text-xs font-bold text-green-600 mb-2">Зеленая</label>
            <div className="w-full p-2 text-xl font-black text-green-600 bg-green-50 rounded-lg text-center">{yellowThreshold || 0} и выше</div>
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