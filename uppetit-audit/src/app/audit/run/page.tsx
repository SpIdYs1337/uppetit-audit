'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuditRun } from '@/hooks/useAuditRun';
import { QuestionCard } from '@/components/audit-run/QuestionCard';
import { FinalStep } from '@/components/audit-run/FinalStep';

function AuditRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locId, setLocId] = useState<string | null>(null);
  const [chkId, setChkId] = useState<string | null>(null);

  useEffect(() => {
    const qLoc = searchParams.get('location');
    const qChk = searchParams.get('checklist');
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
  }, [searchParams, router]);

  const audit = useAuditRun(locId, chkId);

  if (!locId || !chkId || audit.isLoading) return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold bg-gray-50 h-screen">Загрузка...</div>;
  if (!audit.checklist || audit.questions.length === 0) return <div className="flex-1 flex items-center justify-center text-red-500 font-bold h-screen">Чек-лист пуст или не найден</div>;

  const answeredCount = Object.values(audit.answers).filter(a => a.isOk !== undefined).length;
  const progressPercent = audit.isFinalStep ? 100 : (answeredCount / audit.questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      
      {/* HEADER */}
      <header className="bg-white p-6 shadow-sm z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={audit.handlers.handleCancel} className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full font-bold transition-all">✕</button>
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
      <main className="flex-1 flex flex-col justify-center p-4">
        {audit.isFinalStep ? (
          <FinalStep audit={audit} />
        ) : (
          <QuestionCard 
            currentQ={audit.questions[audit.currentIndex]} 
            currentAnswer={audit.answers[audit.currentIndex]} 
            audit={audit} 
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white p-4 border-t flex gap-3 z-20">
        <button onClick={audit.handlers.handlePrev} disabled={!audit.isFinalStep && audit.currentIndex === 0} className="px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl disabled:opacity-50">Назад</button>
        {audit.isFinalStep ? (
          <button onClick={audit.handlers.handleSubmit} disabled={audit.isSubmitting} className="flex-1 bg-[#F25C05] text-white py-4 rounded-2xl font-bold disabled:opacity-70">{audit.isSubmitting ? 'Отправка...' : 'Завершить аудит'}</button>
        ) : audit.currentIndex < audit.questions.length - 1 ? (
          <button onClick={audit.handlers.handleNext} className="flex-1 bg-black text-white py-4 rounded-2xl font-bold">Далее</button>
        ) : audit.isAllAnswered ? (
          <button onClick={audit.handlers.handleNext} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold">К завершению</button>
        ) : (
          <button onClick={audit.handlers.handleGoToUnanswered} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold">Пропущено (№{audit.firstUnansweredIndex + 1})</button>
        )}
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