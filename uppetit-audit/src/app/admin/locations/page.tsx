'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useLocations } from '@/hooks/useLocations';
import { LocationModal } from '@/components/locations/LocationModal';
import { LocationColumn } from '@/components/locations/LocationBoard';
import { Location } from '@prisma/client'; 

export default function LocationsPage() {
  const { locations, tus, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleSaveModal = async (data: Partial<Location>, isEdit: boolean) => {    
    if (isEdit && editingLocation) {
      await updateLocation(editingLocation.id, data);
    } else {
      // Гарантируем TypeScript'у, что name точно будет строкой
      await createLocation({ 
        name: data.name || 'Новая точка', 
        address: data.address || null 
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить точку "${name}"?`)) {
      await deleteLocation(id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const locationId = active.id as string;
    const newTuId = over.id === 'unassigned' ? null : (over.id as string);
    
    const location = locations.find(l => l.id === locationId);
    if (location?.tuId !== newTuId) {
      updateLocation(locationId, { tuId: newTuId });
    }
  };

  return (
    <div className="w-full mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 mt-4 md:mt-8 px-4 md:px-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Точки UPPETIT</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Управление локациями и распределение по ТУ</p>
        </div>
        <button onClick={() => { setEditingLocation(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-[#F25C05] text-white px-6 py-3 rounded-xl font-bold shadow-lg">
          + Добавить точку
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500 font-medium">Загрузка структуры...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          
          {/* Зона ТУ с правильным горизонтальным скроллом */}
          <div className="w-full pl-4 md:pl-8">
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 mb-2 snap-x items-start">
              {tus.length === 0 ? (
                <div className="w-full bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-medium mr-4 md:mr-8">
                  Создайте сотрудника с ролью "TU", чтобы здесь появилась колонка.
                </div>
              ) : (
                tus.map(tu => (
                  // shrink-0 запрещает колонке сжиматься, заставляя контейнер скроллиться
                  <div key={tu.id} className="snap-start shrink-0 w-80 sm:w-[350px]">
                    <LocationColumn 
                      id={tu.id} 
                      // ИЗМЕНЕНО: Теперь выводим Имя, а если его нет — логин
                      title={`ТУ: ${tu.name || tu.login}`} 
                      locations={locations.filter(l => l.tuId === tu.id)} 
                      updateLocation={updateLocation} 
                      handleDelete={handleDelete} 
                      handleEdit={(loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); }} 
                    />
                  </div>
                ))
              )}
              {/* Пустой блок в конце для красивого отступа при максимальном скролле вправо */}
              <div className="shrink-0 w-2 md:w-4"></div>
            </div>
          </div>

          {/* Корзина */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8 w-full mt-2 pl-4 md:pl-8">
            <h2 className="text-lg sm:text-xl font-black text-gray-800 mb-4 px-1">Корзина (Нераспределенные)</h2>
            <div className="flex overflow-x-auto pb-4 snap-x">
              <div className="snap-start shrink-0 w-80 sm:w-[350px]">
                <LocationColumn 
                  id="unassigned" 
                  title="Отвязанные точки" 
                  locations={locations.filter(l => !l.tuId)} 
                  updateLocation={updateLocation} 
                  handleDelete={handleDelete} 
                  handleEdit={(loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); }} 
                />
              </div>
            </div>
          </div>
          
        </DndContext>
      )}

      <LocationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingLocation} onSave={handleSaveModal} />
    </div>
  );
}