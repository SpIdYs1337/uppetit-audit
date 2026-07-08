'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Ждем монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  // Пока грузится, показываем пустой "скелет"
  if (!mounted) {
    return <div className="w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-14 h-8 flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-300 focus:outline-none"
      aria-label="Переключить тему"
    >
      <motion.div
        className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center z-10"
        layout
        // Настраиваем пружинистую анимацию Framer Motion
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        animate={{ x: isDark ? 24 : 0 }}
      >
        {isDark ? (
          // Иконка Луны (Темная тема)
          <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
          </svg>
        ) : (
          // Иконка Солнца (Светлая тема)
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.32a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-2.32 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zm-4.22-2.32a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm2.32-4.22a1 1 0 010-1.415l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd"></path>
          </svg>
        )}
      </motion.div>
    </button>
  );
}