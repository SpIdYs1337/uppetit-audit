import { useState } from 'react';
import { User, Role } from '@prisma/client';

interface UserEditorProps {
  initialData: User | null;
  onClose: () => void;
  onSave: (body: Partial<User>, isUpdate: boolean) => Promise<any>;
}

export function UserEditor({ initialData, onClose, onSave }: UserEditorProps) {
  const isUpdate = !!initialData;
  
  // Новые и старые стейты
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [login, setLogin] = useState(initialData?.login || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [role, setRole] = useState<Role>(initialData?.role || 'AUDITOR');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return alert('Пожалуйста, укажите Имя и Фамилию сотрудника');
    if (!login.trim()) return alert('Пожалуйста, укажите системный логин');
    
    setIsSubmitting(true);

    try {
      const data = await onSave({ 
        id: initialData?.id, 
        name, 
        email, 
        login, 
        phone, 
        role 
      }, isUpdate);
      
      // Если это создание НОВОГО пользователя, сразу показываем ссылку
      if (!isUpdate && data?.inviteToken) {
        const link = `${window.location.origin}/setup-password?token=${data.inviteToken}`;
        prompt('СОТРУДНИК СОЗДАН! Скопируйте эту ссылку и отправьте ему для установки пароля:', link);
      }
      
      onClose();
    } catch {
      alert('Системная ошибка при сохранении. Возможно такой логин или email уже существует.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-900">{isUpdate ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h2>
        <button onClick={onClose} className="text-gray-400 font-bold hover:text-gray-600 transition-colors">✕ Закрыть</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Имя и Фамилия - на всю ширину или половину в зависимости от дизайна. Сделаем на всю ширину для акцента */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Имя и Фамилия</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05] transition-colors" 
            placeholder="Иван Иванов" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Системный логин</label>
          <input 
            type="text" 
            value={login} 
            onChange={e => setLogin(e.target.value)} 
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05] transition-colors" 
            placeholder="ivanov" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Роль</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value as Role)} 
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05] transition-colors bg-white"
          >
            <option value="AUDITOR">Аудитор (Мобильное приложение)</option>
            <option value="TU">Территориальный управляющий (ТУ)</option>
            <option value="ADMIN">Администратор (Веб-панель)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail (для систем)</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05] transition-colors" 
            placeholder="ivanov@example.com" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Номер телефона</label>
          <input 
            type="text" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            className="w-full p-3 rounded-xl border border-gray-200 text-gray-900 font-bold outline-none focus:border-[#F25C05] transition-colors" 
            placeholder="+7 999 000-00-00" 
          />
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-6">
        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#F25C05] text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all active:scale-[0.98] hover:bg-[#e05504]">
          {isSubmitting ? 'Сохранение...' : 'Сохранить профиль'}
        </button>
        {!isUpdate && <p className="text-xs text-gray-400 text-center mt-3 font-bold">После сохранения вы получите ссылку для установки пароля</p>}
      </div>
    </div>
  );
}