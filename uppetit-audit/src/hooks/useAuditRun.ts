import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, useSession } from 'next-auth/react';
import { readDraft, writeDraft, removeDraft } from '@/lib/draftStorage';
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

export type ExtendedChecklist = Checklist & { activeVersionId?: string; items?: string | ChecklistItemType[] };

export interface ChecklistItemType {
  id: string;
  zone?: string;
  text: string;
  score: number;
  isCritical?: boolean;
  order?: number;
  isPhotoRequired?: boolean;
  photoRequirement?: 'OPTIONAL' | 'REQUIRED' | 'VIOLATION';
}

export function useAuditRun(actualLocationId: string | null, actualChecklistId: string | null) {
  const router = useRouter();
  const { data: session } = useSession();
  const draftName = `audit:${actualLocationId}:${actualChecklistId}`;
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftRevision, setDraftRevision] = useState(0);
  const submitted = useRef(false);

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
    if (!checklist?.items || !session?.draftKey) return;
    let cancelled = false;
    submitted.current = false;
    setDraftReady(false); setDraftError('');
    const parsedQuestions: ChecklistItemType[] = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : [...checklist.items];
    parsedQuestions.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      const zoneA = a.zone || 'Основной раздел', zoneB = b.zone || 'Основной раздел';
      return zoneA === zoneB ? 0 : zoneA === 'Основной раздел' ? -1 : zoneB === 'Основной раздел' ? 1 : zoneA.localeCompare(zoneB);
    });
    setQuestions(parsedQuestions);
    setAnswers({}); setEmployees(['']); setGeneralComment(''); setCurrentIndex(0); setIsFinalStep(false);
    void readDraft<{ versionId: string; questionIds: string[]; answers: Record<number, AnswerData>; employees: string[]; generalComment: string }>(
      session.user.id, draftName, session.draftKey
    ).then(draft => {
      if (cancelled) return;
      if (draft) {
        if (draft.versionId !== checklist.activeVersionId || JSON.stringify(draft.questionIds) !== JSON.stringify(parsedQuestions.map(q => q.id))) {
          setDraftError('Чек-лист изменился. Старый черновик нельзя отправить по новой версии. Начните новую проверку.'); return;
        }
        setAnswers(draft.answers); setEmployees(draft.employees); setGeneralComment(draft.generalComment);
        const first = parsedQuestions.findIndex((_, idx) => draft.answers[idx]?.isOk === undefined);
        setCurrentIndex(first < 0 ? Math.max(0, parsedQuestions.length - 1) : first);
      }
      setDraftReady(true);
    }).catch(() => { if (!cancelled) setDraftError('Не удалось прочитать черновик. Возможно, пароль или права доступа изменились.'); });
    return () => { cancelled = true; };
    // Published checklist versions are immutable; SWR refreshes must not reset entered answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist?.activeVersionId, actualLocationId, actualChecklistId, session?.user.id, session?.draftKey, draftRevision]);

  useEffect(() => {
    if (!draftReady || submitted.current || !session?.draftKey || !questions.length) return;
    let cancelled = false;
    void writeDraft(session.user.id, draftName, session.draftKey, {
      versionId: checklist?.activeVersionId, questionIds: questions.map(q => q.id), answers, employees, generalComment
    }).then(() => { if (!cancelled) setSaveStatus('Черновик сохранён'); })
      .catch(() => { if (!cancelled) setSaveStatus('Не удалось сохранить черновик на устройстве'); });
    return () => { cancelled = true; };
  }, [draftReady, answers, employees, generalComment, draftName, session?.user.id, session?.draftKey, questions, checklist?.activeVersionId]);
      
  const clearCurrentDraft = async () => {
    submitted.current = true; setDraftReady(false);
    if (session?.user.id) {
      await removeDraft(session.user.id, draftName);
      await removeDraft(session.user.id, 'last-active');
    }
  };
  const restartDraft = async () => {
    if (!window.confirm('Удалить старый черновик? Его ответы будут потеряны.')) return;
    if (session?.user.id) await removeDraft(session.user.id, draftName);
    setDraftRevision(value => value + 1);
  };
  const handleCancel = async () => {
    if (window.confirm('Прервать аудит и удалить черновик?')) { await clearCurrentDraft(); router.push('/audit'); }
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

  // ИСПРАВЛЕНИЕ: Теперь функция возвращает Promise<boolean>
  const handleSubmit = async (): Promise<boolean> => {
    const validEmployees = employees.filter(e => e.trim() !== '');
    if (validEmployees.length === 0) {
      alert('Укажите хотя бы одного сотрудника.');
      return false; // Останавливаем процесс, возвращаем false
    }

    setIsSubmitting(true);
    try {
      const session = await getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Ошибка авторизации');


      const answersArray = Object.entries(answers).map(([idx, ans]) => {
        const q = questions[Number(idx)];
        return {
          itemId: q.id,
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
          locationId: actualLocationId,
          checklistId: actualChecklistId,
          checklistVersionId: checklist?.activeVersionId,
          shiftEmployees: validEmployees,
          generalComment,
          answers: answersArray
        }),
      });

      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Ошибка сервера'); }

      await clearCurrentDraft().catch(() => {});

      alert('Аудит успешно завершен!');
      return true; // Возвращаем true, чтобы run.tsx понял, что можно уходить со страницы
    } catch (err: unknown) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isLoading: locLoading || chkLoading || (!!checklist && !draftReady && !draftError),
    draftError,
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
      restartDraft,
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
