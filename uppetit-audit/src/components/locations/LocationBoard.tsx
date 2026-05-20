import { Location, User } from '@prisma/client';
import { EnrichedLocation } from '@/hooks/useLocations';

interface LocationCardProps {
  loc: EnrichedLocation;
  updateLocation: (id: string, data: Partial<Location>) => void;
  handleDelete: (id: string, name: string) => void;
  handleEdit: (loc: EnrichedLocation) => void;
}

export function LocationCard({ loc, updateLocation, handleDelete, handleEdit }: LocationCardProps) {
  const lastAudit = loc.audits?.[0];

  // Подхватываем и старую одиночную привязку, и новый массив ТУ
  const assignedTus = loc.tus?.length ? loc.tus : (loc.tu ? [loc.tu] : []);

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 group hover:shadow-md hover:border-orange-100 transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-900 truncate text-lg leading-tight">{loc.name}</h4>
          {loc.address && <p className="text-xs font-bold text-gray-400 truncate mt-1">{loc.address}</p>}
        </div>
        <label className="flex items-center cursor-pointer flex-shrink-0 pt-1">
          <input type="checkbox" className="sr-only peer" checked={loc.isActive} onChange={(e) => updateLocation(loc.id, { isActive: e.target.checked })} />
          <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F25C05]"></div>
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {assignedTus.length > 0 ? (
          assignedTus.map((t: User) => (
            <span key={t.id} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100">
              {t.name || t.login}
            </span>
          ))
        ) : (
          <span className="bg-gray-50 text-gray-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-100">
            ТУ не назначен
          </span>
        )}
      </div>

      <div className="flex gap-2 text-[10px] items-center bg-gray-50 p-2.5 rounded-xl mt-1">
        <span className="text-gray-400 font-bold uppercase tracking-wider">Период:</span>
        <input 
          type="date" 
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full min-w-[90px] outline-none font-bold focus:border-[#F25C05] transition-colors" 
          value={loc.activeFrom ? new Date(loc.activeFrom).toISOString().split('T')[0] : ''} 
          onChange={(e) => updateLocation(loc.id, { activeFrom: e.target.value ? new Date(e.target.value) : null })} 
        />
        <span className="text-gray-300 font-black">—</span>
        <input 
          type="date" 
          className="text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 w-full min-w-[90px] outline-none font-bold focus:border-[#F25C05] transition-colors" 
          value={loc.activeTo ? new Date(loc.activeTo).toISOString().split('T')[0] : ''} 
          onChange={(e) => updateLocation(loc.id, { activeTo: e.target.value ? new Date(e.target.value) : null })} 
        />
      </div>

      <div className="flex justify-between items-end mt-2 pt-3 border-t border-gray-50">
        <div className="text-xs flex-1">
          {lastAudit ? (
            <p className="text-gray-600 font-bold"><span className="text-gray-400">Последний аудит:</span> <span className="text-[#F25C05]">{lastAudit.score} б.</span></p>
          ) : (
            <p className="text-gray-400 font-bold italic">Проверок нет</p>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={() => handleEdit(loc)} className="text-gray-400 hover:text-[#F25C05] bg-gray-50 hover:bg-orange-50 w-8 h-8 rounded-xl flex items-center justify-center transition-colors">✏️</button>
          <button onClick={() => handleDelete(loc.id, loc.name)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 w-8 h-8 rounded-xl flex items-center justify-center transition-colors">🗑️</button>
        </div>
      </div>
    </div>
  );
}