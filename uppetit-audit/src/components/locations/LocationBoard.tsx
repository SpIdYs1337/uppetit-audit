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
  const assignedTus = loc.tus?.length ? loc.tus : (loc.tu ? [loc.tu] : []);

  return (
    <div className={`bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col gap-3 group transition-all duration-300 h-full ${loc.isActive ? 'hover:shadow-md hover:border-orange-100 dark:hover:border-zinc-700' : 'opacity-60 grayscale-[30%]'}`}>
      
      <div className="flex justify-between items-start gap-2 relative">
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-900 dark:text-zinc-100 truncate text-lg leading-tight transition-colors">{loc.name}</h4>
          {loc.address && <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 truncate mt-1 transition-colors">{loc.address}</p>}
        </div>
        
        <label className="flex items-center cursor-pointer flex-shrink-0 pt-1" title={loc.isActive ? "Отключить точку" : "Включить точку"}>
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={loc.isActive} 
            onChange={(e) => updateLocation(loc.id, { isActive: e.target.checked })} 
          />
          {/* ИСПРАВЛЕНИЕ: Добавлен класс relative в начало строки ниже */}
          <div className="relative w-10 h-6 bg-gray-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-zinc-300 after:border-gray-300 dark:after:border-zinc-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F25C05] dark:peer-checked:bg-[#E65604] transition-colors"></div>
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-1">
        {assignedTus.length > 0 ? (
          assignedTus.map((t: User) => (
            <span key={t.id} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-900/30 transition-colors">
              {t.name || t.login}
            </span>
          ))
        ) : (
          <span className="bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-100 dark:border-zinc-700 transition-colors">
            ТУ не назначен
          </span>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-zinc-950/50 p-2.5 rounded-xl mt-auto flex flex-col gap-1.5 transition-colors border border-transparent dark:border-zinc-800/50">
        <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider transition-colors">
          Период:
        </span>
        <div className="flex items-center justify-between gap-1 sm:gap-2 w-full">
          <input 
            type="date" 
            className="flex-1 w-full min-w-0 text-gray-900 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md px-1.5 py-1 text-[10px] outline-none font-bold focus:border-[#F25C05] transition-colors [color-scheme:light] dark:[color-scheme:dark]" 
            value={loc.activeFrom ? new Date(loc.activeFrom).toISOString().split('T')[0] : ''} 
            onChange={(e) => updateLocation(loc.id, { activeFrom: e.target.value ? new Date(e.target.value) : null })} 
          />
          <span className="text-gray-300 dark:text-zinc-600 font-bold shrink-0">-</span>
          <input 
            type="date" 
            className="flex-1 w-full min-w-0 text-gray-900 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md px-1.5 py-1 text-[10px] outline-none font-bold focus:border-[#F25C05] transition-colors [color-scheme:light] dark:[color-scheme:dark]" 
            value={loc.activeTo ? new Date(loc.activeTo).toISOString().split('T')[0] : ''} 
            onChange={(e) => updateLocation(loc.id, { activeTo: e.target.value ? new Date(e.target.value) : null })} 
          />
        </div>
      </div>

      <div className="flex justify-between items-end mt-1 pt-3 border-t border-gray-50 dark:border-zinc-800 transition-colors">
        <div className="text-xs flex-1 min-w-0 pr-2">
          {lastAudit ? (
            <p className="text-gray-600 dark:text-zinc-400 font-bold truncate transition-colors">
              <span className="text-gray-400 dark:text-zinc-500">Крайний:</span> <span className="text-[#F25C05] dark:text-orange-400">{lastAudit.score} б.</span>
            </p>
          ) : (
            <p className="text-gray-400 dark:text-zinc-600 font-bold italic truncate transition-colors">Проверок нет</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => handleEdit(loc)} className="text-gray-400 dark:text-zinc-500 hover:text-[#F25C05] dark:hover:text-orange-400 bg-gray-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-8 h-8 rounded-xl flex items-center justify-center transition-colors">✏️</button>
          <button onClick={() => handleDelete(loc.id, loc.name)} className="text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 bg-gray-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 w-8 h-8 rounded-xl flex items-center justify-center transition-colors">🗑️</button>
        </div>
      </div>
      
    </div>
  );
}