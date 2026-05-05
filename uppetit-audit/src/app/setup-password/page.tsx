'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PrivacyModal } from '@/components/PrivacyModal'; // <-- ДОБАВЛЕНО

function SetupPasswordContent() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // <-- ДОБАВЛЕНЫ НОВЫЕ СОСТОЯНИЯ ДЛЯ ПОЛИТИКИ -->
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const handleSave = async () => {
    // Сбрасываем ошибку перед новой попыткой
    setError('');

    if (password.length < 4) return setError('Пароль должен быть минимум 4 символа');
    if (!token) return setError('Неверная ссылка');
    // ДОБАВЛЕНО: Проверка согласия
    if (!isPolicyAccepted) return setError('Необходимо принять Политику конфиденциальности');

    setIsLoading(true);
    try {
      const res = await fetch('/api/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      if (res.ok) {
        alert('Пароль успешно установлен! Теперь вы можете войти в систему.');
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Ссылка недействительна или уже использована');
      }
    } catch {
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
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-[#F25C05] transition-all"
              placeholder="Минимум 4 символа"
            />
          </div>

          {/* ДОБАВЛЕНО: Чекбокс согласия с политикой */}
          <div className="flex items-start gap-3 mt-4 px-1">
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="policy"
                type="checkbox"
                checked={isPolicyAccepted}
                onChange={(e) => {
                  setIsPolicyAccepted(e.target.checked);
                  if (e.target.checked) setError('');
                }}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#F25C05] focus:ring-[#F25C05] focus:ring-offset-black accent-[#F25C05] cursor-pointer"
              />
            </div>
            <label htmlFor="policy" className="text-[11px] text-zinc-500 leading-relaxed cursor-pointer select-none">
              Я ознакомлен(а) и принимаю условия{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsPrivacyOpen(true);
                }}
                className="text-[#F25C05] hover:underline transition-all outline-none font-bold"
              >
                Политики обработки персональных данных
              </button>
            </label>
          </div>

          {error && <div className="text-red-500 text-[12px] text-center font-bold">{error}</div>}

          <button 
            onClick={handleSave}
            disabled={isLoading || !isPolicyAccepted}
            className="w-full bg-[#F25C05] text-white py-4 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:bg-zinc-800 disabled:text-zinc-500 mt-2"
          >
            {isLoading ? "Сохранение..." : "Сохранить и войти"}
          </button>
        </div>
      </div>

      {/* ДОБАВЛЕНО: Рендерим модалку */}
      <PrivacyModal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
      />
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-sm">Загрузка...</div>}>
      <SetupPasswordContent />
    </Suspense>
  );
}