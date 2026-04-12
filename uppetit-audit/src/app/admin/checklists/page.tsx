'use client';

import { useState, useEffect } from 'react';

export default function AdminChecklistsPage() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  
  const [items, setItems] = useState<any[]>([]);

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
      try {
        setItems(typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items);
      } catch (e) {
        setItems([]);
      }
    } else {
      setCurrentId(null);
      setTitle('');
      setItems([{ zone: 'Основной раздел', text: '', score: 0, isCritical: false }]);
    }
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleAddItem = () => {
    const lastZone = items.length > 0 ? items[items.length - 1].zone : 'Основной раздел';
    setItems([...items, { zone: lastZone, text: '', score: 0, isCritical: false }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!title.trim() || items.length === 0) return alert('Заполните название и добавьте вопросы');

    try {
      const method = currentId ? 'PUT' : 'POST';
      const body = {
        id: currentId,
        title,
        items: JSON.stringify(items)
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Чек-листы</h1>
          <p className="text-gray-500 mt-2">Управление списками проверок и их зонами</p>
        </div>
        {!isEditing && (
          <button onClick={() => openEditor()} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
            + Создать чек-лист
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            {/* ИСПРАВЛЕНИЕ: Добавили text-gray-900 чтобы заголовок был видимым */}
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

          <div className="space-y-4 mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Вопросы и зоны</label>
            
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group items-center">
                
                {/* ЗОНА */}
                <div className="w-full md:w-1/4">
                  <input 
                    type="text" 
                    value={item.zone || ''} 
                    onChange={e => handleUpdateItem(index, 'zone', e.target.value)}
                    placeholder="Зона (напр. Бар)"
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
                  />
                </div>

                {/* ВОПРОС */}
                <div className="w-full md:flex-1">
                  <input 
                    type="text" 
                    value={item.text || ''} 
                    onChange={e => handleUpdateItem(index, 'text', e.target.value)}
                    placeholder="Текст вопроса..."
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors"
                  />
                </div>

                {/* БАЛЛЫ */}
                <div className="w-20">
                  <input 
                    type="number" 
                    // ИСПРАВЛЕНИЕ: Убрали залипающий ноль. Теперь поле пустое, если значение 0.
                    value={item.score === 0 ? '' : item.score} 
                    onChange={e => handleUpdateItem(index, 'score', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="Штраф"
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-red-600 placeholder-red-300 bg-gray-50 focus:bg-white focus:border-[#F25C05] outline-none transition-colors text-center"
                    title="Сколько баллов снимать"
                  />
                </div>

                {/* НОВАЯ КНОПКА: КРИТИЧНОСТЬ */}
                <button 
                  title={item.isCritical ? "Критическое нарушение (снять отметку)" : "Отметить как критическое"}
                  onClick={() => handleUpdateItem(index, 'isCritical', !item.isCritical)} 
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
                  onClick={() => handleRemoveItem(index)} 
                  title="Удалить вопрос"
                  className="w-12 h-[46px] flex items-center justify-center text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 pt-6 mt-4">
            <button onClick={handleAddItem} className="text-[#F25C05] font-bold bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors">
              + Добавить вопрос
            </button>
            <button onClick={handleSave} className="bg-[#F25C05] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
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

            return (
              <div key={checklist.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-xl font-black text-gray-900 mb-1">{checklist.title}</h3>
                <p className="text-sm text-gray-500 font-medium mb-4">{itemsList.length} вопросов • {maxScore} баллов максимум</p>
                
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