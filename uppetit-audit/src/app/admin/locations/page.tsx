'use client';

import { useState, useMemo } from 'react';
import { useLocations, EnrichedLocation } from '@/hooks/useLocations';
import { LocationModal } from '@/components/locations/LocationModal';
import { LocationCard } from '@/components/locations/LocationBoard';

export default function LocationsPage() {
  const { locations, tus, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EnrichedLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSaveModal = async (data: any, isEdit: boolean) => {    
    if (isEdit && editingLocation) {
      await updateLocation(editingLocation.id, data);
    } else {
      await createLocation({ 
        name: data.name || 'Новая точка', 
        address: data.address || null,
        tuIds: data.tuIds || []
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить точку "${name}"?`)) {
      await deleteLocation(id);
    }
  };

  // Простой и быстрый поиск по названию точки
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [locations, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 px-4 md:px-8">
      
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 mt-4 md:mt-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Управление точками</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Справочник локаций и назначение территориальных управляющих</p>
        </div>
        <button onClick={() => { setEditingLocation(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-[#F25C05] text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 shrink-0 hover:bg-orange-600 transition-all active:scale-95">
          + Добавить точку
        </button>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Поиск по названию точки..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/3 px-5 py-3.5 rounded-2xl border border-gray-100 bg-white focus:border-[#F25C05] outline-none font-bold text-gray-700 shadow-sm transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 font-bold">Загрузка локаций...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredLocations.length > 0 ? (
            filteredLocations.map(loc => (
              <LocationCard 
                key={loc.id} 
                loc={loc} 
                updateLocation={updateLocation} 
                handleDelete={handleDelete} 
                handleEdit={(loc) => { setEditingLocation(loc); setIsModalOpen(true); }} 
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-gray-500 font-bold">Точки не найдены.</p>
            </div>
          )}
        </div>
      )}

      <LocationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingLocation} onSave={handleSaveModal} tus={tus} />
    </div>
  );
}