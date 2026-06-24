'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuditRun } from '@/hooks/useAuditRun';
import { QuestionCard } from '@/components/audit-run/QuestionCard';
import { FinalStep } from '@/components/audit-run/FinalStep';

function AuditRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qLoc = searchParams.get('location');
  const qChk = searchParams.get('checklist');
  
  const backToUrl = searchParams.get('backTo') || '/audit';

  const [locId, setLocId] = useState(qLoc || '');
  const [chkId, setChkId] = useState(qChk || '');

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    if (qLoc && qChk) {
      setLocId(qLoc); setChkId(qChk);
      localStorage.setItem('last_active_audit', JSON.stringify({ loc: qLoc, chk: qChk }));
    } else {
      const meta = localStorage.getItem('last_active_audit');
      if (meta) {
        const parsed = JSON.parse(meta);
        setLocId(parsed.loc); setChkId(parsed.chk);
      } else router.replace('/audit/new');
    }
  }, [searchParams, router, qLoc, qChk]);

  const audit = useAuditRun(locId, chkId);

  if (!locId || !chkId || audit.isLoading) return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold bg-gray-50 h-screen">Загрузка...</div>;
  if (!audit.checklist || audit.questions.length === 0) return <div className="flex-1 flex items-center justify-center text-red-500 font-bold h-screen">Чек-лист пуст или не найден</div>;

  const answeredCount = Object.values(audit.answers).filter(a => a.isOk !== undefined).length;
  const progressPercent = audit.isFinalStep ? 100 : (answeredCount / audit.questions.length) * 100;

  const handleInterceptSubmit = async () => {
    if (!audit.handlers.handleSubmit) return;
    try {
      await audit.handlers.handleSubmit();
      window.location.href = backToUrl;
    } catch (err) {
      console.error('Ошибка отправки аудита:', err);
    }
  };

  const handleInterceptCancel = () => {
    window.location.href = backToUrl;
  };

  const currentQ = audit.questions[audit.currentIndex] as any;
  const currentAns = audit.answers[audit.currentIndex];
  const isAnswered = currentAns?.isOk !== undefined;
  const isPhotoMissing = currentQ?.isPhotoRequired && isAnswered && (!currentAns?.photos || currentAns.photos.length === 0);

  const showNextBtn = audit.currentIndex < audit.questions.length - 1;
  const showTeleport = !audit.isAllAnswered && 
    audit.firstUnansweredIndex !== -1 && 
    !(audit.firstUnansweredIndex === audit.currentIndex || audit.firstUnansweredIndex === audit.currentIndex + 1);

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 text-gray-900 overflow-hidden relative"> 
      
      {/* КАСТОМНОЕ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-center text-gray-900 mb-2">Завершить аудит?</h3>
            <p className="text-sm text-gray-500 text-center mb-8 font-medium">Убедитесь, что все пункты проверены и заполнены верно. После отправки редактирование будет невозможно.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                Отмена
              </button>
              <button 
                onClick={() => { setShowSubmitModal(false); handleInterceptSubmit(); }} 
                className="flex-1 px-4 py-3 bg-[#F25C05] text-white rounded-xl font-bold text-sm hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-colors"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="shrink-0 bg-white p-6 shadow-sm z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={handleInterceptCancel} className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full font-bold transition-all text-gray-900">✕</button>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight">{audit.location?.name || 'Загрузка...'}</h1>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1">{audit.checklist?.title}</p>
            </div>
          </div>
          <div className="text-[10px] font-bold text-green-500 h-4">{audit.saveStatus}</div>
        </div>
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-gray-400">{audit.isFinalStep ? 'Завершение' : `Вопрос ${audit.currentIndex + 1} из ${audit.questions.length}`}</span>
          <span className="text-blue-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }}></div></div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* ИСПРАВЛЕНИЕ: Отключаем h-full и центрирование на последнем шаге, чтобы верхушка не обрезалась */}
        <div className={`max-w-3xl mx-auto flex flex-col ${audit.isFinalStep ? '' : 'h-full justify-center'}`}>
          {audit.isFinalStep ? (
            <FinalStep audit={audit} />
          ) : (
            <QuestionCard 
              currentQ={currentQ} 
              currentAnswer={currentAns} 
              audit={audit} 
            />
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="shrink-0 bg-white p-4 border-t flex flex-col gap-2 z-20">
        {isPhotoMissing && !audit.isFinalStep && (
          <div className="text-center text-[11px] font-bold text-red-500 uppercase tracking-wider bg-red-50 py-1.5 rounded-lg border border-red-100 animate-pulse">
            Прикрепите фото, чтобы продолжить!
          </div>
        )}
        
        <div className="flex gap-2 sm:gap-3 max-w-3xl mx-auto w-full">
          <button onClick={audit.handlers.handlePrev} disabled={!audit.isFinalStep && audit.currentIndex === 0} className="px-4 sm:px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl disabled:opacity-50 transition-colors hover:bg-gray-100">
            Назад
          </button>
          
          {audit.isFinalStep ? (
            <button onClick={() => setShowSubmitModal(true)} disabled={audit.isSubmitting} className="flex-1 bg-[#F25C05] hover:bg-orange-600 text-white py-4 rounded-2xl font-bold disabled:opacity-70 transition-colors">
              {audit.isSubmitting ? 'Отправка...' : 'Завершить аудит'}
            </button>
          ) : (
            <>
              {showNextBtn && (
                <button disabled={isPhotoMissing} onClick={audit.handlers.handleNext} className="flex-1 bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold disabled:opacity-50 transition-colors">
                  Далее
                </button>
              )}

              {audit.isAllAnswered ? (
                <button disabled={isPhotoMissing} onClick={audit.handlers.handleJumpToEnd} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-md transition-colors whitespace-nowrap text-xs sm:text-base">
                  К итогам ⏭
                </button>
              ) : showTeleport ? (
                <button disabled={isPhotoMissing} onClick={audit.handlers.handleGoToUnanswered} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-md transition-colors whitespace-nowrap text-xs sm:text-sm">
                  {audit.firstUnansweredIndex > audit.currentIndex ? `К пропуску ⏭` : `К пропуску ⏪`}
                </button>
              ) : !showNextBtn && !audit.isAllAnswered ? (
                <div className="flex-1 bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold text-center border border-gray-200 border-dashed text-xs sm:text-sm flex items-center justify-center">
                  Ожидание ответа...
                </div>
              ) : null}
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function RunAuditPage() {
  return (
    <Suspense fallback={<div className="h-screen flex justify-center items-center font-bold text-gray-400">Загрузка...</div>}>
      <AuditRunForm />
    </Suspense>
  );
}