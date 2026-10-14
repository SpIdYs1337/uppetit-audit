'use client';

import { useState } from 'react';
import type { EnrichedLocation } from '@/hooks/useAdminAudits';
import { TuLocationHistory } from './TuLocationHistory';
import { Icon } from '@/components/ui';

export function TuLocationCard({ loc }: { loc: EnrichedLocation }) {
  const [expanded, setExpanded] = useState(false);
  const latest = loc.audits?.[0];
  const date = latest ? new Date(latest.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return <section className="ui-panel overflow-hidden">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex w-full items-start justify-between gap-3 p-5 text-left hover:bg-[var(--surface-muted)]">
      <span className="min-w-0 flex-1"><span className="block text-lg font-bold break-words">{loc.name}</span>
        {loc.address && <span className="block ui-muted text-xs mt-1 break-words">{loc.address}</span>}
        <span className="block ui-muted text-xs mt-3">Всего проверок: {loc._count?.audits ?? 0}</span>
        <span className="block text-xs mt-1 text-[var(--brand)]">{latest ? 'Последняя проверка: ' + date : 'Проверок ещё не было'}</span>
      </span>
      <Icon name="chevron" className={'h-5 w-5 shrink-0 transition-transform ' + (expanded ? 'rotate-180' : '')} />
    </button>
    {expanded && <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:p-5"><TuLocationHistory locationId={loc.id} /></div>}
  </section>;
}
