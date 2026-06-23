import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { uploadAuditPhoto } from '@/lib/uploadPhoto';
import { Location, Checklist } from '@prisma/client';

interface AnswerData {
  isOk: boolean;
  photos?: string[];
  comment?: string;
  photoBase64?: string;
}

export type ExtendedChecklist = Checklist & { items?: string | ChecklistItemType[] };

export interface ChecklistItemType {
  id: string;
  zone?: string;
  text: string;
  score: number;
  isCritical?: boolean;
  order?: number;
  isPhotoRequired?: boolean;
}

export function useAuditRun(actualLocationId: string | null, actualChecklistId: string | null) {
  const router = useRouter();

  const { data: locations, isLoading: locLoading } = useSWR<Location[]>('/api/locations', fetcher);
  const { data: checklists, isLoading: chkLoading } = useSWR<ExtendedChecklist[]>('/api/checklists', fetcher);

  const location = locations?.find((l) => l.id === actualLocationId);
  const checklist = checklists?.find((c) => c.id === actualChecklistId);

  const [questions, setQuestions] = useState<ChecklistItemType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerData>>({});
  
  const [isFinalStep, setIsFinalStep] = useState(false);
  const [employees, setEmployees] = useState<string[]>(['']);
  const [generalComment, setGeneralComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!checklist?.items) return;

    const parsedQuestions: ChecklistItemType[] = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
    parsedQuestions.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      const zoneA = a.zone || 'Основной раздел';
      const zoneB = b.zone || 'Основной раздел';
      if (zoneA === zoneB) return 0;
      if (zoneA === 'Основной раздел') return -1;
      if (zoneB === 'Основной раздел') return 1;
      return zoneA.localeCompare(zoneB);
    });

    setQuestions(parsedQuestions);

    if (actualLocationId && actualChecklistId) {
      const draftKey = `audit_draft_${actualLocationId}_${actualChecklistId}`;
      const metaKey = `audit_meta_${actualLocationId}_${actualChecklistId}`;
      
      const savedMeta = localStorage.getItem(metaKey);
      if (savedMeta) {
        const parsedMeta = JSON.parse(savedMeta);
        if (parsedMeta.employees) setEmployees(parsedMeta.employees);
        if (parsedMeta.generalComment) setGeneralComment(parsedMeta.generalComment);
      }

      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsedAnswers = JSON.parse(savedDraft);
        Object.keys(parsedAnswers).forEach(key => {
          if (parsedAnswers[key].photoBase64 && !parsedAnswers[key].photos) {
            parsedAnswers[key].photos = [parsedAnswers[key].photoBase64];
            delete parsedAnswers[key].photoBase64;
          }
        });
        setAnswers(parsedAnswers);

        const answeredKeys = Object.keys(parsedAnswers).filter(k => parsedAnswers[Number(k)]?.isOk !== undefined).map(Number);
        const firstUnanswered = parsedQuestions.findIndex((_, idx) => !answeredKeys.includes(idx));
        setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : parsedQuestions.length - 1);
      }
    }
  }, [checklist, actualLocationId, actualChecklistId]);

  useEffect(() => {
    if (actualLocationId && actualChecklistId && Object.keys(answers).length > 0) {
      localStorage.setItem(`audit_draft_${actualLocationId}_${actualChecklistId}`, JSON.stringify(answers));
      localStorage.setItem(`audit_meta_${actualLocationId}_${actualChecklistId}`, JSON.stringify({ employees, generalComment }));
      
      setSaveStatus('Черновик сохранен');
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [answers, employees, generalComment, actualLocationId, actualChecklistId]);

  const handleCancel = () => {
    if (window.confirm('Прервать аудит? Все несохраненные фото будут удалены.')) {
      if (actualLocationId && actualChecklistId) {
        localStorage.removeItem(`audit_draft_${actualLocationId}_${actualChecklistId}`);
        localStorage.removeItem(`audit_meta_${actualLocationId}_${actualChecklistId}`);
      }
      localStorage.removeItem('last_active_audit');
      router.push('/audit');
    }
  };

  const handleAnswer = (isOk: boolean) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: { ...prev[currentIndex], isOk } }));
  };

  const handleCommentChange = (text: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: { ...prev[currentIndex], comment: text } }));
  };

  const handleEmployeeChange = (idx: number, value: string) => {
    const newEmps = [...employees];
    newEmps[idx] = value;
    setEmployees(newEmps);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadPromises = files.map(file => uploadAuditPhoto(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length > 0) {
        setAnswers(prev => ({
          ...prev,
          [currentIndex]: { 
            ...prev[currentIndex], 
            photos: [...(prev[currentIndex]?.photos || []), ...validUrls] 
          }
        }));
      } else {
        alert('Не удалось загрузить фотографии.');
      }
    } catch {
      alert('Произошла ошибка при загрузке фото.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { 
        ...prev[currentIndex], 
        photos: (prev[currentIndex]?.photos || []).filter((_, idx) => idx !== photoIndex) 
      }
    }));
  };

  const firstUnansweredIndex = questions.findIndex((_, idx) => answers[idx]?.isOk === undefined);
  const isAllAnswered = firstUnansweredIndex === -1;

  const handleSubmit = async () => {
    const validEmployees = employees.filter(e => e.trim() !== '');
    if (validEmployees.length === 0) return alert('Укажите хотя бы одного сотрудника.');

    setIsSubmitting(true);
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Ошибка авторизации');

      const maxScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      let lostPoints = 0;

      const answersArray = Object.entries(answers).map(([idx, ans]) => {
        const q = questions[Number(idx)];
        if (!ans.isOk) lostPoints += (Number(q.score) || 0);
        return {
          zone: q.zone || 'Основной раздел',
          questionText: q.text,
          isOk: ans.isOk,
          penalty: ans.isOk ? 0 : (Number(q.score) || 0),
          photos: ans.photos || [],
          comment: ans.comment
        };
      });

      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          locationId: actualLocationId,
          checklistId: actualChecklistId,
          score: Math.max(0, maxScore - lostPoints),
          maxScore,
          shiftEmployees: validEmployees,
          generalComment,
          answers: answersArray
        }),
      });

      if (!res.ok) throw new Error('Ошибка сервера');

      localStorage.removeItem(`audit_draft_${actualLocationId}_${actualChecklistId}`);
      localStorage.removeItem(`audit_meta_${actualLocationId}_${actualChecklistId}`);
      localStorage.removeItem('last_active_audit');

      alert('Аудит успешно завершен!');
      router.push('/audit');
    } catch (err: unknown) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isLoading: locLoading || chkLoading,
    location,
    checklist,
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    isFinalStep,
    setIsFinalStep,
    employees,
    setEmployees,
    handleEmployeeChange,
    generalComment,
    setGeneralComment,
    isSubmitting,
    isUploadingPhoto,
    saveStatus,
    fileInputRef,
    firstUnansweredIndex,
    isAllAnswered,
    handlers: {
      handleCancel,
      handleAnswer,
      handleCommentChange,
      handlePhotoCapture,
      handleRemovePhoto,
      handleSubmit,
      handleNext: () => currentIndex < questions.length - 1 ? setCurrentIndex(prev => prev + 1) : (isAllAnswered && setIsFinalStep(true)),
      handlePrev: () => isFinalStep ? setIsFinalStep(false) : (currentIndex > 0 && setCurrentIndex(prev => prev - 1)),
      handleGoToUnanswered: () => firstUnansweredIndex !== -1 && setCurrentIndex(firstUnansweredIndex),
      handleJumpToEnd: () => setIsFinalStep(true),
      handleGoToQuestion: (idx: number) => {
        setIsFinalStep(false);
        setCurrentIndex(idx);
      }
    }
  };
}