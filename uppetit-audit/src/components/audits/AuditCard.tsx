'use client';
import { useState } from 'react';
import type { EnrichedAudit } from '@/hooks/useAdminAudits';
import { AuditDetails } from './AuditDetails';
import { ScoreBadge } from './ScoreBadge';

export function AuditCard({ audit, onZoomPhoto, onUpdated, initiallyExpanded = false }: {
  audit: EnrichedAudit; onZoomPhoto: (url: string) => void; onUpdated?: () => void; initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 sm:p-5">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-gray-500 dark:text-zinc-400">{new Date(audit.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span className="mt-1 block break-words text-base font-black">{audit.locationName || audit.location?.name || 'Удаленная точка'}</span>
        <span className="mt-1 block text-xs text-gray-500 dark:text-zinc-400">{audit.checklist?.title} · v{audit.checklist?.version}</span>
        <span className="mt-2 block text-xs text-gray-500 dark:text-zinc-400">Аудитор: {audit.auditorName || audit.user?.login || 'Удаленный аудитор'}</span>
        <span className="mt-2 block text-xs font-bold text-[#F25C05]">{expanded ? 'Свернуть подробности ↑' : 'Ответы и фотографии ↓'}</span>
      </span>
      <span className="shrink-0 max-w-[120px] text-right"><span className="block text-lg font-semibold">{audit.score} / {audit.maxScore ?? 0}</span><span className="block text-xs text-gray-500 dark:text-zinc-400 mb-2">{audit.maxScore ? Math.round(audit.score / audit.maxScore * 100) + '%' : 'баллов'}</span><ScoreBadge audit={audit} /></span>
    </button>
    {expanded && <AuditDetails audit={audit} onZoomPhoto={onZoomPhoto} onUpdated={onUpdated} />}
  </article>;
}
