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
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:border-[#F25C05] transition-all font-bold font-mono placeholder-zinc-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#F25C05] transition-colors p-1"
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Подтверждение пароля */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 ml-1 uppercase">Повторите пароль</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:border-[#F25C05] transition-all font-bold font-mono placeholder-zinc-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#F25C05] transition-colors p-1"
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Согласие */}
          <div className="flex items-start gap-3 mt-4 px-1">
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
            className="w-full bg-[#F25C05] text-white py-4 mt-2 rounded-2xl font-black text-sm hover:bg-[#E65604] active:scale-[0.98] transition-all disabled:bg-zinc-800 disabled:text-zinc-500 shadow-lg shadow-orange-900/30"
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