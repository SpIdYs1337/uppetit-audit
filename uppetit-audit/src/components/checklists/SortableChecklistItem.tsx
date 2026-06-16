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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex flex-wrap md:flex-nowrap gap-3 bg-white p-4 rounded-2xl border ${isDragging ? 'border-[#F25C05] shadow-lg scale-[1.02]' : 'border-gray-100 shadow-sm'} relative group items-center`}
    >
      {/* Ползунок для перетаскивания */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#F25C05] p-2 -ml-2 -mr-1 flex-shrink-0 touch-none"
        title="Потяните, чтобы переместить"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Зона */}
      <div className="w-full md:w-1/4">
        <input 
          type="text" 
          value={item.zone || ''} 
          onChange={e => handleUpdateItem(item.id, 'zone', e.target.value)}
          placeholder="Зона (напр. Бар)"
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
        />
      </div>

      {/* Текст вопроса */}
      <div className="w-full md:flex-1">
        <input 
          type="text" 
          value={item.text || ''} 
          onChange={e => handleUpdateItem(item.id, 'text', e.target.value)}
          placeholder="Текст вопроса..."
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
        />
      </div>

      {/* Штрафной балл */}
      <div className="w-20">
        <input 
          type="number" 
          value={item.score === 0 ? '' : item.score} 
          onChange={e => handleUpdateItem(item.id, 'score', e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder="Штраф"
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-red-600 placeholder-red-300 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors text-center"
        />
      </div>

      {/* ДОБАВЛЕНО: Кнопка "Обязательное фото" */}
      <button 
        onClick={() => handleUpdateItem(item.id, 'isPhotoRequired', !item.isPhotoRequired)} 
        title={item.isPhotoRequired ? "Фото обязательно" : "Фото по желанию"}
        className={`w-12 h-[46px] flex items-center justify-center rounded-xl border-2 transition-all ${
          item.isPhotoRequired 
            ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/30' 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Кнопка "Критичный вопрос" */}
      <button 
        onClick={() => handleUpdateItem(item.id, 'isCritical', !item.isCritical)} 
        title={item.isCritical ? "Критичный вопрос" : "Обычный вопрос"}
        className={`w-12 h-[46px] flex items-center justify-center rounded-xl border-2 transition-all font-black text-lg ${
          item.isCritical 
            ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/30' 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
      >
        !
      </button>

      {/* Кнопка удаления */}
      <button 
        onClick={() => handleRemoveItem(item.id)} 
        title="Удалить вопрос"
        className="w-12 h-[46px] flex items-center justify-center text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-colors"
      >
        ✕
      </button>
    </div>
  );
}