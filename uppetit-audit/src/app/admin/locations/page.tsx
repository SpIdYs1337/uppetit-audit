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
    /* ИЗМЕНЕНО: Добавлено ограничение по максимальной ширине (max-w-[1600px]) и центрирование (mx-auto), чтобы на больших мониторах верстка не ломалась */
    <div className="w-full max-w-[1600px] mx-auto pb-12 overflow-hidden">
      
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 mt-4 md:mt-8 px-4 md:px-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Точки</h1>
          <p className="text-gray-500 font-medium mt-1 text-sm sm:text-base">Управление локациями и распределение по ТУ</p>
        </div>
        <button onClick={() => { setEditingLocation(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-[#F25C05] text-white px-6 py-3 rounded-xl font-bold shadow-lg shrink-0">
          + Добавить точку
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500 font-medium">Загрузка структуры...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          
          {/* Зона ТУ с правильным горизонтальным скроллом */}
          <div className="w-full pl-4 md:pl-8">
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 mb-2 snap-x items-start custom-scrollbar">
              {tus.length === 0 ? (
                <div className="w-full bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-medium mr-4 md:mr-8">
                  Создайте сотрудника с ролью "TU", чтобы здесь появилась колонка.
                </div>
              ) : (
                tus.map(tu => (
                  <div key={tu.id} className="snap-start shrink-0 w-80 sm:w-[350px]">
                    <LocationColumn 
                      id={tu.id} 
                      title={`ТУ: ${tu.name || tu.login}`} 
                      locations={locations.filter(l => l.tuId === tu.id)} 
                      updateLocation={updateLocation} 
                      handleDelete={handleDelete} 
                      handleEdit={(loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); }} 
                    />
                  </div>
                ))
              )}
              <div className="shrink-0 w-4 md:w-8"></div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ИЗМЕНЕНО: Обновленная зона корзины (Многострочная сетка) */}
          {/* ======================================================== */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8 w-full mt-4 px-4 md:px-8">
            <h2 className="text-lg sm:text-xl font-black text-gray-800 mb-4 px-1">Корзина (Нераспределенные)</h2>
            
            {/* Класс "unassigned-basket-override" убирает фиксированную ширину, 
              которая была зашита внутри LocationColumn, и заставляет контент 
              внутри "unassigned" раскладываться в адаптивную сетку grid.
            */}
            <div className="w-full unassigned-basket-override">
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
          
        </DndContext>
      )}

      <LocationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingLocation} onSave={handleSaveModal} />

      {/* Инжектим временные CSS-стили прямо на страницу, чтобы гарантированно переопределить внутренности доски dnd */}
      <style jsx global>{`
        /* Стилизуем конкретно колонку с ID "unassigned" */
        .unassigned-basket-override div[data-droppable-id="unassigned"] {
          max-width: 100% !important;
          width: 100% !important;
        }
        
        /* Находим контейнер, где рендерятся сами карточки точек, 
          и превращаем его из вертикального флекса в многострочный грид!
        */
        .unassigned-basket-override div[data-droppable-id="unassigned"] > div:nth-child(2) {
          display: grid !important;
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          gap: 16px !important;
          width: 100% !important;
          padding: 4px !important;
        }

        @media (min-width: 640px) {
          .unassigned-basket-override div[data-droppable-id="unassigned"] > div:nth-child(2) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (min-width: 1024px) {
          .unassigned-basket-override div[data-droppable-id="unassigned"] > div:nth-child(2) {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (min-width: 1400px) {
          .unassigned-basket-override div[data-droppable-id="unassigned"] > div:nth-child(2) {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

    </div>
  );
}