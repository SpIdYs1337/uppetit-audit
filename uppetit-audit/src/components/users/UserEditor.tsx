import { useState } from 'react';
import { User, Role } from '@prisma/client';

interface UserEditorProps {
  initialData: User | null;
  onClose: () => void;
  onSave: (body: Partial<User>, isUpdate: boolean) => Promise<any>;
}

export function UserEditor({ initialData, onClose, onSave }: UserEditorProps) {
  const isUpdate = !!initialData;
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
      const data = await onSave({ id: initialData?.id, name, email, login, phone, role }, isUpdate);
      if (!isUpdate && data?.inviteToken) {
        const link = `${window.location.origin}/setup-password?token=${data.inviteToken}`;
        prompt('СОТРУДНИК СОЗДАН! Скопируйте эту ссылку и отправьте ему для установки пароля:', link);
      }
      onClose();
    } catch { alert('Системная ошибка при сохранении.'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-8 max-w-2xl transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 transition-colors">{isUpdate ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h2>
        <button onClick={onClose} className="text-gray-400 dark:text-zinc-500 font-bold hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">✕ Закрыть</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2 transition-colors">Имя и Фамилия</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 font-bold outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors" placeholder="Иван Иванов" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2 transition-colors">Системный логин</label>
          <input type="text" value={login} onChange={e => setLogin(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 font-bold outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors" placeholder="ivanov" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2 transition-colors">Роль</label>
          <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 font-bold outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors">
            <option value="AUDITOR">Аудитор (Мобильное приложение)</option>
            <option value="TU">Территориальный управляющий (ТУ)</option>
            <option value="ADMIN">Администратор (Веб-панель)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2 transition-colors">E-mail (для систем)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 font-bold outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors" placeholder="ivanov@example.com" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2 transition-colors">Номер телефона</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 font-bold outline-none focus:border-[#F25C05] dark:focus:border-[#F25C05] transition-colors" placeholder="+7 999 000-00-00" />
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 dark:border-zinc-800 pt-6 transition-colors">
        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#F25C05] dark:bg-[#E65604] text-white py-4 rounded-xl font-bold shadow-lg shadow-orange-500/20 dark:shadow-orange-900/30 disabled:opacity-50 transition-all active:scale-[0.98] hover:bg-[#e05504]">
          {isSubmitting ? 'Сохранение...' : 'Сохранить профиль'}
        </button>
        {!isUpdate && <p className="text-xs text-gray-400 dark:text-zinc-500 text-center mt-3 font-bold transition-colors">После сохранения вы получите ссылку для установки пароля</p>}
      </div>
    </div>
  );
}