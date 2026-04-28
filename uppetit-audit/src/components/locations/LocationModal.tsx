import { useState, useEffect } from 'react';
import { Location } from '@prisma/client'; 

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Location | null;
  onSave: (data: Partial<Location>, isEdit: boolean) => Promise<void>;
}

export function LocationModal({ isOpen, onClose, initialData, onSave }: LocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setAddress(initialData?.address || '');
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await onSave({ name, address: address || null }, !!initialData);
      onClose();
    } catch {
      setError('Ошибка при сохранении');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Редактировать точку' : 'Новая точка'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Название</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white outline-none focus:border-[#F25C05] font-medium text-gray-900" 
              placeholder="Магазин на Ленина" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Точный адрес (необязательно)</label>
            <input 
              type="text" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white outline-none focus:border-[#F25C05] font-medium text-gray-900" 
              placeholder="ул. Ленина, д. 15" 
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all">Отмена</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 px-4 bg-[#F25C05] text-white font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all">
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}