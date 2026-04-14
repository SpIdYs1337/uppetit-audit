'use client';

import { useState } from 'react';
import { signIn } from "next-auth/react"; 
import Image from 'next/image';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // НОВОЕ СОСТОЯНИЕ: Показывать ли пароль?
  const [showPassword, setShowPassword] = useState(false);

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
          window.location.href = '/admin/users'; 
        } else {
          window.location.href = '/audit'; 
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 pb-12">
      <div className="w-full max-w-[360px]">
        
        <div className="flex flex-col items-center mb-10">
          <Image 
            src="/logo.jpg" 
            alt="UPPETIT Logo" 
            width={280} 
            height={80} 
            className="mb-2 object-contain"
            priority
          />
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            Аудит качества
          </div>
        </div>

        <div className="space-y-5">
          
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-2 ml-1 uppercase">
              Логин или телефон
            </label>
            <input 
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-[#F25C05] transition-all"
              placeholder="Введите логин"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-2 ml-1 uppercase">
              Пароль
            </label>
            <div className="relative">
              <input 
                // ИСПРАВЛЕНИЕ: Меняем тип в зависимости от состояния
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
                // ИСПРАВЛЕНИЕ: Добавили pr-12, чтобы текст пароля не залезал под иконку
                className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-[#F25C05] transition-all"
                placeholder="••••••••"
              />
              
              {/* НОВАЯ КНОПКА: Иконка Глаза */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  // Иконка: Открытый глаз
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  // Иконка: Перечеркнутый глаз
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-[12px] text-center font-bold">
              {error}
            </div>
          )}

          <button 
            type="button" 
            onClick={handleLoginClick}
            disabled={isLoading}
            className="w-full bg-[#F25C05] text-white py-4 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:bg-zinc-700 mt-2"
          >
            {isLoading ? "Загрузка..." : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}