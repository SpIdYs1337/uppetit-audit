import React, { RefObject } from 'react';

interface QuestionCardProps {
  currentQ: any;
  currentAnswer: any;
  audit: any; // Передаем объект audit из хука
}

export function QuestionCard({ currentQ, currentAnswer, audit }: QuestionCardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative min-h-[300px] flex flex-col">
      {currentQ.isCritical && <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase">Критическое</div>}
      <div className="absolute top-0 left-0 bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-br-xl rounded-tl-3xl uppercase">{currentQ.zone || 'Основной раздел'}</div>

      <div className="flex-1 mt-6">
        <h2 className="text-xl font-black text-gray-900 mb-2">{currentQ.text}</h2>
        <p className="text-xs text-gray-400 font-medium mb-4">Штраф: <span className="text-orange-500">-{currentQ.score} б.</span></p>

        {currentAnswer?.photos && currentAnswer.photos.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 snap-x">
            {currentAnswer.photos.map((photoUrl: string, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden w-24 h-24 flex-shrink-0 snap-start bg-gray-100">
                <img src={photoUrl} className="w-full h-full object-cover" alt="" />
                <button onClick={() => audit.handlers.handleRemovePhoto(idx)} className="absolute top-1 right-1 bg-white/90 text-red-500 w-6 h-6 rounded-md font-bold text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="mb-6">
          <textarea placeholder="Комментарий..." value={currentAnswer?.comment || ''} onChange={(e) => audit.handlers.handleCommentChange(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-2 text-sm outline-none resize-none" rows={3} />
        </div>
      </div>

      <div className="space-y-3 mt-auto">
        <button onClick={() => audit.handlers.handleAnswer(true)} className={`w-full py-4 rounded-2xl font-bold border-2 ${currentAnswer?.isOk === true ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-100 text-gray-400'}`}>Всё отлично</button>
        <div className="flex gap-2">
          <button onClick={() => audit.handlers.handleAnswer(false)} className={`flex-1 py-4 rounded-2xl font-bold border-2 ${currentAnswer?.isOk === false ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-100 text-gray-400'}`}>Есть проблема</button>
          <input type="file" accept="image/*" multiple ref={audit.fileInputRef} onChange={audit.handlers.handlePhotoCapture} className="hidden" />
          <button onClick={() => audit.fileInputRef.current?.click()} disabled={audit.isUploadingPhoto} className="w-16 flex items-center justify-center bg-gray-100 rounded-2xl">
            {audit.isUploadingPhoto ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <span>📷</span>}
          </button>
        </div>
      </div>
    </div>
  );
}