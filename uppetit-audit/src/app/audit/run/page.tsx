'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Link from 'next/link';

interface AnswerData {
  isOk: boolean;
  photoBase64?: string; 
  comment?: string;
}

function AuditRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get('location');
  const checklistId = searchParams.get('checklist');

  const [checklist, setChecklist] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [answers, setAnswers] = useState<Record<number, AnswerData>>({}); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // Для индикации автосохранения
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Загрузка данных чек-листа и ЧЕРНОВИКА
  useEffect(() => {
    const fetchDetails = async () => {
      if (!locationId || !checklistId) return;
      try {
        const [locRes, checkRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/checklists')
        ]);
        const locs = await locRes.json();
        const checks = await checkRes.json();
        
        setLocation(locs.find((l: any) => l.id === locationId));
        
        const foundChecklist = checks.find((c: any) => c.id === checklistId);
        setChecklist(foundChecklist);
        
        if (foundChecklist?.items) {
          try {
            setQuestions(typeof foundChecklist.items === 'string' ? JSON.parse(foundChecklist.items) : foundChecklist.items);
          } catch (e) {}
        }

        // ВОССТАНОВЛЕНИЕ ЧЕРНОВИКА
        const draftKey = `audit_draft_${locationId}_${checklistId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            setAnswers(JSON.parse(savedDraft));
          } catch (e) {
            console.error('Ошибка чтения черновика');
          }
        }

      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [locationId, checklistId]);

  // 2. АВТОСОХРАНЕНИЕ при каждом изменении ответов
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      const draftKey = `audit_draft_${locationId}_${checklistId}`;
      localStorage.setItem(draftKey, JSON.stringify(answers));
      
      setSaveStatus('Черновик сохранен');
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [answers, locationId, checklistId]);

  // Обработка ответа
  const handleAnswer = (isOk: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], isOk }
    }));
  };

  // Обработка комментария
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], comment: text }
    }));
  };

  // Сжатие и сохранение фото (Усилили сжатие до 0.6 и ширину до 600px для экономии места)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; // Сделали меньше, чтобы точно влезало в лимиты
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // Сжатие сильнее

          setAnswers(prev => ({
            ...prev,
            [currentIndex]: { ...prev[currentIndex], photoBase64: compressedBase64 }
          }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const session = await getSession();
      const userId = (session?.user as any)?.id;

      if (!userId) {
        alert('Ошибка авторизации.');
        setIsSubmitting(false);
        return;
      }

      const maxScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      let lostPoints = 0;

      const answersArray = Object.entries(answers).map(([indexStr, ans]) => {
        const q = questions[Number(indexStr)];
        if (!ans.isOk) { 
          lostPoints += (Number(q.score) || 0);
        }
        return {
          zone: q.zone || 'Основной раздел',
          questionText: q.text,
          isOk: ans.isOk,
          penalty: ans.isOk ? 0 : (Number(q.score) || 0),
          photoBase64: ans.photoBase64,
          comment: ans.comment
        };
      });

      const currentScore = Math.max(0, maxScore - lostPoints);

      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          locationId,
          checklistId,
          score: currentScore,
          maxScore: maxScore, // ИСПРАВЛЕНИЕ: Добавили maxScore в отправку
          answers: answersArray 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Ошибка сервера. Возможно, размер фото слишком большой.');
      }

      // УСПЕХ: Очищаем черновик
      localStorage.removeItem(`audit_draft_${locationId}_${checklistId}`);

      alert(`Аудит завершен!\nРезультат: ${currentScore} из ${maxScore} баллов`);
      router.push('/audit');
      
    } catch (err: any) {
      console.error(err);
      alert(`Произошла ошибка при отправке данных: ${err.message}\n\nНе переживайте, ваши ответы сохранены как черновик. Попробуйте удалить слишком большие фото и отправить снова.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold bg-gray-50 h-screen">Загрузка...</div>;
  if (!checklist || questions.length === 0) return <div className="flex-1 flex items-center justify-center text-red-500 font-bold h-screen">Чек-лист пуст или не найден</div>;

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isAllAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white p-6 shadow-sm z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Link href="/audit" className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-transform">
              ✕
            </Link>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight">{location?.name}</h1>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1">{checklist?.title}</p>
            </div>
          </div>
          
          {/* ИНДИКАТОР СОХРАНЕНИЯ */}
          <div className="text-[10px] font-bold text-green-500 transition-opacity duration-300 h-4">
            {saveStatus}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-gray-400">Вопрос {currentIndex + 1} из {questions.length}</span>
          <span className="text-blue-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative min-h-[300px] flex flex-col transition-all">
          
          {currentQ.isCritical && (
            <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase tracking-wider">
              Критическое
            </div>
          )}

          <div className="absolute top-0 left-0 bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-br-xl rounded-tl-3xl uppercase tracking-wider border-b border-r border-blue-100">
            {currentQ.zone || 'Основной раздел'}
          </div>

          <div className="flex-1 mt-6">
            <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">
              {currentQ.text}
            </h2>
            <p className="text-xs text-gray-400 font-medium mb-4">
              Штраф за нарушение: <span className="text-orange-500 font-bold">-{currentQ.score} б.</span>
            </p>

            {currentAnswer?.photoBase64 && (
              <div className="mb-4 relative rounded-xl overflow-hidden border border-gray-200">
                <img src={currentAnswer.photoBase64} alt="Фото нарушения" className="w-full h-40 object-cover" />
                <button 
                  onClick={() => setAnswers(prev => { const newA = {...prev}; delete newA[currentIndex].photoBase64; return newA; })}
                  className="absolute top-2 right-2 bg-white/80 backdrop-blur text-red-500 p-2 rounded-lg font-bold text-xs shadow-sm"
                >
                  Удалить фото
                </button>
              </div>
            )}
            
            <div className="mb-6">
              <textarea
                placeholder="Добавить комментарий к ответу (необязательно)..."
                value={currentAnswer?.comment || ''}
                onChange={handleCommentChange}
                className="w-full p-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:border-[#F25C05] focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            <button
              onClick={() => handleAnswer(true)}
              className={`w-full py-4 rounded-2xl font-bold border-2 transition-all active:scale-95 ${
                currentAnswer?.isOk === true
                  ? 'bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-500/20'
                  : 'border-gray-100 text-gray-400 bg-gray-50 hover:border-green-200'
              }`}
            >
              Всё отлично
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleAnswer(false)}
                className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all active:scale-95 ${
                  currentAnswer?.isOk === false
                    ? 'bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-500/20'
                    : 'border-gray-100 text-gray-400 bg-gray-50 hover:border-red-200'
                }`}
              >
                Есть проблема
              </button>

              <input 
                type="file" 
                accept="image/jpeg, image/png, image/jpg, image/webp" 
                capture="environment" 
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                className="hidden" 
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 flex items-center justify-center bg-gray-100 text-gray-500 rounded-2xl font-bold border-2 border-transparent active:scale-95 hover:bg-gray-200 transition-colors"
                title="Сделать фото"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
          </div>

        </div>
      </main>

      <footer className="bg-white p-4 border-t border-gray-100 flex gap-3 z-20">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
        >
          Назад
        </button>

        {currentIndex < questions.length - 1 ? (
          <button 
            onClick={handleNext}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform"
          >
            Далее
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={!isAllAnswered || isSubmitting}
            className="flex-1 bg-[#F25C05] text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:bg-gray-300 shadow-lg shadow-orange-500/20"
          >
            {isSubmitting ? 'Отправка...' : 'Завершить аудит'}
          </button>
        )}
      </footer>
    </div>
  );
}

export default function RunAuditPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-400 h-screen flex items-center justify-center">Загрузка модуля...</div>}>
      <AuditRunForm />
    </Suspense>
  );
}