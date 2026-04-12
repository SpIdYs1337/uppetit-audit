'use client';

import { useState, useEffect } from 'react';

// Описываем, как выглядит точка
interface Location {
  id: string;
  name: string;
  address: string;
}

export default function LocationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [locations, setLocations] = useState<Location[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Скачиваем список точек
  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (res.ok) setLocations(data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchLocations();
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
      fetchLocations(); // Обновляем список
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
      const res = await fetch('/api/locations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Ошибка удаления');
      fetchLocations();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Точки UPPETIT</h1>
          <p className="text-gray-500 font-medium mt-1">Управление магазинами и локациями</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#F25C05] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20"
        >
          + Добавить точку
        </button>
      </div>

      {isFetching ? (
        <div className="text-center py-10 text-gray-500 font-medium">Загрузка данных...</div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-gray-400 mb-2">
            {/* Иконка магазина */}
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Пока нет точек</h3>
          <p className="text-gray-500 mt-1">Нажмите кнопку «Добавить», чтобы создать первую локацию.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">Название точки</th>
                <th className="p-4">Адрес</th>
                <th className="p-4 pr-6 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-900">{location.name}</td>
                  <td className="p-4 text-gray-600">{location.address || '—'}</td>
                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={() => handleDelete(location.id, location.name)}
                      className="text-gray-400 hover:text-red-500 font-bold text-sm transition-colors"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-orange-500 transition-all text-gray-900"
                  placeholder="Магазин на Ленина"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Точный адрес</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-orange-500 transition-all text-gray-900"
                  placeholder="ул. Ленина, д. 15"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
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