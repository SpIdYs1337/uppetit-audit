'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent, 
  MouseSensor,
  TouchSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';

// --- ТИПЫ ДАННЫХ ---
type Audit = { id: string; date: string; score: number; maxScore?: number | null; checklist: { title: string } };
interface Location {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  activeFrom: string | null;
  activeTo: string | null;
  tuId: string | null;
  audits?: Audit[];
}
type User = { id: string; login: string; role: string };

// --- КОМПОНЕНТ КАРТОЧКИ ТОЧКИ ---
function LocationCard({ 
  loc, 
  updateLocation, 
  handleDelete,
  handleEdit // ИСПРАВЛЕНИЕ: Добавили пропс для редактирования
}: { 
  loc: Location; 
  updateLocation: (id: string, data: Partial<Location>) => void;
  handleDelete: (id: string, name: string) => void;
  handleEdit: (loc: Location) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: loc.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const lastAudit = loc.audits?.[0];

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        {/* ИСПРАВЛЕНИЕ: Добавили touch-none, чтобы страница не прыгала при попытке взять карточку */}
        <div {...listeners} {...attributes} className="cursor-grab text-gray-400 hover:text-[#F25C05] p-2 -ml-2 -mt-1 flex-shrink-0 touch-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Название и адрес */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="font-bold text-gray-900 truncate leading-tight">{loc.name}</h4>
          {loc.address && <p className="text-xs text-gray-500 truncate mt-1">{loc.address}</p>}
        </div>

        {/* Переключатель активности */}
        <label className="flex items-center cursor-pointer flex-shrink-0 pt-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" className="sr-only peer" checked={loc.isActive}
            onChange={(e) => updateLocation(loc.id, { isActive: e.target.checked })}
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F25C05]"></div>
        </label>
      </div>

      {/* Даты активности */}
      <div className="flex gap-1 text-[10px] items-center bg-gray-50 p-2 rounded-lg mt-1" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-gray-400 font-medium whitespace-nowrap">Период:</span>
        <input 
          type="date" 
          className="border border-gray-200 rounded px-1 py-1 bg-white text-gray-900 outline-none focus:border-[#F25C05] w-full min-w-[90px]" 
          value={loc.activeFrom ? loc.activeFrom.split('T')[0] : ''}
          onChange={(e) => updateLocation(loc.id, { activeFrom: e.target.value || null })}
        />
        <span className="text-gray-400">—</span>
        <input 
          type="date" 
          className="border border-gray-200 rounded px-1 py-1 bg-white text-gray-900 outline-none focus:border-[#F25C05] w-full min-w-[90px]" 
          value={loc.activeTo ? loc.activeTo.split('T')[0] : ''}
          onChange={(e) => updateLocation(loc.id, { activeTo: e.target.value || null })}
        />
      </div>

      {/* Последний аудит и кнопки управления */}
      <div className="flex justify-between items-end mt-1">
        <div className="text-[11px] flex-1">
          {lastAudit ? (
            <p className="text-gray-600">
              <span className="text-gray-400">Последний:</span> <span className="font-bold text-[#F25C05]">{lastAudit.score} {lastAudit.maxScore ? `из ${lastAudit.maxScore}` : 'баллов'}</span> <span className="text-gray-400">({new Date(lastAudit.date).toLocaleDateString()})</span>
            </p>
          ) : (
            <p className="text-gray-400 italic">Проверок еще не было</p>
          )}
        </div>
        
        {/* Кнопки редактирования и удаления */}
        <div className="flex gap-2 ml-2">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handleEdit(loc)}
            className="text-gray-300 hover:text-blue-500 transition-colors p-1"
            title="Редактировать точку"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handleDelete(loc.id, loc.name)}
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
            title="Удалить точку"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- КОМПОНЕНТ КОЛОНКИ (Зона сброса) ---
