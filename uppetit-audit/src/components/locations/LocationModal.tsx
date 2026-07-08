import { useState, useEffect } from 'react';
import { User } from '@prisma/client'; 
import { EnrichedLocation } from '@/hooks/useLocations';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: EnrichedLocation | null;
  onSave: (data: any, isEdit: boolean) => Promise<void>;
  tus: User[];
}

export function LocationModal({ isOpen, onClose, initialData, onSave, tus }: LocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedTuIds, setSelectedTuIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setAddress(initialData?.address || '');
      if (initialData) {
        const existingTus = initialData.tus?.map((t: User) => t.id) || [];
        if (existingTus.length === 0 && initialData.tuId) existingTus.push(initialData.tuId);
        setSelectedTuIds(existingTus);
      } else setSelectedTuIds([]);
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleTu = (tuId: string) => setSelectedTuIds(prev => prev.includes(tuId) ? prev.filter(id => id !== tuId) : [...prev, tuId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    try {
      await onSave({ name, address: address || null, tuIds: selectedTuIds }, !!initialData);
      onClose();
    } catch { setError('Ошибка при сохранении'); } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-transparent dark:border-zinc-800 transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50 transition-colors">
          <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100">{initialData ? 'Настройка точки' : 'Новая точка'}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-700 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Название</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-900 dark:text-zinc-100 transition-colors" placeholder="Например: Б1" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Точный адрес (необязательно)</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-900 dark:text-zinc-100 transition-colors" placeholder="ул. Ленина, д. 15" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Прикрепленные ТУ</label>
            <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800 rounded-xl p-2 custom-scrollbar transition-colors">
              {tus.length === 0 ? (
                <div className="p-2 text-center text-xs font-bold text-gray-400 dark:text-zinc-600">Сотрудники с ролью TU не найдены</div>
              ) : (
                tus.map(tu => {
                  const isSelected = selectedTuIds.includes(tu.id);
                  return (
                    <label key={tu.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-700 group">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-[#F25C05] border-[#F25C05]' : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 border group-hover:border-[#F25C05] dark:group-hover:border-[#F25C05]'}`}>
                        {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-sm select-none truncate ${isSelected ? 'font-black text-gray-900 dark:text-zinc-100' : 'font-bold text-gray-600 dark:text-zinc-400'}`}>{tu.name || tu.login}</span>
                      <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleTu(tu.id)} />
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">{error}</p>}
          <div className="pt-2">
            <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-[#F25C05] dark:bg-[#E65604] text-white font-black text-lg rounded-xl shadow-lg shadow-orange-500/20 dark:shadow-orange-900/30 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 transition-all">
              {isLoading ? 'Сохранение...' : 'Сохранить точку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}