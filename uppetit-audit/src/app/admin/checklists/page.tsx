'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- КОМПОНЕНТ ПЕРЕТАСКИВАЕМОГО ВОПРОСА ---
function SortableItem({ 
  item, 
  handleUpdateItem, 
  handleRemoveItem 
}: { 
  item: any; 
  handleUpdateItem: (id: string, field: string, value: any) => void;
  handleRemoveItem: (id: string) => void;
}) {
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
      {/* РУЧКА ДЛЯ ПЕРЕТАСКИВАНИЯ */}
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

      {/* ЗОНА */}
      <div className="w-full md:w-1/4">
        <input 
          type="text" 
          value={item.zone || ''} 
          onChange={e => handleUpdateItem(item.id, 'zone', e.target.value)}
          placeholder="Зона (напр. Бар)"
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
        />
      </div>

      {/* ВОПРОС */}
      <div className="w-full md:flex-1">
        <input 
          type="text" 
          value={item.text || ''} 
          onChange={e => handleUpdateItem(item.id, 'text', e.target.value)}
          placeholder="Текст вопроса..."
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
        />
      </div>

      {/* БАЛЛЫ */}
      <div className="w-20">
        <input 
          type="number" 
          value={item.score === 0 ? '' : item.score} 
          onChange={e => handleUpdateItem(item.id, 'score', e.target.value === '' ? 0 : Number(e.target.value))}
          placeholder="Штраф"
          className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-red-600 placeholder-red-300 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors text-center"
          title="Сколько баллов снимать"
        />
      </div>

      {/* КНОПКА: КРИТИЧНОСТЬ */}
      <button 
        title={item.isCritical ? "Критическое нарушение (снять отметку)" : "Отметить как критическое"}
        onClick={() => handleUpdateItem(item.id, 'isCritical', !item.isCritical)} 
        className={`w-12 h-[46px] flex items-center justify-center rounded-xl border-2 transition-all font-black text-lg ${
          item.isCritical 
            ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/30' 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        }`}
      >
        !
      </button>

      {/* УДАЛИТЬ */}
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


// --- ОСНОВНАЯ СТРАНИЦА ---
export default function AdminChecklistsPage() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  
  // ИСПРАВЛЕНИЕ 1: Состояние для ролей
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['AUDITOR', 'TU']);
  
  const [redThreshold, setRedThreshold] = useState(70);
  const [yellowThreshold, setYellowThreshold] = useState(90);
  
  const [items, setItems] = useState<any[]>([]);

  // Сенсоры для DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Чтобы клики по инпутам не запускали перетаскивание
      },
    })
  );

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/checklists');
      const data = await res.json();
      setChecklists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditor = (checklist: any = null) => {
    if (checklist) {
      setCurrentId(checklist.id);
      setTitle(checklist.title);
      setRedThreshold(checklist.redThreshold ?? 70);
      setYellowThreshold(checklist.yellowThreshold ?? 90);
      
      // ИСПРАВЛЕНИЕ 2: Подтягиваем роли при редактировании
      let roles = ['AUDITOR', 'TU'];
      if (checklist.allowedRoles) {
        try {
          roles = typeof checklist.allowedRoles === 'string' ? JSON.parse(checklist.allowedRoles) : checklist.allowedRoles;
        } catch (e) {}
      }
      setAllowedRoles(roles.length > 0 ? roles : ['AUDITOR', 'TU']);

      try {
        const parsedItems = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
        const itemsWithIds = parsedItems.map((item: any) => ({
          ...item,
          id: item.id || Math.random().toString(36).substring(2, 9) 
        }));
        setItems(itemsWithIds);
      } catch (e) {
        setItems([]);
      }
    } else {
      setCurrentId(null);
      setTitle('');
      setAllowedRoles(['AUDITOR', 'TU']); // Роли по умолчанию для нового чек-листа
      setRedThreshold(70);
      setYellowThreshold(90);
      setItems([{ id: Math.random().toString(36).substring(2, 9), zone: 'Основной раздел', text: '', score: 0, isCritical: false }]);
    }
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentId(null);
  };

  // ИСПРАВЛЕНИЕ 3: Функция переключения ролей
  const handleRoleToggle = (role: string) => {
    setAllowedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) // Если роль есть - удаляем
        : [...prev, role]              // Если роли нет - добавляем
    );
  };

  const handleAddItem = () => {
    const lastZone = items.length > 0 ? items[items.length - 1].zone : 'Основной раздел';
    setItems([...items, { id: Math.random().toString(36).substring(2, 9), zone: lastZone, text: '', score: 0, isCritical: false }]);
  };

  const handleUpdateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

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

  const handleSave = async () => {
    if (!title.trim() || items.length === 0) return alert('Заполните название и добавьте вопросы');
    if (allowedRoles.length === 0) return alert('Выберите хотя бы одну роль, которой доступен этот чек-лист');
    if (redThreshold >= yellowThreshold) return alert('Красная зона должна быть меньше желтой!');

    try {
      const method = currentId ? 'PUT' : 'POST';
      const body = {
        id: currentId,
        title,
        items: JSON.stringify(items),
        redThreshold: Number(redThreshold),
        yellowThreshold: Number(yellowThreshold),
        // ИСПРАВЛЕНИЕ 4: Отправляем роли на сервер в виде JSON-строки
        allowedRoles: JSON.stringify(allowedRoles)
      };

      const res = await fetch('/api/checklists', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        fetchChecklists();
        closeEditor();
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (err) {
      alert('Системная ошибка');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить этот чек-лист?')) return;
    try {
      await fetch(`/api/checklists?id=${id}`, { method: 'DELETE' });
      fetchChecklists();
    } catch (err) {
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
        {!isEditing && (
          <button onClick={() => openEditor()} className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
            + Создать чек-лист
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900">{currentId ? 'Редактирование' : 'Новый чек-лист'}</h2>
            <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 font-bold">✕ Закрыть</button>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Название чек-листа</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[#F25C05] outline-none font-bold text-gray-900"
              placeholder="Например: Утренний Бар"
            />
          </div>

          {/* ИСПРАВЛЕНИЕ 5: Блок выбора ролей */}
          <div className="mb-6 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Кто может проводить аудит по этому чек-листу?</label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'AUDITOR', label: 'Аудиторы' },
                { id: 'TU', label: 'ТУ (Управляющие)' },
                { id: 'ADMIN', label: 'Администраторы' }
              ].map(role => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 hover:border-[#F25C05] transition-colors shadow-sm select-none">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-[#F25C05] rounded focus:ring-[#F25C05] cursor-pointer"
                    checked={allowedRoles.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                  />
                  <span className="text-sm font-bold text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* БЛОК: НАСТРОЙКА ЗОН (ТЕПЕРЬ В БАЛЛАХ) */}
          <div className="mb-8 p-4 md:p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Настройка оценки (в баллах)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Красная зона */}
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <label className="block text-xs font-bold text-red-500 mb-2">Красная зона (до)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" min="0" 
                    value={redThreshold} 
                    onChange={e => setRedThreshold(Number(e.target.value))}
                    className="w-full p-2 text-xl font-black text-red-600 bg-red-50 rounded-lg outline-none text-center"
                  />
                  <span className="text-gray-400 font-bold text-sm">баллов</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">от 0 до {redThreshold - 1} б.</p>
              </div>

              {/* Желтая зона */}
              <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm">
                <label className="block text-xs font-bold text-yellow-600 mb-2">Желтая зона (до)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" min="0" 
                    value={yellowThreshold} 
                    onChange={e => setYellowThreshold(Number(e.target.value))}
                    className="w-full p-2 text-xl font-black text-yellow-600 bg-yellow-50 rounded-lg outline-none text-center"
                  />
                  <span className="text-gray-400 font-bold text-sm">баллов</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">от {redThreshold} до {yellowThreshold - 1} б.</p>
              </div>

              {/* Зеленая зона */}
              <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center opacity-80">
                <label className="block text-xs font-bold text-green-600 mb-2">Зеленая зона</label>
                <div className="w-full p-2 text-xl font-black text-green-600 bg-green-50 rounded-lg text-center">
                  {yellowThreshold} и выше
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">Отлично</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Вопросы и зоны</label>
            
            {/* DND КОНТЕКСТ ДЛЯ СПИСКА ВОПРОСОВ */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableItem 
                    key={item.id} 
                    item={item} 
                    handleUpdateItem={handleUpdateItem} 
                    handleRemoveItem={handleRemoveItem} 
                  />
                ))}
              </SortableContext>
            </DndContext>

          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-100 pt-6 mt-4 gap-4">
            <button onClick={handleAddItem} className="w-full sm:w-auto text-[#F25C05] font-bold bg-orange-50 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors">
              + Добавить вопрос
            </button>
            <button onClick={handleSave} className="w-full sm:w-auto bg-[#F25C05] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
              Сохранить чек-лист
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.map(checklist => {
            const itemsList = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
            const maxScore = itemsList.reduce((sum: number, i: any) => sum + (Number(i.score) || 0), 0);
            const zones = [...new Set(itemsList.map((i: any) => i.zone || 'Основной раздел'))];
            
            const rT = checklist.redThreshold ?? 70;
            const yT = checklist.yellowThreshold ?? 90;

            // Извлекаем роли для отрисовки
            let rolesList = ['AUDITOR', 'TU'];
            if (checklist.allowedRoles) {
              try { rolesList = typeof checklist.allowedRoles === 'string' ? JSON.parse(checklist.allowedRoles) : checklist.allowedRoles; } catch(e){}
            }
            const roleLabels: Record<string, string> = { AUDITOR: 'Аудиторы', TU: 'ТУ', ADMIN: 'Админы' };

            return (
              <div key={checklist.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-xl font-black text-gray-900 mb-1">{checklist.title}</h3>
                <p className="text-sm text-gray-500 font-medium mb-3">{itemsList.length} вопросов • {maxScore} баллов максимум</p>
                
                {/* ИСПРАВЛЕНИЕ 6: Отображение кому доступен чек-лист */}
                <div className="mb-4 flex flex-wrap gap-1 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Доступ:</span>
                  {rolesList.map((r: string) => (
                    <span key={r} className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                      {roleLabels[r] || r}
                    </span>
                  ))}
                </div>

                {/* БЛОК ИНДИКАЦИИ ЗОН НА КАРТОЧКЕ */}
                <div className="flex gap-1 mb-4">
                  <div className="flex-1 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold py-1 text-center rounded-l-md">
                    &lt; {rT} б.
                  </div>
                  <div className="flex-1 bg-yellow-50 border border-yellow-100 text-yellow-600 text-[10px] font-bold py-1 text-center">
                    {rT} - {yT - 1} б.
                  </div>
                  <div className="flex-1 bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold py-1 text-center rounded-r-md">
                    {yT} б.+
                  </div>
                </div>
                
                <div className="mb-6 flex flex-wrap gap-2">
                  {zones.map((z: any) => (
                    <span key={z} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{z}</span>
                  ))}
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