function Column({ 
  id, title, locations, updateLocation, handleDelete, handleEdit
}: { 
  id: string; title: string; locations: Location[]; 
  updateLocation: any; handleDelete: any; handleEdit: any;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // ИСПРАВЛЕНИЕ: Адаптивная ширина колонки (на мобилках занимает почти весь экран)
  return (
    <div ref={setNodeRef} className={`bg-gray-50/80 border border-gray-100 p-3 sm:p-4 rounded-2xl min-w-[85vw] sm:min-w-[340px] w-[85vw] sm:w-[340px] shrink-0 flex flex-col transition-colors ${isOver ? 'bg-orange-50 border-orange-200 shadow-inner' : ''}`}>
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-bold text-gray-800 text-sm sm:text-base">{title}</h3>
        <span className="bg-white text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{locations.length}</span>
      </div>
      <div className="flex-1 min-h-[150px]">
        {locations.map(loc => (
          <LocationCard key={loc.id} loc={loc} updateLocation={updateLocation} handleDelete={handleDelete} handleEdit={handleEdit} />
        ))}
        {locations.length === 0 && <div className="text-center text-xs sm:text-sm text-gray-400 py-10 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">Перетащите сюда точки</div>}
      </div>
    </div>
  );
}

// --- ОСНОВНАЯ СТРАНИЦА ---
export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tus, setTus] = useState<User[]>([]);
  
  // Состояния для модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null); // ИСПРАВЛЕНИЕ: Храним редактируемую точку
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  // ИСПРАВЛЕНИЕ: Настройка правильных сенсоров для мобилок и ПК
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 }, // Для мышки: тащим после сдвига на 5px
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Для пальца: ждем 150мс удержания перед стартом (позволяет скроллить страницу без конфликтов)
        tolerance: 5,
      },
    })
  );

  const fetchData = async () => {
    try {
      const [locRes, userRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/users')
      ]);
      const locData = await locRes.json();
      const userData = await userRes.json();
      
      if (Array.isArray(locData)) {
        setLocations(locData);
      } else {
        setLocations([]);
      }

      if (Array.isArray(userData)) {
        setTus(userData.filter((u: User) => u.role === 'TU'));
      } else {
        setTus([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setLocations([]);
      setTus([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Открытие модалки для СОЗДАНИЯ
  const openCreateModal = () => {
    setEditingLocation(null);
    setName('');
    setAddress('');
    setError('');
    setIsModalOpen(true);
  };

  // Открытие модалки для РЕДАКТИРОВАНИЯ
  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setName(loc.name);
    setAddress(loc.address || '');
    setError('');
    setIsModalOpen(true);
  };

  // Сохранение (Создание или Обновление)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (editingLocation) {
        // РЕДАКТИРОВАНИЕ
        const res = await fetch(`/api/locations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLocation.id, name, address: address || null })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка при обновлении');
        
        // Оптимистично обновляем UI
        setLocations(prev => prev.map(loc => loc.id === editingLocation.id ? { ...loc, name, address: address || null } : loc));
      } else {
        // СОЗДАНИЕ
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address: address || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');
        
        fetchData(); // Перезапрашиваем с сервера, чтобы получить ID новой точки
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление точки
  const handleDelete = async (id: string, locationName: string) => {
    const isConfirmed = window.confirm(`Вы уверены, что хотите удалить точку "${locationName}"?`);
    if (!isConfirmed) return;

    try {
      setLocations(prev => prev.filter(loc => loc.id !== id));
      
      const res = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Ошибка удаления');
    } catch (err: any) {
      alert(err.message);
      fetchData(); 
    }
  };

  // Обновление скрытых полей (статус, даты) при клике на карточке
  const updateLocation = async (id: string, data: Partial<Location>) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...data } : loc));
    
    try {
      await fetch(`/api/locations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      });
    } catch (error) {
      console.error("Ошибка при обновлении:", error);
      fetchData(); 
    }
  };

  // Обработка окончания перетаскивания (смена ТУ)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const locationId = active.id as string;
    const newTuId = over.id === 'unassigned' ? null : (over.id as string);

    const location = locations.find(l => l.id === locationId);
    if (location?.tuId === newTuId) return;

    updateLocation(locationId, { tuId: newTuId });
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Точки UPPETIT</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Управление локациями и распределение по ТУ</p>
        </div>
        
        <button 
          onClick={openCreateModal}
          className="w-full sm:w-auto bg-[#F25C05] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
        >
          + Добавить точку
        </button>
      </div>

      {isFetching ? (
        <div className="text-center py-10 text-gray-500 font-medium">Загрузка структуры...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Верхняя часть: Колонки Территориальных Управляющих */}
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 mb-2 items-start snap-x">
            {tus.length === 0 ? (
              <div className="w-full bg-blue-50 text-blue-600 p-4 rounded-xl border border-blue-100 text-sm font-medium">
                Подсказка: Создайте сотрудника с ролью "TU" в разделе Сотрудники, чтобы здесь появилась колонка для распределения.
              </div>
            ) : (
              tus.map(tu => (
                <div key={tu.id} className="snap-start">
                  <Column 
                    id={tu.id} title={`ТУ: ${tu.login}`} 
                    locations={locations.filter(l => l.tuId === tu.id)} 
                    updateLocation={updateLocation}
                    handleDelete={handleDelete}
                    handleEdit={openEditModal}
                  />
                </div>
              ))
            )}
          </div>

          {/* Нижняя часть: Нераспределенные точки */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8">
            <h2 className="text-lg sm:text-xl font-black text-gray-800 mb-4 px-1">Корзина (Нераспределенные)</h2>
            <div className="flex overflow-x-auto pb-4 snap-x">
              <div className="snap-start">
                <Column 
                  id="unassigned" 
                  title="Отвязанные точки" 
                  locations={locations.filter(l => !l.tuId)} 
                  updateLocation={updateLocation} 
                  handleDelete={handleDelete}
                  handleEdit={openEditModal}
                />
              </div>
            </div>
          </div>
        </DndContext>
      )}

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ ТОЧКИ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingLocation ? 'Редактировать точку' : 'Новая точка'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Название (например, Точка №1)</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-[#F25C05] transition-all text-gray-900 font-medium"
                  placeholder="Магазин на Ленина"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Точный адрес (необязательно)</label>
                <input 
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-[#F25C05] transition-all text-gray-900 font-medium"
                  placeholder="ул. Ленина, д. 15"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button 
                  type="submit" disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-[#F25C05] text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}