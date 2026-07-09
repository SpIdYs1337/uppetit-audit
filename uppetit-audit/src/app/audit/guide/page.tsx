'use client';

import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 bg-transparent min-h-screen pb-20 transition-colors duration-300 relative z-10">
      
      {/* МОБИЛЬНАЯ ШАПКА */}
      <header className="flex items-center mb-8 mt-4 relative md:hidden">
        <Link 
          href="/audit" 
          className="absolute left-0 w-10 h-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 dark:text-zinc-100 shadow-sm border border-white/50 dark:border-zinc-800/50 active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="w-full text-center text-xl font-black text-gray-900 dark:text-zinc-100">Инструкция</h1>
      </header>

      {/* ШАПКА ПК */}
      <div className="hidden md:flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Как пользоваться приложением</h1>
          <p className="text-base text-gray-500 dark:text-zinc-400 font-medium mt-2 transition-colors">Подробное руководство по проведению аудитов</p>
        </div>
        <Link 
          href="/audit" 
          className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 text-gray-700 dark:text-zinc-300 px-6 py-3 rounded-2xl font-bold hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95"
        >
          Назад на главную
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        {/* ГЛАВНЫЙ ЭКРАН */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-white/50 dark:border-zinc-800/50 transition-colors">
          <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-3 transition-colors">
            📱 Главный экран
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="p-5 sm:p-6 bg-orange-50/80 dark:bg-orange-900/10 rounded-[1.5rem] border border-orange-100/50 dark:border-orange-900/30 transition-colors shadow-inner hover:shadow-md">
              <div className="font-black text-[#F25C05] dark:text-[#F25C05] mb-2 text-lg">Начать проверку</div>
              <div className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">Создание нового аудита. Здесь вы выбираете управляющего (ТУ), конкретную точку и нужный чек-лист.</div>
            </div>
            <div className="p-5 sm:p-6 bg-blue-50/80 dark:bg-blue-900/10 rounded-[1.5rem] border border-blue-100/50 dark:border-blue-900/30 transition-colors shadow-inner hover:shadow-md">
              <div className="font-black text-blue-600 dark:text-blue-400 mb-2 text-lg">Продолжить аудит</div>
              <div className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">Кнопка появляется, если вы начали аудит, но не завершили его. Приложение сохраняет ваши ответы на устройстве.</div>
            </div>
            <div className="p-5 sm:p-6 bg-gray-50/80 dark:bg-zinc-800/50 rounded-[1.5rem] border border-gray-200/50 dark:border-zinc-700/50 transition-colors shadow-inner hover:shadow-md">
              <div className="font-black text-gray-800 dark:text-zinc-200 mb-2 text-lg">Мой план</div>
              <div className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">Ваш личный календарь. Здесь видно, какие точки и в какие даты вам нужно проверить.</div>
            </div>
            <div className="p-5 sm:p-6 bg-gray-50/80 dark:bg-zinc-800/50 rounded-[1.5rem] border border-gray-200/50 dark:border-zinc-700/50 transition-colors shadow-inner hover:shadow-md">
              <div className="font-black text-gray-800 dark:text-zinc-200 mb-2 text-lg">История проверок</div>
              <div className="text-sm text-gray-600 dark:text-zinc-400 font-medium leading-relaxed">Архив ваших завершенных аудитов. Можно посмотреть итоговый балл и скачанные отчеты.</div>
            </div>
          </div>
        </div>

        {/* ШАГИ ПРОВЕДЕНИЯ АУДИТА */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-white/50 dark:border-zinc-800/50 space-y-10 transition-colors">
          <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 mb-4 transition-colors">Процесс проверки</h2>
          
          <div className="flex gap-5 sm:gap-6">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-zinc-800 shadow-md text-gray-600 dark:text-zinc-300 font-black text-lg flex items-center justify-center shrink-0 transition-colors border border-gray-100 dark:border-zinc-700">1</div>
              <div className="w-0.5 h-full bg-gray-200 dark:bg-zinc-800 my-3 transition-colors"></div>
            </div>
            <div className="pb-6 w-full">
              <h3 className="font-black text-gray-900 dark:text-zinc-100 text-xl transition-colors">Выбор параметров</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-base mt-2 mb-3 leading-relaxed transition-colors">Последовательно выберите ТУ, точку и доступный чек-лист. Если точек нет — обратитесь к администратору.</p>
            </div>
          </div>

          <div className="flex gap-5 sm:gap-6">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 shadow-md shadow-green-500/10 text-green-600 dark:text-green-500 font-black text-lg flex items-center justify-center shrink-0 transition-colors border border-green-200 dark:border-green-800">2</div>
              <div className="w-0.5 h-full bg-gray-200 dark:bg-zinc-800 my-3 transition-colors"></div>
            </div>
            <div className="pb-6 w-full">
              <h3 className="font-black text-gray-900 dark:text-zinc-100 text-xl transition-colors">Заполнение чек-листа</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-base mt-2 mb-4 leading-relaxed transition-colors">Вопросы разбиты по зонам (например, Касса, Зал, Кухня). Переключайтесь между зонами по мере обхода точки.</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm sm:text-base bg-green-50/80 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30 p-3 sm:p-4 rounded-2xl font-bold transition-colors">
                  <span className="text-xl">✅</span> Отлично — нарушений нет (максимальный балл).
                </div>
                <div className="flex items-center gap-3 text-sm sm:text-base bg-red-50/80 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 p-3 sm:p-4 rounded-2xl font-bold transition-colors">
                  <span className="text-xl">❌</span> Есть проблема — стандарт нарушен (штраф).
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-5 sm:gap-6">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 dark:bg-red-900/30 shadow-md shadow-red-500/10 text-red-500 dark:text-red-400 font-black text-lg flex items-center justify-center shrink-0 transition-colors border border-red-200 dark:border-red-800">3</div>
              <div className="w-0.5 h-full bg-gray-200 dark:bg-zinc-800 my-3 transition-colors"></div>
            </div>
            <div className="pb-6 w-full">
              <h3 className="font-black text-gray-900 dark:text-zinc-100 text-xl transition-colors">Фото и комментарии <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg text-sm ml-2">(Обязательно!)</span></h3>
              <p className="text-gray-500 dark:text-zinc-400 text-base mt-2 leading-relaxed transition-colors">Если вы выбрали <b className="dark:text-zinc-300">«Есть проблема»</b>, система попросит вас обосновать снижение оценки.</p>
              <ul className="mt-4 space-y-2 text-base text-gray-600 dark:text-zinc-400 font-medium list-disc list-inside transition-colors bg-gray-50 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-700/50">
                <li>Сделайте четкое фото нарушения (кнопка 📷).</li>
                <li>Оставьте короткий текстовый комментарий (например: <i>"Грязь под холодильником"</i>).</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-5 sm:gap-6">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F25C05] shadow-lg shadow-orange-500/30 text-white font-black text-lg flex items-center justify-center shrink-0 transition-colors">4</div>
            </div>
            <div className="pb-2 w-full">
              <h3 className="font-black text-gray-900 dark:text-zinc-100 text-xl transition-colors">Завершение и отправка</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-base mt-2 leading-relaxed transition-colors">Когда все вопросы отвечены, нажмите <b className="dark:text-zinc-300">«Завершить аудит»</b>. Вас перекинет на экран итогов.</p>
              <div className="mt-4 p-4 sm:p-5 bg-white/50 dark:bg-zinc-800/50 rounded-2xl border border-gray-200/50 dark:border-zinc-700/50 transition-colors shadow-inner">
                <span className="font-black text-gray-800 dark:text-zinc-200 text-base block mb-3 uppercase tracking-wider">На экране итогов нужно:</span>
                <ul className="space-y-2 text-sm sm:text-base text-gray-600 dark:text-zinc-400 font-medium list-disc list-inside">
                  <li>Указать сотрудников, которые были на смене.</li>
                  <li>Написать общий комментарий/заключение о проверке.</li>
                  <li>Нажать кнопку «Отправить на сервер». <b className="text-gray-900 dark:text-zinc-100 border-b-2 border-red-500/50 pb-0.5">Только после этого аудит считается завершенным!</b></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ПОЛЕЗНЫЕ ФИШКИ */}
        <div className="bg-gray-900/95 dark:bg-zinc-950/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-black/10 border border-gray-800 text-white transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-2xl font-black mb-6 flex items-center gap-3 relative z-10">💡 Полезные функции</h2>
          <div className="space-y-6 relative z-10">
            <div>
              <h3 className="font-black text-orange-400 text-lg">Автосохранение (Черновик)</h3>
              <p className="text-gray-300 text-sm sm:text-base mt-2 leading-relaxed font-medium">
                Если у вас сел телефон или вы случайно закрыли вкладку во время аудита — ничего страшного. Приложение автоматически сохраняет ваш прогресс каждую секунду. Просто снова откройте сайт и нажмите синюю кнопку «Продолжить аудит».
              </p>
            </div>
            <div className="h-px w-full bg-gray-700/50 dark:bg-zinc-800"></div>
            <div>
              <h3 className="font-black text-orange-400 text-lg">Приложение на телефон (PWA)</h3>
              <p className="text-gray-300 text-sm sm:text-base mt-2 leading-relaxed font-medium">
                Для удобства вы можете установить UPPETIT как обычное приложение. В Safari на iPhone нажмите «Поделиться» → «На экран "Домой"». На Android (Chrome) нажмите три точки → «Установить приложение».
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}