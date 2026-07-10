import React, { RefObject, useRef } from 'react';

interface Question {
  isCritical?: boolean;
  zone?: string;
  text: string;
  score: number;
  isPhotoRequired?: boolean; // Старое поле для обратной совместимости
  photoRequirement?: 'OPTIONAL' | 'REQUIRED' | 'VIOLATION'; // Новое поле
}

interface Answer {
  isOk?: boolean;
  comment?: string;
  photos?: string[];
}

interface QuestionCardAuditState {
  handlers: {
    handleRemovePhoto: (idx: number) => void;
    handleCommentChange: (val: string) => void;
    handleAnswer: (isOk: boolean) => void;
    handlePhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploadingPhoto: boolean;
}

interface QuestionCardProps {
  currentQ: Question;
  currentAnswer: Answer;
  audit: QuestionCardAuditState;
}

export function QuestionCard({ currentQ, currentAnswer, audit }: QuestionCardProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleGalleryClick = () => {
    if (audit.fileInputRef.current) audit.fileInputRef.current.click();
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) cameraInputRef.current.click();
  };

  const isPhotoRequiredAlways = currentQ.photoRequirement === 'REQUIRED' || (!currentQ.photoRequirement && currentQ.isPhotoRequired);
  const isPhotoRequiredOnViolation = currentQ.photoRequirement === 'VIOLATION';

  return (
    // Карточка-обертка: Фиксированная минимальная и максимальная высота
    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative flex flex-col transition-colors duration-300 overflow-hidden min-h-[450px] max-h-[75vh]">
      
      {/* Метки вопроса (Абсолютное позиционирование) */}
      <div className="absolute top-0 right-0 flex items-center z-20">
        {isPhotoRequiredAlways && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase flex items-center gap-1">
            📸 Обязательно
          </div>
        )}
        {isPhotoRequiredOnViolation && (
          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase flex items-center gap-1">
            🚨 При нарушении
          </div>
        )}
        {currentQ.isCritical && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase">
            Критическое
          </div>
        )}
      </div>
      
      <div className="absolute top-0 left-0 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-[10px] font-bold px-3 py-1.5 rounded-br-xl uppercase z-20">
        {currentQ.zone || 'Основной раздел'}
      </div>

      {/* Верхняя часть (Контент): Скроллится, если текст очень длинный */}
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4 custom-scrollbar">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 mb-2 leading-snug">{currentQ.text}</h2>
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mb-5">Штраф: <span className="text-orange-500 dark:text-orange-400 font-bold">-{currentQ.score} б.</span></p>

        {/* Вывод загруженных фото */}
        {currentAnswer?.photos && currentAnswer.photos.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 snap-x custom-scrollbar">
            {currentAnswer.photos.map((photoUrl: string, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden w-24 h-24 flex-shrink-0 snap-start bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                <img src={photoUrl} className="w-full h-full object-cover" alt="Audit attachment" />
                <button 
                  onClick={() => audit.handlers.handleRemovePhoto(idx)} 
                  className="absolute top-1 right-1 bg-white/90 dark:bg-black/70 text-red-500 w-6 h-6 rounded-md font-black text-xs hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-2">
          <textarea 
            placeholder="Оставьте комментарий (обязательно при нарушении)..." 
            value={currentAnswer?.comment || ''} 
            onChange={(e) => audit.handlers.handleCommentChange(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:border-[#F25C05] dark:focus:border-[#F25C05] text-sm font-medium outline-none resize-none transition-colors" 
            rows={4} 
          />
        </div>
      </div>

      {/* Нижняя часть (Кнопки): Всегда приклеена к низу карточки */}
      <div className="px-6 pb-6 pt-2 shrink-0 bg-white dark:bg-zinc-900 z-10 space-y-3">
        <button 
          onClick={() => audit.handlers.handleAnswer(true)} 
          className={`w-full py-4 rounded-2xl font-bold border-2 transition-colors active:scale-[0.98] ${
            currentAnswer?.isOk === true 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 shadow-sm' 
              : 'border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-green-200 dark:hover:border-green-900/50 hover:text-green-600 dark:hover:text-green-400'
          }`}
        >
          Всё отлично
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => audit.handlers.handleAnswer(false)} 
            className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-colors active:scale-[0.98] ${
              currentAnswer?.isOk === false 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-400 shadow-sm' 
                : 'border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-red-200 dark:hover:border-red-900/50 hover:text-red-600 dark:hover:text-red-400'
            }`}
          >
            Есть проблема
          </button>
          
          <input type="file" accept="image/*" multiple ref={audit.fileInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          
          <div className="flex gap-1 shrink-0">
            <button 
              onClick={handleGalleryClick} 
              disabled={audit.isUploadingPhoto} 
              title="Выбрать из галереи" 
              className="w-14 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-2xl transition-colors disabled:opacity-50 active:scale-95"
            >
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl opacity-90">🖼️</span>}
            </button>
            <button 
              onClick={handleCameraClick} 
              disabled={audit.isUploadingPhoto} 
              title="Сделать снимок" 
              className="w-14 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/30 rounded-2xl transition-colors disabled:opacity-50 active:scale-95"
            >
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl opacity-90">📸</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}