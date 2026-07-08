'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PrivacyModal } from '@/components/PrivacyModal';

function SetupPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const handleSave = async () => {
    setError('');

    if (password.length < 4) return setError('Пароль слишком короткий (мин. 4 символа)');
    if (password !== confirmPassword) return setError('Пароли не совпадают');
    if (!token) return setError('Неверная ссылка');
    if (!isPolicyAccepted) return setError('Необходимо принять политику');

    setIsLoading(true);
    try {
      const res = await fetch('/api/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      if (res.ok) {
        alert('Пароль успешно установлен!');
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Ошибка при установке пароля');
      }
    } catch {
      setError('Системная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-dotted flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Мягкое фоновое свечение (Spotlight) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-[#F25C05]/15 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Карточка с эффектом стекла */}
      <div className="w-full max-w-[400px] bg-zinc-900/70 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] border border-zinc-800 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/logo.jpg" 
            alt="Logo" 
            width={160} 
            height={40} 
            className="mb-2 object-contain" 
            priority 
          />
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Установка пароля</div>
        </div>

        <div className="space-y-5">
          {/* Новый пароль */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 ml-1 uppercase">Новый пароль</label>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:border-[#F25C05] transition-all font-bold font-mono placeholder-zinc-600"
              placeholder="••••••••"
            />
          </div>

          {/* Подтверждение пароля */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 ml-1 uppercase">Повторите пароль</label>
            <input 
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:border-[#F25C05] transition-all font-bold font-mono placeholder-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[10px] text-[#F25C05] font-bold hover:underline"
          >
            {showPassword ? "Скрыть пароли" : "Показать пароли"}
          </button>

          {/* Согласие */}
          <div className="flex items-start gap-3 mt-2 px-1">
            <input
              id="policy"
              type="checkbox"
              checked={isPolicyAccepted}
              onChange={(e) => setIsPolicyAccepted(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-zinc-700 bg-zinc-950 text-[#F25C05] accent-[#F25C05] cursor-pointer"
            />
            <label htmlFor="policy" className="text-[11px] text-zinc-500 leading-relaxed cursor-pointer select-none">
              Я принимаю условия <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-[#F25C05] font-bold hover:underline">Политики обработки данных</button>
            </label>
          </div>

          {error && <div className="text-red-500 text-xs text-center font-bold">{error}</div>}

          <button 
            onClick={handleSave}
            disabled={isLoading || !isPolicyAccepted}
            className="w-full bg-[#F25C05] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#E65604] active:scale-[0.98] transition-all disabled:bg-zinc-800 disabled:text-zinc-500 shadow-lg shadow-orange-900/30"
          >
            {isLoading ? "Сохранение..." : "Сохранить и войти"}
          </button>
        </div>
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 text-sm">Загрузка...</div>}>
      <SetupPasswordContent />
    </Suspense>
  );
}