import React, { RefObject, useRef } from 'react';

interface Question {
  isCritical?: boolean;
  zone?: string;
  text: string;
  score: number;
  isPhotoRequired?: boolean; // Добавлено поле
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

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative min-h-[300px] flex flex-col">
      {/* Метки вопроса */}
      <div className="absolute top-0 right-0 flex items-center">
        {currentQ.isPhotoRequired && (
          <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase flex items-center gap-1">
            📸 Обязательно
          </div>
        )}
        {currentQ.isCritical && (
          <div className="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase">
            Критическое
          </div>
        )}
      </div>
      
      <div className="absolute top-0 left-0 bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-br-xl rounded-tl-3xl uppercase">
        {currentQ.zone || 'Основной раздел'}
      </div>

      <div className="flex-1 mt-6">
        <h2 className="text-xl font-black text-gray-900 mb-2 mt-2">{currentQ.text}</h2>
        <p className="text-xs text-gray-400 font-medium mb-4">Штраф: <span className="text-orange-500 font-bold">-{currentQ.score} б.</span></p>

        {/* Вывод загруженных фото */}
        {currentAnswer?.photos && currentAnswer.photos.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 snap-x custom-scrollbar">
            {currentAnswer.photos.map((photoUrl: string, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden w-24 h-24 flex-shrink-0 snap-start bg-gray-100 border border-gray-200">
                <img src={photoUrl} className="w-full h-full object-cover" alt="Audit attachment" />
                <button onClick={() => audit.handlers.handleRemovePhoto(idx)} className="absolute top-1 right-1 bg-white/90 text-red-500 w-6 h-6 rounded-md font-black text-xs hover:bg-red-50 transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="mb-6">
          <textarea placeholder="Комментарий..." value={currentAnswer?.comment || ''} onChange={(e) => audit.handlers.handleCommentChange(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 focus:bg-white border border-gray-100 focus:border-[#F25C05] text-sm font-medium outline-none resize-none transition-colors" rows={3} />
        </div>
      </div>

      <div className="space-y-3 mt-auto">
        <button onClick={() => audit.handlers.handleAnswer(true)} className={`w-full py-4 rounded-2xl font-bold border-2 transition-colors ${currentAnswer?.isOk === true ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:border-green-200 hover:text-green-600'}`}>Всё отлично</button>
        <div className="flex gap-2">
          <button onClick={() => audit.handlers.handleAnswer(false)} className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-colors ${currentAnswer?.isOk === false ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-600'}`}>Есть проблема</button>
          
          {/* Скрытые инпуты для галереи и камеры */}
          <input type="file" accept="image/*" multiple ref={audit.fileInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          
          <div className="flex gap-1">
            {/* Кнопка Галереи */}
            <button onClick={handleGalleryClick} disabled={audit.isUploadingPhoto} title="Выбрать из галереи" className="w-14 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-colors">
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl">🖼️</span>}
            </button>
            {/* Кнопка Камеры (Android/Mobile) */}
            <button onClick={handleCameraClick} disabled={audit.isUploadingPhoto} title="Сделать снимок" className="w-14 flex items-center justify-center bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl transition-colors">
              {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> : <span className="text-xl">📸</span>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}