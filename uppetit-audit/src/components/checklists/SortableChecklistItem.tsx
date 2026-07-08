import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChecklistItemType } from './ChecklistEditor';

interface SortableItemProps {
  item: ChecklistItemType;
  handleUpdateItem: (id: string, field: keyof ChecklistItemType, value: any) => void;
  handleRemoveItem: (id: string) => void;
}

export function SortableChecklistItem({ item, handleUpdateItem, handleRemoveItem }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  const getPhotoSelectStyle = () => {
    switch (item.photoRequirement) {
      case 'REQUIRED':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50';
      case 'VIOLATION':
        return 'bg-orange-50 dark:bg-orange-900/30 text-[#F25C05] dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50';
      case 'OPTIONAL':
      default:
        return 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800';
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex flex-wrap md:flex-nowrap gap-3 p-3 sm:p-4 rounded-2xl transition-all duration-300 relative group items-center ${
        isDragging 
          ? 'bg-white dark:bg-zinc-800 shadow-xl scale-[1.02] ring-2 ring-[#F25C05]/50 z-50' 
          : 'bg-white dark:bg-zinc-900 hover:shadow-md'
      }`}
    >
      {/* Ползунок для перетаскивания */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-zinc-600 hover:text-[#F25C05] dark:hover:text-[#F25C05] p-2 -ml-2 -mr-1 flex-shrink-0 touch-none transition-colors"
        title="Потяните, чтобы переместить"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Зона */}
      <div className="w-full md:w-1/4 shrink-0">
        <input 
          type="text" 
          value={item.zone || ''} 
          onChange={e => handleUpdateItem(item.id, 'zone', e.target.value)}
          placeholder="Зона (напр. Бар)"
          className="w-full px-4 py-3 rounded-xl border border-transparent text-sm font-bold text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 focus:border-[#F25C05] dark:focus:border-[#F25C05] outline-none transition-colors shadow-sm"
        />
      </div>

      {/* Текст вопроса */}
      <div className="w-full md:flex-1">
        <input 
          type="text" 
          value={item.text || ''} 
          onChange={e => handleUpdateItem(item.id, 'text', e.target.value)}
          placeholder="Текст вопроса..."
          className="w-full px-4 py-3 rounded-xl border border-transparent text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 focus:border-[#F25C05] dark:focus:border-[#F25C05] outline-none transition-colors shadow-sm"
        />
      </div>

      {/* Штрафной балл */}
      <div className="w-20 shrink-0">
        <input 
          type="number" 
          value={item.score === 0 ? '' : item.score} 
          onChange={e => handleUpdateItem(item.id, 'score', e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder="Штраф"
          className="w-full px-2 py-3 rounded-xl border border-transparent text-sm font-black text-red-600 dark:text-red-400 placeholder-red-300 dark:placeholder-red-900/50 bg-red-50/50 dark:bg-red-900/10 focus:bg-white dark:focus:bg-zinc-950 focus:border-[#F25C05] dark:focus:border-[#F25C05] outline-none transition-colors text-center shadow-sm"
        />
      </div>

      {/* Выпадающий список "Требование к фото" */}
      {/* ИСПРАВЛЕНИЕ: Увеличена ширина с 155px до 180px */}
      <div className="w-full md:w-[180px] shrink-0 relative">
        <select
          value={item.photoRequirement || 'OPTIONAL'}
          onChange={e => handleUpdateItem(item.id, 'photoRequirement', e.target.value)}
          className={`w-full h-[44px] appearance-none pl-3 pr-8 rounded-xl border border-transparent transition-all text-[10px] font-black outline-none cursor-pointer uppercase tracking-wider shadow-sm ${getPhotoSelectStyle()}`}
          title="Требование к фото"
        >
          {/* ИСПРАВЛЕНИЕ: Добавлены цвета для темной темы в <option> */}
          <option value="OPTIONAL" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-bold">📷 По желанию</option>
          <option value="REQUIRED" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-bold">📸 Обязательно</option>
          <option value="VIOLATION" className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-bold">🚨 При нарушении</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Кнопка "Критичный вопрос" */}
      <button 
        onClick={() => handleUpdateItem(item.id, 'isCritical', !item.isCritical)} 
        title={item.isCritical ? "Критичный вопрос (снимает все баллы зоны)" : "Обычный вопрос"}
        className={`w-11 shrink-0 h-[44px] flex items-center justify-center rounded-xl border border-transparent transition-all font-black text-lg shadow-sm ${
          item.isCritical 
            ? 'bg-red-500 text-white shadow-md shadow-red-500/20' 
            : 'bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800'
        }`}
      >
        !
      </button>

      {/* Кнопка удаления */}
      <button 
        onClick={() => handleRemoveItem(item.id)} 
        title="Удалить вопрос"
        className="w-11 shrink-0 h-[44px] flex items-center justify-center text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shadow-sm"
      >
        ✕
      </button>
    </div>
  );
}