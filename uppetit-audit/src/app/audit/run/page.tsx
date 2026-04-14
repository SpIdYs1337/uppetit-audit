'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from 'next-auth/react';

// Теперь мы храним массив фотографий
interface AnswerData {
  isOk: boolean;
  photos?: string[]; 
  comment?: string;
}

function AuditRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [actualLocationId, setActualLocationId] = useState<string | null>(null);
  const [actualChecklistId, setActualChecklistId] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [answers, setAnswers] = useState<Record<number, AnswerData>>({}); 
  
  const [isFinalStep, setIsFinalStep] = useState(false);
  const [employees, setEmployees] = useState<string[]>(['']);
  const [generalComment, setGeneralComment] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qLoc = searchParams.get('location');
    const qChk = searchParams.get('checklist');

    if (qLoc && qChk) {
      setActualLocationId(qLoc);
      setActualChecklistId(qChk);
      localStorage.setItem('last_active_audit', JSON.stringify({ loc: qLoc, chk: qChk }));
    } else {
      const meta = localStorage.getItem('last_active_audit');
      if (meta) {
        const parsed = JSON.parse(meta);
        setActualLocationId(parsed.loc);
        setActualChecklistId(parsed.chk);
      } else {
        router.replace('/audit/new');
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!actualLocationId || !actualChecklistId) return;

    const fetchDetails = async () => {
      try {
        const [locRes, checkRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/checklists')
        ]);
        const locs = await locRes.json();
        const checks = await checkRes.json();
        
        setLocation(locs.find((l: any) => l.id === actualLocationId));
        
        const foundChecklist = checks.find((c: any) => c.id === actualChecklistId);
        setChecklist(foundChecklist);
        
        if (foundChecklist?.items) {
          try {
            let parsedQuestions = typeof foundChecklist.items === 'string' ? JSON.parse(foundChecklist.items) : foundChecklist.items;

            parsedQuestions.sort((a: any, b: any) => {
              if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
              }
              const zoneA = a.zone || 'Основной раздел';
              const zoneB = b.zone || 'Основной раздел';
              if (zoneA === zoneB) return 0;
              if (zoneA === 'Основной раздел') return -1;
              if (zoneB === 'Основной раздел') return 1;
              return zoneA.localeCompare(zoneB);
            });

            setQuestions(parsedQuestions);

            const draftKey = `audit_draft_${actualLocationId}_${actualChecklistId}`;
            const metaKey = `audit_meta_${actualLocationId}_${actualChecklistId}`;
            
            const savedDraft = localStorage.getItem(draftKey);
            const savedMeta = localStorage.getItem(metaKey);
            
            if (savedMeta) {
              const parsedMeta = JSON.parse(savedMeta);
              if (parsedMeta.employees) setEmployees(parsedMeta.employees);
              if (parsedMeta.generalComment) setGeneralComment(parsedMeta.generalComment);
            }

            if (savedDraft) {
              const parsedAnswers = JSON.parse(savedDraft);
              // Миграция старых черновиков: если есть photoBase64, превращаем в массив
              Object.keys(parsedAnswers).forEach(key => {
                if (parsedAnswers[key].photoBase64 && !parsedAnswers[key].photos) {
                  parsedAnswers[key].photos = [parsedAnswers[key].photoBase64];
                  delete parsedAnswers[key].photoBase64;
                }
              });
              setAnswers(parsedAnswers);

              const answeredKeys = Object.keys(parsedAnswers).filter(k => parsedAnswers[Number(k)]?.isOk !== undefined).map(Number);
              const firstUnanswered = parsedQuestions.findIndex((_: any, idx: number) => !answeredKeys.includes(idx));
              
              if (firstUnanswered !== -1) {
                setCurrentIndex(firstUnanswered); 
              } else {
                setCurrentIndex(parsedQuestions.length - 1); 
              }
            }
          } catch (e) {
            console.error('Ошибка парсинга');
          }
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [actualLocationId, actualChecklistId]);

  useEffect(() => {
    if (actualLocationId && actualChecklistId) {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(`audit_draft_${actualLocationId}_${actualChecklistId}`, JSON.stringify(answers));
      }
      localStorage.setItem(`audit_meta_${actualLocationId}_${actualChecklistId}`, JSON.stringify({ employees, generalComment }));
      
      setSaveStatus('Черновик сохранен');
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [answers, employees, generalComment, actualLocationId, actualChecklistId]);

  const handleCancel = () => {
    const isConfirmed = window.confirm('Вы уверены, что хотите прервать аудит? Все несохраненные фото и ответы для этой точки будут безвозвратно удалены.');
    
    if (isConfirmed) {
      if (actualLocationId && actualChecklistId) {
        localStorage.removeItem(`audit_draft_${actualLocationId}_${actualChecklistId}`);
        localStorage.removeItem(`audit_meta_${actualLocationId}_${actualChecklistId}`);
      }
      localStorage.removeItem('last_active_audit');
      router.push('/audit');
    }
  };

  const handleAnswer = (isOk: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], isOk }
    }));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], comment: text }
    }));
  };

  const handleAddEmployee = () => setEmployees([...employees, '']);
  const handleRemoveEmployee = (idx: number) => setEmployees(employees.filter((_, i) => i !== idx));
  const handleEmployeeChange = (idx: number, value: string) => {
    const newEmps = [...employees];
    newEmps[idx] = value;
    setEmployees(newEmps);
  };

  // Обработка нескольких фотографий сразу
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); 
          
          setAnswers(prev => {
            const currentPhotos = prev[currentIndex]?.photos || [];
            return {
              ...prev,
              [currentIndex]: { ...prev[currentIndex], photos: [...currentPhotos, compressedBase64] }
            };
          });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Удаление конкретного фото из массива
  const handleRemovePhoto = (photoIndex: number) => {
    setAnswers(prev => {
      const currentPhotos = prev[currentIndex]?.photos || [];
      const newPhotos = currentPhotos.filter((_, idx) => idx !== photoIndex);
      return {
        ...prev,
        [currentIndex]: { ...prev[currentIndex], photos: newPhotos }
      };
    });
  };

  const firstUnansweredIndex = questions.findIndex((_, idx) => answers[idx]?.isOk === undefined);
  const isAllAnswered = firstUnansweredIndex === -1;

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (isAllAnswered) {
      setIsFinalStep(true);
    }
  };

  const handlePrev = () => {
    if (isFinalStep) {
      setIsFinalStep(false);
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleGoToUnanswered = () => {
    if (firstUnansweredIndex !== -1) setCurrentIndex(firstUnansweredIndex);
  };

  const handleSubmit = async () => {
    const validEmployees = employees.filter(e => e.trim() !== '');
    if (validEmployees.length === 0) {
      alert('Пожалуйста, укажите хотя бы одного сотрудника на смене.');
      return;
    }

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

      // Отправляем массив photos
      const answersArray = Object.entries(answers).map(([indexStr, ans]) => {
        const q = questions[Number(indexStr)];
        if (!ans.isOk) { lostPoints += (Number(q.score) || 0); }
        return {
          zone: q.zone || 'Основной раздел',
          questionText: q.text,
          isOk: ans.isOk,
          penalty: ans.isOk ? 0 : (Number(q.score) || 0),
          photos: ans.photos || [], // Передаем массив фото
          comment: ans.comment
        };
      });

      const currentScore = Math.max(0, maxScore - lostPoints);

      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          locationId: actualLocationId,
          checklistId: actualChecklistId,
          score: currentScore,
          maxScore: maxScore,
          shiftEmployees: validEmployees,
          generalComment: generalComment,
          answers: answersArray 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Ошибка сервера.');
      }

      localStorage.removeItem(`audit_draft_${actualLocationId}_${actualChecklistId}`);
      localStorage.removeItem(`audit_meta_${actualLocationId}_${actualChecklistId}`);
      localStorage.removeItem('last_active_audit');

      alert(`Аудит завершен!\nРезультат: ${currentScore} из ${maxScore} баллов`);
      router.push('/audit');
      
    } catch (err: any) {
      console.error(err);
      alert(`Произошла ошибка при отправке данных: ${err.message}\nЧерновик сохранен.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-gray-400 font-bold bg-gray-50 h-screen">Загрузка...</div>;
  if (!checklist || questions.length === 0) return <div className="flex-1 flex items-center justify-center text-red-500 font-bold h-screen">Чек-лист пуст или не найден</div>;

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  
  const answeredCount = Object.values(answers).filter(a => a.isOk !== undefined).length;
  const progressPercent = isFinalStep ? 100 : (answeredCount / questions.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white p-6 shadow-sm z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCancel}
              className="w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-gray-900 active:scale-95 transition-all"
              title="Прервать и удалить аудит"
            >
              ✕
            </button>
            <div>
              <h1 className="text-sm font-black text-gray-900 leading-tight">{location?.name || 'Загрузка...'}</h1>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1">{checklist?.title}</p>
            </div>
          </div>
          
          <div className="text-[10px] font-bold text-green-500 transition-opacity duration-300 h-4">
            {saveStatus}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-gray-400">
            {isFinalStep ? 'Завершение аудита' : `Вопрос ${currentIndex + 1} из ${questions.length}`}
          </span>
          <span className="text-blue-500">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center p-4">
        {isFinalStep ? (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col transition-all">
            <h2 className="text-xl font-black text-gray-900 mb-6">Итоги проверки</h2>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Сотрудники на смене *</label>
              <div className="space-y-3">
                {employees.map((emp, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={emp}
                      onChange={(e) => handleEmployeeChange(idx, e.target.value)}
                      placeholder="Имя Фамилия"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:border-[#F25C05] text-sm text-gray-900 font-medium transition-colors"
                    />
                    {employees.length > 1 && (
                      <button 
                        onClick={() => handleRemoveEmployee(idx)}
                        className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 bg-red-50 rounded-xl"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button 
                onClick={handleAddEmployee}
                className="mt-3 text-sm font-bold text-[#F25C05] bg-orange-50 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors"
              >
                + Добавить сотрудника
              </button>
            </div>

            <div className="mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Общий комментарий (необязательно)</label>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Замечания, похвала или впечатления от смены..."
                className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:bg-white focus:border-[#F25C05] outline-none transition-all resize-none"
                rows={4}
              />
            </div>
          </div>
        ) : (
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
              <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">{currentQ.text}</h2>
              <p className="text-xs text-gray-400 font-medium mb-4">Штраф: <span className="text-orange-500 font-bold">-{currentQ.score} б.</span></p>

              {/* Горизонтальный список фотографий */}
              {currentAnswer?.photos && currentAnswer.photos.length > 0 && (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 snap-x">
                  {currentAnswer.photos.map((photoBase64, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 w-24 h-24 snap-start">
                      <img src={photoBase64} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-white/90 backdrop-blur text-red-500 w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs shadow-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mb-6">
                <textarea
                  placeholder="Добавить комментарий к ответу..."
                  value={currentAnswer?.comment || ''}
                  onChange={handleCommentChange}
                  className="w-full p-4 rounded-2xl bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:border-[#F25C05] outline-none transition-all resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-3 mt-auto">
              <button
                onClick={() => handleAnswer(true)}
                className={`w-full py-4 rounded-2xl font-bold border-2 transition-all active:scale-95 ${currentAnswer?.isOk === true ? 'bg-green-50 border-green-500 text-green-700 shadow-lg shadow-green-500/20' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
              >
                Всё отлично
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnswer(false)}
                  className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all active:scale-95 ${currentAnswer?.isOk === false ? 'bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-500/20' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                >
                  Есть проблема
                </button>

                {/* ИСПРАВЛЕНИЕ: Убрали capture="environment", теперь телефон предложит Галерею или Камеру */}
                <input type="file" accept="image/jpeg, image/png, image/jpg, image/webp" multiple ref={fileInputRef} onChange={handlePhotoCapture} className="hidden" />
                
                <button onClick={() => fileInputRef.current?.click()} className="w-16 flex items-center justify-center bg-gray-100 text-gray-500 rounded-2xl font-bold border-2 border-transparent active:scale-95 hover:bg-gray-200 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white p-4 border-t border-gray-100 flex gap-3 z-20">
        <button 
          onClick={handlePrev}
          disabled={!isFinalStep && currentIndex === 0}
          className="px-6 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl active:scale-95 disabled:opacity-50 transition-all"
        >
          Назад
        </button>

        {isFinalStep ? (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-[#F25C05] text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:opacity-70 shadow-lg shadow-orange-500/20"
          >
            {isSubmitting ? 'Отправка...' : 'Завершить аудит'}
          </button>
        ) : currentIndex < questions.length - 1 ? (
          <button onClick={handleNext} className="flex-1 bg-black text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform">
            Далее
          </button>
        ) : isAllAnswered ? (
          <button onClick={handleNext} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20">
            К завершению
          </button>
        ) : (
          <button onClick={handleGoToUnanswered} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20">
            К пропущенному (№{firstUnansweredIndex + 1})
          </button>
        )}
      </footer>
    </div>
  );
}

export default function RunAuditPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-400 h-screen flex items-center justify-center">Загрузка...</div>}>
      <AuditRunForm />
    </Suspense>
  );
}