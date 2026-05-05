'use client';

import React, { useEffect } from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  // Блокируем прокрутку страницы под модалкой, когда она открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Клик по затемненному фону тоже закрывает модалку */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Само окно */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Шапка модалки (зафиксирована сверху) */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-zinc-800">
          <h2 className="text-xl sm:text-2xl font-black text-white">Политика конфиденциальности</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Прокручиваемый контент */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
            Последнее обновление: 5 мая 2026 г.
          </p>

          <section>
            <h3 className="text-base font-bold text-white mb-2">1. Общие положения</h3>
            <p className="mb-2">
              Настоящая Политика составлена в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных в приложении <strong className="text-white">UPPETIT Audit</strong>.
            </p>
            <p>
              Приложение является внутренним корпоративным инструментом для проведения аудита и контроля качества работы точек продаж.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">2. Какие данные мы собираем</h3>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400 marker:text-[#F25C05]">
              {/* ИЗМЕНЕНО: Добавили Имя, Фамилию, Email, Телефон */}
              <li>Учетные и контактные данные (логин, зашифрованный пароль, Имя, Фамилия, E-mail, номер телефона);</li>
              <li>ФИО или имена сотрудников, указываемые в отчетах об аудите;</li>
              <li>Фотографии и медиафайлы, создаваемые в процессе аудита;</li>
              <li>Технические данные об устройстве для обеспечения работы авторизации и PWA.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">3. Цели обработки данных</h3>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400 marker:text-[#F25C05]">
              <li>Идентификация пользователя в Приложении;</li>
              <li>Проведение внутренних проверок, фиксация нарушений;</li>
              <li>Формирование аналитической и статистической отчетности.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">4. Правовые основания и безопасность</h3>
            <p className="mb-2">
              Основанием для обработки является Трудовой кодекс РФ. Все данные хранятся на серверах, физически расположенных на территории РФ (ч. 5 ст. 18 ФЗ-152).
            </p>
            <p>
              Медиафайлы (фотоотчеты) автоматически удаляются из облачного хранилища по истечении 12 месяцев с момента их загрузки.
            </p>
          </section>

          <section>
            <h3 className="text-base font-bold text-white mb-2">5. Контактная информация</h3>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь в IT-отдел компании <strong className="text-[#F25C05]">ООО "UPPETIT"</strong>.
            </p>
          </section>
        </div>

        {/* Подвал модалки */}
        <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-900/50 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="w-full bg-[#F25C05] hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            Понятно
          </button>
        </div>

      </div>
    </div>
  );
}