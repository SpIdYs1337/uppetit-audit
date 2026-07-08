'use client';

import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-gray-50 md:bg-transparent dark:bg-zinc-950 dark:md:bg-transparent min-h-screen pb-20 transition-colors duration-300">
      
      {/* МОБИЛЬНАЯ ШАПКА */}
      <header className="flex items-center mb-6 mt-4 relative md:hidden">
        <Link 
          href="/audit" 
          className="absolute left-0 w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-100 dark:border-zinc-800 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-lg font-black text-gray-900 dark:text-zinc-100">Инструкция</h1>
      </header>

      {/* ШАПКА ПК */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Как пользоваться приложением</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-1 transition-colors">Подробное руководство по проведению аудитов</p>
        </div>
        <Link 
          href="/audit" 
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          Назад на главную
        </Link>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* ГЛАВНЫЙ ЭКРАН */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors">
          <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2 transition-colors">
            📱 Главный экран
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 transition-colors">
              <div className="font-bold text-[#F25C05] dark:text-[#F25C05] mb-1">Начать проверку</div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Создание нового аудита. Здесь вы выбираете управляющего (ТУ), конкретную точку и нужный чек-лист.</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 transition-colors">
              <div className="font-bold text-blue-600 dark:text-blue-400 mb-1">Продолжить аудит</div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Кнопка появляется, если вы начали аудит, но не завершили его. Приложение сохраняет ваши ответы на устройстве.</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/50 transition-colors">
              <div className="font-bold text-gray-800 dark:text-zinc-200 mb-1">Мой план</div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Ваш личный календарь. Здесь видно, какие точки и в какие даты вам нужно проверить.</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700/50 transition-colors">
              <div className="font-bold text-gray-800 dark:text-zinc-200 mb-1">История проверок</div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Архив ваших завершенных аудитов. Можно посмотреть итоговый балл и скачанные отчеты.</div>
            </div>
          </div>
        </div>

        {/* ШАГИ ПРОВЕДЕНИЯ АУДИТА */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-8 transition-colors">
          <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-2 transition-colors">Процесс проверки</h2>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-black flex items-center justify-center shrink-0 transition-colors">1</div>
              <div className="w-0.5 h-full bg-gray-100 dark:bg-zinc-800 my-2 transition-colors"></div>
            </div>
            <div className="pb-4 w-full">
              <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-lg transition-colors">Выбор параметров</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1 mb-3 transition-colors">Последовательно выберите ТУ, точку и доступный чек-лист. Если точек нет — обратитесь к администратору.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 font-black flex items-center justify-center shrink-0 transition-colors">2</div>
              <div className="w-0.5 h-full bg-gray-100 dark:bg-zinc-800 my-2 transition-colors"></div>
            </div>
            <div className="pb-4 w-full">
              <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-lg transition-colors">Заполнение чек-листа</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1 mb-3 transition-colors">Вопросы разбиты по зонам (например, Касса, Зал, Кухня). Переключайтесь между зонами по мере обхода точки.</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border dark:border-green-900/30 p-2 rounded-lg font-bold transition-colors">
                  <span>✅</span> Отлично — нарушений нет (максимальный балл).
                </div>
                <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border dark:border-red-900/30 p-2 rounded-lg font-bold transition-colors">
                  <span>❌</span> Есть проблема — стандарт нарушен (штраф).
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-black flex items-center justify-center shrink-0 transition-colors">3</div>
              <div className="w-0.5 h-full bg-gray-100 dark:bg-zinc-800 my-2 transition-colors"></div>
            </div>
            <div className="pb-4 w-full">
              <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-lg transition-colors">Фото и комментарии (Обязательно!)</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1 transition-colors">Если вы выбрали <b className="dark:text-zinc-300">«Есть проблема»</b>, система попросит вас обосновать снижение оценки.</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-zinc-400 font-medium list-disc list-inside transition-colors">
                <li>Сделайте четкое фото нарушения (кнопка 📷).</li>
                <li>Оставьте короткий текстовый комментарий (например: <i>"Грязь под холодильником"</i>).</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#F25C05]/20 dark:bg-[#F25C05]/30 text-[#F25C05] font-black flex items-center justify-center shrink-0 transition-colors">4</div>
            </div>
            <div className="pb-2 w-full">
              <h3 className="font-bold text-gray-900 dark:text-zinc-100 text-lg transition-colors">Завершение и отправка</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1 transition-colors">Когда все вопросы отвечены, нажмите <b className="dark:text-zinc-300">«Завершить аудит»</b>. Вас перекинет на экран итогов.</p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700/50 transition-colors">
                <span className="font-bold text-gray-800 dark:text-zinc-200 text-sm block mb-1">На экране итогов нужно:</span>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-zinc-400 font-medium list-disc list-inside">
                  <li>Указать сотрудников, которые были на смене.</li>
                  <li>Написать общий комментарий/заключение о проверке.</li>
                  <li>Нажать кнопку «Отправить на сервер». <b className="text-gray-800 dark:text-zinc-200">Только после этого аудит считается завершенным!</b></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ПОЛЕЗНЫЕ ФИШКИ */}
        <div className="bg-gray-900 dark:bg-zinc-950 p-6 md:p-8 rounded-3xl shadow-lg border border-transparent dark:border-zinc-800 text-white transition-colors">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">💡 Полезные функции</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-orange-400 text-sm">Автосохранение (Черновик)</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Если у вас сел телефон или вы случайно закрыли вкладку во время аудита — ничего страшного. Приложение автоматически сохраняет ваш прогресс каждую секунду. Просто снова откройте сайт и нажмите синюю кнопку «Продолжить аудит».
              </p>
            </div>
            <div className="h-px w-full bg-gray-700/50 dark:bg-zinc-800"></div>
            <div>
              <h3 className="font-bold text-orange-400 text-sm">Приложение на телефон (PWA)</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Для удобства вы можете установить UPPETIT как обычное приложение. В Safari на iPhone нажмите «Поделиться» → «На экран "Домой"». На Android (Chrome) нажмите три точки → «Установить приложение».
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}