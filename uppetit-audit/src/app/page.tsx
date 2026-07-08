'use client';

import { useState } from 'react';
import { signIn } from "next-auth/react"; 
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { PrivacyModal } from '@/components/PrivacyModal'; 

export default function LoginPage() {
  const router = useRouter(); 
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleLoginClick = async () => {
    if (!login || !password) {
      setError("Введите логин и пароль");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn("credentials", {
        login,
        password,
        redirect: false, 
      });

      if (result?.error) {
        setError("Неверный логин или пароль");
        setIsLoading(false);
      } else if (result?.ok) {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;

        if (userRole === 'ADMIN') {
          router.push('/admin/users');
        } else {
          router.push('/audit');
        }
      } else {
        setError("Что-то пошло не так");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Произошла системная ошибка");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-dotted flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Мягкое фоновое свечение (Spotlight) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-[#F25C05]/15 blur-[80px] sm:blur-[120px] rounded-full pointer-events-none"></div>

      {/* Карточка авторизации с эффектом стекла */}
      <div className="w-full max-w-[400px] bg-zinc-900/70 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] border border-zinc-800 shadow-2xl relative z-10 animate-page-fade">
        
        <div className="flex flex-col items-center mb-10">
          <div className="relative inline-block mb-3">
            {/* Только белый логотип для темного фона */}
            <Image 
              src="/logo.jpg" 
              alt="UPPETIT Logo" 
              width={220} 
              height={60} 
              className="relative z-10 object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            Аудит качества
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 ml-1 uppercase tracking-wider">Логин или телефон</label>
            <input 
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
              className="w-full px-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:bg-zinc-950 focus:border-[#F25C05] focus:ring-4 focus:ring-[#F25C05]/20 transition-all font-bold placeholder-zinc-600"
              placeholder="Введите логин"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-2 ml-1 uppercase tracking-wider">Пароль</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
                className="w-full pl-4 pr-12 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-white outline-none focus:bg-zinc-950 focus:border-[#F25C05] focus:ring-4 focus:ring-[#F25C05]/20 transition-all font-bold font-mono placeholder-zinc-600"
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

          {/* Контейнер для ошибки фиксированной высоты */}
          <div className="h-4 flex items-center justify-center">
            {error && <span className="text-red-500 text-xs font-bold animate-in fade-in slide-in-from-bottom-1">{error}</span>}
          </div>

          <button 
            type="button" 
            onClick={handleLoginClick}
            disabled={isLoading}
            className="w-full bg-[#F25C05] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#E65604] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-900/30"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Загрузка...
              </span>
            ) : "Войти в систему"}
          </button>

          <div className="mt-6 pt-4 border-t border-zinc-800/50 text-center text-[10px] sm:text-[11px] text-zinc-500 leading-relaxed px-2">
            Авторизуясь в системе, вы соглашаетесь с{' '}
            <button 
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-orange-400 hover:text-[#F25C05] hover:underline transition-all outline-none font-bold"
            >
              Политикой обработки персональных данных
            </button>
          </div>
          
        </div>
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}