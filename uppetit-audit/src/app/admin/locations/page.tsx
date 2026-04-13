'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragEndEvent, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';

// --- ТИПЫ ДАННЫХ ---
// ДОБАВЛЕНО: maxScore в тип Audit
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
  handleDelete 
}: { 
  loc: Location; 
  updateLocation: (id: string, data: Partial<Location>) => void;
  handleDelete: (id: string, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: loc.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  const lastAudit = loc.audits?.[0];

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        {/* Зона для перетаскивания (Ручка) */}
        <div {...listeners} {...attributes} className="cursor-grab text-gray-400 hover:text-[#F25C05] p-1 -ml-1 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Название и адрес */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate">{loc.name}</h4>
          {loc.address && <p className="text-xs text-gray-500 truncate mt-0.5">{loc.address}</p>}
        </div>

        {/* Переключатель активности */}
        <label className="flex items-center cursor-pointer flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" className="sr-only peer" checked={loc.isActive}
            onChange={(e) => updateLocation(loc.id, { isActive: e.target.checked })}
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F25C05]"></div>
        </label>
      </div>

      {/* Даты активности */}
      <div className="flex gap-1 text-[10px] items-center bg-gray-50 p-2 rounded-lg" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-gray-400 font-medium whitespace-nowrap">Период:</span>
        <input 
          type="date" className="border border-gray-200 rounded px-1 py-1 bg-white outline-none focus:border-[#F25C05] w-full min-w-[90px]" 
          value={loc.activeFrom ? loc.activeFrom.split('T')[0] : ''}
          onChange={(e) => updateLocation(loc.id, { activeFrom: e.target.value || null })}
        />
        <span className="text-gray-400">—</span>
        <input 
          type="date" className="border border-gray-200 rounded px-1 py-1 bg-white outline-none focus:border-[#F25C05] w-full min-w-[90px]" 
          value={loc.activeTo ? loc.activeTo.split('T')[0] : ''}
          onChange={(e) => updateLocation(loc.id, { activeTo: e.target.value || null })}
        />
      </div>

      {/* Последний аудит и кнопка удаления */}
      <div className="flex justify-between items-end mt-1">
        <div className="text-[11px]">
          {lastAudit ? (
            <p className="text-gray-600">
              {/* ИЗМЕНЕНО: Форматирование вывода баллов */}
              <span className="text-gray-400">Последний:</span> <span className="font-bold">{lastAudit.score} {lastAudit.maxScore ? `из ${lastAudit.maxScore}` : 'баллов'}</span> ({new Date(lastAudit.date).toLocaleDateString()})
            </p>
          ) : (
            <p className="text-gray-400 italic">Проверок еще не было</p>
          )}
        </div>
        
        {/* Кнопка удаления */}
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => handleDelete(loc.id, loc.name)}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Удалить точку"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// --- КОМПОНЕНТ КОЛОНКИ (Зона сброса) ---
function Column({ 
  id, title, locations, updateLocation, handleDelete 
}: { 
  id: string; title: string; locations: Location[]; 
  updateLocation: any; handleDelete: any;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`bg-gray-50/50 border border-gray-100 p-4 rounded-2xl min-w-[360px] w-[360px] shrink-0 flex flex-col transition-colors ${isOver ? 'bg-orange-50/50 border-orange-200' : ''}`}>
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-gray-800">{title}</h3>
        <span className="bg-white text-gray-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm">{locations.length}</span>
      </div>
      <div className="flex-1 min-h-[150px]">
        {locations.map(loc => (
          <LocationCard key={loc.id} loc={loc} updateLocation={updateLocation} handleDelete={handleDelete} />
        ))}
        {locations.length === 0 && <div className="text-center text-sm text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-xl">Перетащите сюда точки</div>}
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
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  // Настройка сенсоров для DND, чтобы клики по кнопкам работали нормально
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Перетаскивание начнется только если мышь сдвинулась на 5px
      },
    })
  );

  // Загрузка данных
  const fetchData = async () => {
    try {
      const [locRes, userRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/users')
      ]);
      const locData = await locRes.json();
      const userData = await userRes.json();
      
      // ПРЕДОХРАНИТЕЛЬ: Проверяем, что сервер вернул именно массив
      if (Array.isArray(locData)) {
        setLocations(locData);
      } else {
        console.error("Ошибка API точек:", locData);
        setLocations([]);
      }

      if (Array.isArray(userData)) {
        setTus(userData.filter((u: User) => u.role === 'TU')); // Берем только ТУ
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

  // Сохранение новой точки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');

      setIsModalOpen(false);
      setName('');
      setAddress('');
      fetchData(); // Обновляем список
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
      // Оптимистичное удаление из UI
      setLocations(prev => prev.filter(loc => loc.id !== id));
      
      const res = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Ошибка удаления');
    } catch (err: any) {
      alert(err.message);
      fetchData(); // Если ошибка - возвращаем как было
    }
  };

  // Обновление любого поля точки (статус, даты, ТУ)
  const updateLocation = async (id: string, data: Partial<Location>) => {
    // Оптимистичное обновление UI
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...data } : loc));
    
    try {
      await fetch(`/api/locations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      });
    } catch (error) {
      console.error("Ошибка при обновлении:", error);
      fetchData(); // Откат при ошибке
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
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Точки UPPETIT</h1>
          <p className="text-gray-500 font-medium mt-1">Управление локациями и распределение по ТУ</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#F25C05] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
        >
          + Добавить точку
        </button>
      </div>

      {isFetching ? (
        <div className="text-center py-10 text-gray-500 font-medium">Загрузка структуры...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {/* Верхняя часть: Колонки Территориальных Управляющих */}
          <div className="flex gap-6 overflow-x-auto pb-6 mb-4 items-start">
            {tus.length === 0 ? (
              <div className="w-full bg-blue-50 text-blue-600 p-4 rounded-xl border border-blue-100 text-sm font-medium">
                Подсказка: Создайте сотрудника с ролью "TU" в разделе Сотрудники, чтобы здесь появилась колонка для распределения.
              </div>
            ) : (
              tus.map(tu => (
                <Column 
                  key={tu.id} id={tu.id} title={`ТУ: ${tu.login}`} 
                  locations={locations.filter(l => l.tuId === tu.id)} 
                  updateLocation={updateLocation}
                  handleDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Нижняя часть: Нераспределенные точки */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-black text-gray-800 mb-4">Корзина (Нераспределенные)</h2>
            <div className="flex overflow-x-auto pb-4">
              <Column 
                id="unassigned" 
                title="Отвязанные точки" 
                locations={locations.filter(l => !l.tuId)} 
                updateLocation={updateLocation} 
                handleDelete={handleDelete}
              />
            </div>
          </div>
        </DndContext>
      )}

      {/* МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ТОЧКИ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Новая точка</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Название (например, Точка №1)</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-orange-500 transition-all text-gray-900"
                  placeholder="Магазин на Ленина"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Точный адрес</label>
                <input 
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-orange-500 transition-all text-gray-900"
                  placeholder="ул. Ленина, д. 15"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Отмена
                </button>
                <button 
                  type="submit" disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-[#F25C05] text-white font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:bg-gray-400"
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