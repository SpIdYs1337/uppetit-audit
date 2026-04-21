'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useLocations, Location } from '@/hooks/useLocations';
import { LocationModal } from '@/components/locations/LocationModal';
import { LocationColumn } from '@/components/locations/LocationBoard';

export default function LocationsPage() {
  const { locations, tus, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleSaveModal = async (data: any, isEdit: boolean) => {
    if (isEdit && editingLocation) await updateLocation(editingLocation.id, data);
    else await createLocation(data);
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
    <div className="w-full min-w-0 max-w-[1400px] mx-auto pb-12 overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `html, body { overflow-x: hidden !important; width: 100%; } .hide-scroll { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; } .hide-scroll::-webkit-scrollbar { display: none; } .scroll-wrapper { width: 100%; overflow: hidden; }`}} />

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
          <div className="scroll-wrapper pl-4 md:pl-8">
            <div className="hide-scroll flex gap-4 sm:gap-6 pb-6 mb-2 items-start snap-x">
              {tus.length === 0 ? (
                <div className="w-full bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-medium">Создайте сотрудника с ролью "TU", чтобы здесь появилась колонка.</div>
              ) : (
                tus.map(tu => (
                  <div key={tu.id} className="snap-start">
                    <LocationColumn id={tu.id} title={`ТУ: ${tu.login}`} locations={locations.filter(l => l.tuId === tu.id)} updateLocation={updateLocation} handleDelete={handleDelete} handleEdit={(loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); }} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 sm:pt-8 w-full min-w-0 pl-4 md:pl-8">
            <h2 className="text-lg sm:text-xl font-black text-gray-800 mb-4 px-1">Корзина (Нераспределенные)</h2>
            <div className="scroll-wrapper">
              <div className="hide-scroll flex pb-4 snap-x">
                <div className="snap-start">
                  <LocationColumn id="unassigned" title="Отвязанные точки" locations={locations.filter(l => !l.tuId)} updateLocation={updateLocation} handleDelete={handleDelete} handleEdit={(loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); }} />
                </div>
              </div>
            </div>
          </div>
        </DndContext>
      )}

      <LocationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingLocation} onSave={handleSaveModal} />
    </div>
  );
}