'use client';

import { useState } from 'react';
import { usePagedAudits, type HistoryQuery } from '@/hooks/usePagedAudits';
import { AuditCard } from '@/components/audits/AuditCard';
import { PhotoViewer } from '@/components/audits/PhotoViewer';
import { Button, EmptyState, LoadingState, Notice, Pagination } from '@/components/ui';

export function TuLocationHistory({ locationId }: { locationId: string }) {
  const [page, setPage] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const query: HistoryQuery = { page, pageSize: 10, sort: 'desc', search: '', dateFrom: '', dateTo: '', locations: [], auditors: [], tus: [], locationId };
  const history = usePagedAudits(query, 'accessible', { loadOptions: false });
  return <div className="space-y-4">
    {photo && <PhotoViewer url={photo} onClose={() => setPhoto(null)} />}
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">История проверок · {history.total}</h3><Button variant="ghost" loading={history.isValidating} onClick={() => void history.refresh()}>Обновить</Button></div>
    {history.error ? <Notice error>{history.error}</Notice> : history.isLoading ? <LoadingState /> : history.total === 0 ? <EmptyState title="Проверок ещё не было" description="Здесь появятся аудиты этой точки, проведённые любым проверяющим." /> : <>
      <div className={history.isValidating ? 'opacity-60 pointer-events-none space-y-3' : 'space-y-3'}>{history.audits.map(audit => <AuditCard key={audit.id} audit={audit} onZoomPhoto={setPhoto} onUpdated={() => void history.refresh()} />)}</div>
      <div className={history.isValidating ? 'pointer-events-none opacity-60' : ''}><Pagination page={history.page} total={history.total} pageSize={query.pageSize} onPage={setPage} /></div>
    </>}
  </div>;
}
