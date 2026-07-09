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
  // Реф для прямого вызова камеры на мобильных
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleGalleryClick = () => {
    if (audit.fileInputRef.current) audit.fileInputRef.current.click();
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) cameraInputRef.current.click();
  };

  // Вычисляем логику для бейджика фото
  const isPhotoRequiredAlways = currentQ.photoRequirement === 'REQUIRED' || (!currentQ.photoRequirement && currentQ.isPhotoRequired);
  const isPhotoRequiredOnViolation = currentQ.photoRequirement === 'VIOLATION';

  return (
    // ИСПРАВЛЕНИЕ: Увеличил min-h и добавил pb-8 на мобилках
    <div className="bg-white dark:bg-zinc-900 p-6 pb-8 md:pb-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative min-h-[400px] flex flex-col transition-colors duration-300">
      
      {/* Метки вопроса */}
      <div className="absolute top-0 right-0 flex items-center">
        {isPhotoRequiredAlways && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1 transition-colors">
            📸 Обязательно
          </div>
        )}
        {isPhotoRequiredOnViolation && (
          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1 transition-colors">
            🚨 При нарушении
          </div>
        )}
        {currentQ.isCritical && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase transition-colors">
            Критическое
          </div>
        )}
      </div>
      
      <div className="absolute top-0 left-0 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-br-xl rounded-tl-3xl uppercase transition-colors">
        {currentQ.zone || 'Основной раздел'}
      </div>

      <div className="flex-1 mt-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100 mb-2 mt-2 transition-colors">{currentQ.text}</h2>
        <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mb-4 transition-colors">Штраф: <span className="text-orange-500 dark:text-orange-400 font-bold">-{currentQ.score} б.</span></p>

        {/* Вывод загруженных фото */}
        {currentAnswer?.photos && currentAnswer.photos.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 snap-x custom-scrollbar">
            {currentAnswer.photos.map((photoUrl: string, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden w-24 h-24 flex-shrink-0 snap-start bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 transition-colors">
                <img src={photoUrl} className="w-full h-full object-cover" alt="Audit attachment" />
                <button 
                  onClick={() => audit.handlers.handleRemovePhoto(idx)} 
                  className="absolute top-1 right-1 bg-white/90 dark:bg-black/70 text-red-500 w-6 h-6 rounded-md font-black text-xs hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-6">
          <textarea 
            placeholder="Комментарий..." 
            value={currentAnswer?.comment || ''} 
            onChange={(e) => audit.handlers.handleCommentChange(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 focus:bg-white dark:focus:bg-zinc-950 border border-gray-100 dark:border-zinc-700 text-gray-900 dark:text-zinc-200 focus:border-[#F25C05] dark:focus:border-[#F25C05] text-sm font-medium outline-none resize-none transition-colors" 
            rows={3} 
          />
        </div>
      </div>

      {/* ИСПРАВЛЕНИЕ: Добавлен shrink-0, чтобы блок с кнопками не сжимался */}
      <div className="space-y-3 mt-auto shrink-0">
        <button 
          onClick={() => audit.handlers.handleAnswer(true)} 
          className={`w-full py-4 rounded-2xl font-bold border-2 transition-colors ${
            currentAnswer?.isOk === true 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 shadow-sm' 
              : 'border-gray-100 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-green-200 dark:hover:border-green-900/50 hover:text-green-600 dark:hover:text-green-400'
          }`}
        >
          Всё отлично
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => audit.handlers.handleAnswer(false)} 
            className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-colors ${
              currentAnswer?.isOk === false 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-400 shadow-sm' 
                : 'border-gray-100 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-red-200 dark:hover:border-red-900/50 hover:text-red-600 dark:hover:text-red-400'
            }`}
          >
            Есть проблема
          </button>
          
          {/* Скрытые инпуты для галереи и камеры */}
          <input type="file" accept="image/*" multiple ref={audit.fileInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          
          <div className="flex gap-1 shrink-0">
            {/* Кнопка Галереи */}
            <button 
              onClick={handleGalleryClick} 
              disabled={audit.isUploadingPhoto} 
              title="Выбрать из галереи" 
              className="w-14 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-2xl transition-colors disabled:opacity-50"
            >
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-gray-400 dark:border-zinc-500 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl opacity-90">🖼️</span>}
            </button>
            {/* Кнопка Камеры */}
            <button 
              onClick={handleCameraClick} 
              disabled={audit.isUploadingPhoto} 
              title="Сделать снимок" 
              className="w-14 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/30 rounded-2xl transition-colors disabled:opacity-50"
            >
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl opacity-90">📸</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}