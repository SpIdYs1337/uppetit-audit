'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { readDraft } from '@/lib/draftStorage';
import { fetcher } from '@/lib/fetcher';
import { localDateInput, serializeReportRange } from '@/lib/reportDates';
import { locationIsAvailable } from '@/lib/locationAvailability';
import type { EnrichedLocation } from '@/hooks/useLocations';
import { Badge, EmptyState, Icon, LoadingState, Notice, SearchInput } from '@/components/ui';
import PushSubscribe from '@/components/PushSubscribe';

type Overview = { total: number; periodCount: number; remarks: number; avgPct: number | null; measured: number;
  recent: { id: string; date: string; score: number; maxScore: number | null; locationName: string | null; location: { name: string } | null; checklistVersion: { checklist: { title: string } }; _count: { answers: number } }[];
  plans: { id: string; date: string; locationId: string; location: { name: string; address: string | null } }[] };

export default function AuditorHome() {
  const { data: session } = useSession();
  const [draft, setDraft] = useState<{ loc: string; chk: string } | null>(null);
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const now = new Date();
  const from = new Date(now); from.setDate(now.getDate() - ((Number(period) || 30) - 1));
  const range = serializeReportRange(period === 'all' ? '' : localDateInput(from), period === 'all' ? '' : localDateInput(now));
  const today = serializeReportRange(localDateInput(now), '').from;
  const params = new URLSearchParams({ ...range, today });
  const identity = session?.user ? session.user.id + ':' + session.user.role : null;
  const overview = useSWR<Overview>(identity ? ['/api/auditor/overview?' + params, identity] : null, ([url]: [string, string]) => fetcher(url));
  const locations = useSWR<EnrichedLocation[]>(identity ? ['/api/locations', identity] : null, ([url]: [string, string]) => fetcher(url));
  useEffect(() => {
    let cancelled = false;
    if (!session?.draftKey) return;
    void readDraft<{ loc: string; chk: string }>(session.user.id, 'last-active', session.draftKey)
      .then(value => { if (!cancelled) setDraft(value?.loc && value?.chk ? value : null); })
      .catch(() => { if (!cancelled) setDraft(null); });
    return () => { cancelled = true; };
  }, [session?.user.id, session?.draftKey]);
  const available = (locations.data || []).filter(l => locationIsAvailable(l));
  const visible = available.filter(l => [l.name, l.address].some(v => (v || '').toLowerCase().includes(search.trim().toLowerCase()))).slice(0, search ? 30 : 6);
  const stats = overview.data;
  return <div className="ui-page space-y-6">
    <header className="ui-heading"><div><h1>{session?.user.name ? 'Здравствуйте, ' + session.user.name.split(' ')[0] : 'Рабочий день'}</h1><p>Начните проверку или продолжите работу с сохранённым черновиком.</p></div><Link href="/audit/new" className="ui-button ui-button-primary w-full sm:w-auto"><Icon name="plus" />Начать аудит</Link></header>
    {draft && <section className="ui-panel p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-orange-500/40"><div><Badge tone="brand">Черновик на этом устройстве</Badge><h2 className="font-semibold mt-2">Продолжить незавершённый аудит</h2><p className="ui-muted text-sm mt-1">{locations.data?.find(l => l.id === draft.loc)?.name || 'Сохранённая проверка'}</p></div><Link className="ui-button ui-button-primary w-full sm:w-auto" href="/audit/run">Продолжить</Link></section>}
    <section aria-label="Мои результаты" className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-semibold">Мои результаты</h2><div className="ui-tabs">{[['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё время']].map(([value, label]) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>
      {overview.error ? <Notice error>Не удалось загрузить результаты. <button className="underline" onClick={() => void overview.mutate()}>Повторить</button></Notice> : overview.isLoading || !stats ? <LoadingState label="Загружаем результаты…" /> : <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
        ['Всего проверок', stats.total.toLocaleString('ru')],
        ['За выбранный период', stats.periodCount.toLocaleString('ru')],
        ['Средний результат', stats.avgPct === null ? '—' : Math.round(stats.avgPct) + '%'],
        ['С замечаниями', stats.remarks.toLocaleString('ru')],
      ].map(([label, value]) => <div key={label} className="ui-panel p-4 sm:p-5"><p className="ui-muted text-xs sm:text-sm">{label}</p><p className="text-2xl sm:text-3xl font-semibold mt-2 tracking-tight">{value}</p></div>)}</div>}
      {stats && stats.measured < stats.periodCount && <p className="ui-muted text-xs">Средний процент рассчитан по {stats.measured} проверкам с известным максимальным баллом.</p>}
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="ui-panel p-4 sm:p-5 space-y-4"><div className="flex flex-wrap justify-between items-center gap-2"><h2 className="font-semibold">Доступные точки <span className="ui-muted font-normal">· {available.length}</span></h2><Link className="ui-muted text-xs underline" href="/audit/new">Все точки</Link></div><SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Точка или адрес" />
        {locations.error ? <Notice error>Не удалось загрузить точки. <button className="underline" onClick={() => void locations.mutate()}>Повторить</button></Notice> : locations.isLoading ? <LoadingState /> : !visible.length ? <EmptyState title="Нет доступных точек" description={search ? 'Измените поисковый запрос.' : 'Обратитесь к администратору, чтобы проверить назначения и период активности.'} /> : <div className="divide-y divide-[var(--border)]">{visible.map(l => <Link key={l.id} href={'/audit/new?location=' + encodeURIComponent(l.id)} className="flex items-center gap-3 py-3 rounded-lg hover:bg-[var(--surface-muted)]"><span className="shrink-0 p-2 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]"><Icon name="location" /></span><span className="min-w-0 flex-1"><span className="font-semibold text-sm block">{l.name}</span><span className="ui-muted text-xs block mt-1 break-words">{l.address || 'Адрес не указан'}</span></span><Icon name="plus" className="h-4 w-4 ui-muted shrink-0" /></Link>)}</div>}
      </section>
      <section className="ui-panel p-4 sm:p-5 space-y-4"><div className="flex justify-between items-center gap-2"><h2 className="font-semibold">Ближайшие проверки</h2><Link href="/audit/schedule" className="ui-muted text-xs underline">Мой план</Link></div>{overview.error ? <p className="ui-muted text-sm">План временно недоступен.</p> : overview.isLoading ? <LoadingState /> : !stats?.plans.length ? <EmptyState title="Плановых проверок пока нет" description="Запланировать проверку можно в разделе «План»." /> : <div className="divide-y divide-[var(--border)]">{stats.plans.map(plan => <Link key={plan.id} href={'/audit/new?location=' + encodeURIComponent(plan.locationId)} className="flex items-center gap-3 py-3 hover:bg-[var(--surface-muted)] rounded-lg"><span className="ui-muted text-xs w-16 shrink-0">{new Date(plan.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span><span className="font-semibold text-sm">{plan.location.name}</span></Link>)}</div>}</section>
    </div>
    <section className="ui-panel p-4 sm:p-5"><div className="flex justify-between items-center gap-3 mb-4"><h2 className="font-semibold">Недавние проверки</h2><Link href="/audit/history" className="ui-muted text-xs underline">Вся история</Link></div>{overview.error ? <p className="ui-muted text-sm">История временно недоступна.</p> : overview.isLoading ? <LoadingState /> : !stats?.recent.length ? <EmptyState title="За этот период проверок нет" action={<Link href="/audit/new" className="ui-button ui-button-secondary">Начать первую проверку</Link>} /> : <div className="divide-y divide-[var(--border)]">{stats.recent.map(audit => <Link href={'/audit/history?audit=' + encodeURIComponent(audit.id)} key={audit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-[var(--surface-muted)] rounded-lg"><span><span className="block text-sm font-semibold">{audit.locationName || audit.location?.name || 'Удалённая точка'}</span><span className="ui-muted block text-xs mt-1">{new Date(audit.date).toLocaleDateString('ru')} · {audit.checklistVersion.checklist.title}</span></span><span className="flex gap-2 items-center"><Badge tone={audit._count.answers ? 'warning' : 'success'}>{audit._count.answers ? 'Есть замечания' : 'Без замечаний'}</Badge><span className="text-sm font-semibold">{audit.maxScore ? Math.round(audit.score / audit.maxScore * 100) + '%' : audit.score + ' б.'}</span></span></Link>)}</div>}</section>
    <div className="flex flex-wrap gap-2"><Link className="ui-button ui-button-secondary" href="/audit/guide"><Icon name="book" />Инструкция</Link>{(session?.user.role === 'TU' || session?.user.role === 'ADMIN') && <><Link className="ui-button ui-button-secondary" href="/audit/tu"><Icon name="location" />Моя территория</Link><Link className="ui-button ui-button-secondary" href="/audit/dashboard"><Icon name="dashboard" />Аналитика территории</Link><PushSubscribe /></>}{session?.user.role === 'ADMIN' && <Link className="ui-button ui-button-secondary" href="/admin">Админ-панель</Link>}</div>
  </div>;
}
