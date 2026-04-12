'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // Достаем токен из ссылки
  const router = useRouter();

  const handleSave = async () => {
    if (password.length < 4) return setError('Пароль должен быть минимум 4 символа');
    if (!token) return setError('Неверная ссылка');

    setIsLoading(true);
    try {
      const res = await fetch('/api/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      if (res.ok) {
        alert('Пароль успешно установлен! Теперь вы можете войти в систему.');
        router.push('/'); // Отправляем на главную страницу входа
      } else {
        setError('Ссылка недействительна или уже использована');
      }
    } catch (err) {
      setError('Системная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-10">
          <Image src="/logo.jpg" alt="Logo" width={320} height={40} className="mb-2 object-contain" priority />
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Добро пожаловать</div>
        </div>

        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-4">
            <p className="text-sm text-zinc-400 text-center font-medium">
              Придумайте надежный пароль для вашего аккаунта
            </p>
          </div>

          <div className="relative">
            <label className="block text-[11px] font-bold text-zinc-500 mb-2 ml-1 uppercase">Новый пароль</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-[#F25C05] transition-all"
              placeholder="Минимум 4 символа"
            />
          </div>

          {error && <div className="text-red-500 text-[12px] text-center font-bold">{error}</div>}

          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-[#F25C05] text-white py-4 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:bg-zinc-700 mt-2"
          >
            {isLoading ? "Сохранение..." : "Сохранить и войти"}
          </button>
        </div>
      </div>
    </div>
  );
}