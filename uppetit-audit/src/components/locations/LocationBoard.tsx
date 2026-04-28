import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Location } from '@prisma/client'; // <-- ИЗМЕНИЛИ ИМПОРТ

interface LocationCardProps {
  loc: Location;
  updateLocation: (id: string, data: Partial<Location>) => void;
// ... дальше без изменений
  handleDelete: (id: string, name: string) => void;
  handleEdit: (loc: Location) => void;
}

export function LocationCard({ loc, updateLocation, handleDelete, handleEdit }: LocationCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: loc.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  
  // Мы предполагаем, что audits могли прийти вместе с loc
  const lastAudit = (loc as Location & { audits?: { score: number }[] }).audits?.[0];

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex flex-col gap-3 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        <div {...listeners} {...attributes} className="cursor-grab text-gray-400 hover:text-[#F25C05] p-2 -ml-2 -mt-1 flex-shrink-0 touch-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="font-bold text-gray-900 truncate leading-tight">{loc.name}</h4>
          {loc.address && <p className="text-xs text-gray-500 truncate mt-1">{loc.address}</p>}
        </div>
        <label className="flex items-center cursor-pointer flex-shrink-0 pt-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <input type="checkbox" className="sr-only peer" checked={loc.isActive} onChange={(e) => updateLocation(loc.id, { isActive: e.target.checked })} />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F25C05]"></div>
        </label>
      </div>

      <div className="flex gap-1 text-[10px] items-center bg-gray-50 p-2 rounded-lg mt-1" onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-gray-400 font-medium">Период:</span>
        <input 
          type="date" 
          className="text-gray-900 bg-white border border-gray-200 rounded px-1 py-1 w-full min-w-[90px] outline-none focus:border-[#F25C05]" 
          value={loc.activeFrom ? new Date(loc.activeFrom).toISOString().split('T')[0] : ''} 
          onChange={(e) => updateLocation(loc.id, { activeFrom: e.target.value ? new Date(e.target.value) : null })} 
        />
        <span className="text-gray-400">—</span>
        <input 
          type="date" 
          className="text-gray-900 bg-white border border-gray-200 rounded px-1 py-1 w-full min-w-[90px] outline-none focus:border-[#F25C05]" 
          value={loc.activeTo ? new Date(loc.activeTo).toISOString().split('T')[0] : ''} 
          onChange={(e) => updateLocation(loc.id, { activeTo: e.target.value ? new Date(e.target.value) : null })} 
        />
      </div>

      <div className="flex justify-between items-end mt-1">
        <div className="text-[11px] flex-1">
          {lastAudit ? <p className="text-gray-600"><span className="text-gray-400">Последний:</span> <span className="font-bold text-[#F25C05]">{lastAudit.score} б.</span></p> : <p className="text-gray-400 italic">Проверок нет</p>}
        </div>
        <div className="flex gap-2 ml-2">
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleEdit(loc)} className="text-gray-300 hover:text-blue-500 p-1">✏️</button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => handleDelete(loc.id, loc.name)} className="text-gray-300 hover:text-red-500 p-1">🗑️</button>
        </div>
      </div>
    </div>
  );
}

interface LocationColumnProps {
  id: string;
  title: string;
  locations: Location[];
  updateLocation: (id: string, data: Partial<Location>) => void;
  handleDelete: (id: string, name: string) => void;
  handleEdit: (loc: Location) => void;
}

export function LocationColumn({ id, title, locations, updateLocation, handleDelete, handleEdit }: LocationColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`bg-gray-50/80 border border-gray-100 p-3 sm:p-4 rounded-2xl min-w-[85vw] sm:min-w-[340px] w-[85vw] sm:w-[340px] shrink-0 flex flex-col transition-colors ${isOver ? 'bg-orange-50 border-orange-200 shadow-inner' : ''}`}>
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-bold text-gray-800 text-sm sm:text-base">{title}</h3>
        <span className="bg-white text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{locations.length}</span>
      </div>
      <div className="flex-1 min-h-[150px]">
        {locations.map((loc: Location) => <LocationCard key={loc.id} loc={loc} updateLocation={updateLocation} handleDelete={handleDelete} handleEdit={handleEdit} />)}
        {locations.length === 0 && <div className="text-center text-xs text-gray-400 py-10 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">Перетащите точки</div>}
      </div>
    </div>
  );
}