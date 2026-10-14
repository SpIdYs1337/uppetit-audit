'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePagedAudits, type HistoryQuery } from '@/hooks/usePagedAudits';
import { AuditDetails } from '@/components/audits/AuditDetails';
import { AuditCard } from '@/components/audits/AuditCard';
import { MultiSelect } from '@/components/MultiSelect';
import { PhotoViewer } from '@/components/audits/PhotoViewer';
import { ScoreBadge } from '@/components/audits/ScoreBadge';
import { localDateInput } from '@/lib/reportDates';
import { usePreference } from '@/hooks/usePreference';
import { useSession } from 'next-auth/react';

const initial: HistoryQuery = { page: 1, pageSize: 25, sort: 'desc', search: '', dateFrom: '', dateTo: '', locations: [], auditors: [], tus: [] };
const panel = 'rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';
const input = 'w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-800';
const button = 'rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800';
const sizes = ['10', '25', '50', '100'] as const;
const sorts = ['asc', 'desc'] as const;

export function AuditHistoryView({ admin = false, initialAuditId }: { admin?: boolean; initialAuditId?: string }) {
  const { data: session } = useSession();
  const territory = !admin && session?.user.role === 'TU';
  const [query, setQuery] = useState<HistoryQuery>({ ...initial, auditId: initialAuditId });
  const [pageSize, setPageSize] = usePreference('history-size', '25', sizes);
  const [sort, setSort] = usePreference('history-sort', 'desc', sorts);
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(initialAuditId || null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isExporting, setExporting] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const history = usePagedAudits({ ...query, pageSize: Number(pageSize), sort }, admin || territory ? 'accessible' : 'mine');
  const busy = history.isLoading || isDeleting;
  const filtered = Boolean(query.auditId || query.search || query.dateFrom || query.dateTo || query.locations.length || query.auditors.length || query.tus.length);
  const closePhoto = useCallback(() => setPhoto(null), []);
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(previous => previous.search === searchInput.trim() ? previous : { ...previous, search: searchInput.trim(), page: 1 }), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);
  const change = (update: Partial<HistoryQuery>) => { if (update.pageSize) setPageSize(String(update.pageSize) as typeof pageSize); if (update.sort) setSort(update.sort); setQuery(previous => ({ ...previous, ...update, page: 1 })); setExpanded(null); setActionError(''); };
  const goTo = (page: number) => { setQuery(previous => ({ ...previous, page })); setExpanded(null); };
  const reset = () => { setQuery(initial); setSearchInput(''); setExpanded(null); setActionError(''); if (initialAuditId) window.history.replaceState(null, '', window.location.pathname); };
  const preset = (days: number | null) => { const end = new Date(); const start = new Date(); if (days) start.setDate(end.getDate() - days + 1); change({ dateFrom: days ? localDateInput(start) : '', dateTo: days ? localDateInput(end) : '', auditId: undefined }); };
  const exportExcel = async () => {
    setExporting(true); setActionError('');
    try {
      const response = await fetch('/api/audits/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: history.filters, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Не удалось сформировать Excel'); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = `${admin ? 'Аудиты' : territory ? 'Аудиты_моих_точек' : 'Мои_аудиты'}.xlsx`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Не удалось сформировать Excel'); }
    finally { setExporting(false); }
  };
  const remove = async (id?: string) => {
    if (!window.confirm(id ? 'Удалить этот аудит и его фотографии? Действие нельзя отменить.' : 'Удалить всю историю аудитов и фотографии, включая записи вне выбранных фильтров?')) return;
    if (!id && !window.confirm('Подтвердите полное удаление истории. Это действие нельзя отменить.')) return;
    setDeleting(true); setActionError('');
    try { if (id) await history.deleteAudit(id); else await history.clearHistory(); setExpanded(null); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Не удалось удалить аудит'); }
    finally { setDeleting(false); }
  };
  const pagination = <nav aria-label="Страницы истории" className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">На странице<select aria-label="Аудитов на странице" value={Number(pageSize)} onChange={event => change({ pageSize: Number(event.target.value) })} className="rounded-lg bg-gray-50 px-2 py-2 font-bold text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">{[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
    <p className="text-sm font-medium" aria-live="polite">Страница {history.page} из {history.totalPages}</p>
    <div className="flex gap-2">
      <button type="button" className={button} aria-label="Первая страница" disabled={busy || history.page === 1} onClick={() => goTo(1)}>«</button>
      <button type="button" className={button} disabled={busy || history.page === 1} onClick={() => goTo(history.page - 1)}>Назад</button>
      <button type="button" className={button} disabled={busy || history.page >= history.totalPages} onClick={() => goTo(history.page + 1)}>Далее</button>
      <button type="button" className={button} aria-label="Последняя страница" disabled={busy || history.page >= history.totalPages} onClick={() => goTo(history.totalPages)}>»</button>
    </div>
  </nav>;
  return <div className="relative mx-auto w-full max-w-7xl space-y-5 p-4 pb-20 sm:p-6 md:p-8">
    {photo && <PhotoViewer url={photo} onClose={closePhoto} />}
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>{!admin && <Link href="/audit" className="mb-3 inline-block text-sm font-bold text-[#F25C05]">← На главную</Link>}<h1 className="text-2xl font-black tracking-tight md:text-3xl">{admin ? 'История проверок' : territory ? 'Проверки моих точек' : 'Мои проверки'}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400" aria-live="polite">{history.isLoading ? 'Загружаем историю…' : history.error ? 'История временно недоступна' : <>{filtered ? 'Найдено' : 'Всего'} аудитов: <strong className="text-gray-900 dark:text-zinc-100">{history.total.toLocaleString('ru-RU')}</strong>{history.total > 0 && <> · показаны {(history.page - 1) * Number(pageSize) + 1}–{Math.min(history.page * Number(pageSize), history.total)}</>}</>}</p>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={() => history.refresh()}>Обновить</button><button type="button" onClick={exportExcel} disabled={busy || isExporting || Boolean(history.error) || !history.total || searchInput.trim() !== query.search} className={`${button} text-green-700 dark:text-green-400`}>{isExporting ? 'Формируем Excel…' : 'Выгрузить все найденные'}</button></div>
    </header>
    <section aria-label="Фильтры истории" className={`${panel} relative z-20 space-y-4`}>
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Поиск и фильтры</h2>{(filtered || searchInput) && <button type="button" className="text-sm font-bold text-[#F25C05]" onClick={reset}>Сбросить всё</button>}</div>
      <input className={input} type="search" maxLength={200} aria-label="Поиск по истории" placeholder="Точка, аудитор, ТУ или чек-лист" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
      {query.auditId && <p className="text-sm text-orange-600 dark:text-orange-400">Открыта выбранная проверка. <button className="underline" onClick={reset}>Показать всю историю</button></p>}
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => preset(7)}>7 дней</button><button className={button} onClick={() => preset(30)}>30 дней</button><button className={button} onClick={() => preset(null)}>Всё время</button></div>
      <div className={`grid gap-3 sm:grid-cols-2 ${admin ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <label className="space-y-1 text-xs font-bold text-gray-500 dark:text-zinc-400">С даты<input type="date" className={input} value={query.dateFrom} max={query.dateTo || undefined} onChange={event => change({ dateFrom: event.target.value })} /></label>
        <label className="space-y-1 text-xs font-bold text-gray-500 dark:text-zinc-400">По дату<input type="date" className={input} value={query.dateTo} min={query.dateFrom || undefined} onChange={event => change({ dateTo: event.target.value })} /></label>
        <div className="self-end"><MultiSelect label="Точки" options={history.options.locations} selected={query.locations} onChange={locations => change({ locations })} /></div>
        <div className="self-end"><MultiSelect label="Аудиторы" options={history.options.auditors} selected={query.auditors} onChange={auditors => change({ auditors })} /></div>
        {admin && <div className="self-end"><MultiSelect label="ТУ" options={history.options.tus} selected={query.tus} onChange={tus => change({ tus })} /></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400"><span>Фильтры применяются ко всей истории. Excel включает все найденные аудиты.</span><label className="flex items-center gap-2">Порядок<select aria-label="Порядок аудитов" className="rounded-lg bg-gray-50 p-2 font-bold dark:bg-zinc-800" value={sort} onChange={event => change({ sort: event.target.value as 'asc' | 'desc' })}><option value="desc">Сначала новые</option><option value="asc">Сначала старые</option></select></label></div>
      {history.optionsError && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">Списки фильтров не загрузились. Можно использовать поиск и период.</p>}
    </section>
    {(history.error || actionError) && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span>{history.error || actionError}</span><button type="button" className="font-bold" onClick={() => { setActionError(''); void history.refresh(); }}>Повторить</button></div>}
    {pagination}
    {history.isLoading ? <div role="status" className={`${panel} py-12 text-center text-gray-500 dark:text-zinc-400`}>Загружаем аудиты…</div> : !history.error && !history.audits.length ? <div className={`${panel} py-12 text-center`}><h2 className="font-bold">{filtered ? 'Ничего не найдено' : 'Проверок пока нет'}</h2><p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">{filtered ? 'Измените период или сбросьте фильтры.' : 'Здесь появятся завершённые аудиты.'}</p></div> : !history.error && <>
      <div className="space-y-3 xl:hidden">{history.audits.map(audit => <div key={audit.id}><AuditCard initiallyExpanded={query.auditId === audit.id} audit={audit} onZoomPhoto={setPhoto} onUpdated={() => history.refresh()} />{admin && <button type="button" className="mt-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-40 dark:text-red-400" disabled={isDeleting} onClick={() => remove(audit.id)}>Удалить аудит</button>}</div>)}</div>
      <div className="hidden overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 xl:block"><table className="w-full text-left text-sm"><caption className="sr-only">История аудитов</caption><thead className="bg-gray-50 text-xs text-gray-500 dark:bg-zinc-800/50 dark:text-zinc-400"><tr>{['Дата', 'Точка / чек-лист', 'Аудитор', 'ТУ', 'Результат', 'Действия'].map(name => <th key={name} className="px-4 py-4 font-bold">{name}</th>)}</tr></thead><tbody>{history.audits.map(audit => <Fragment key={audit.id}>
        <tr className="border-t border-gray-100 align-top dark:border-zinc-800">
          <td className="p-4 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400">{new Date(audit.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td className="max-w-72 p-4"><button type="button" className="text-left font-bold hover:text-[#F25C05]" aria-expanded={expanded === audit.id} onClick={() => setExpanded(expanded === audit.id ? null : audit.id)}>{audit.locationName || audit.location?.name || 'Удаленная точка'}</button><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{audit.checklist?.title} · v{audit.checklist?.version}</p></td>
          <td className="p-4">{audit.auditorName || audit.user?.login}</td><td className="max-w-48 p-4 text-xs text-gray-500 dark:text-zinc-400">{audit.tuName || audit.location?.tus?.map(t => t.name || t.login).join(', ') || 'Не был назначен'}</td>
          <td className="p-4 whitespace-nowrap"><strong>{audit.score} / {audit.maxScore ?? 0} б.</strong><div className="mt-2"><ScoreBadge audit={audit} /></div><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{audit.maxScore ? `${Math.round(audit.score / audit.maxScore * 100)}%` : 'Нет максимального балла'}</p></td>
          <td className="p-4"><button type="button" className="text-xs font-bold text-[#F25C05]" onClick={() => setExpanded(expanded === audit.id ? null : audit.id)} aria-expanded={expanded === audit.id}>{expanded === audit.id ? 'Свернуть' : 'Подробнее'}</button>{admin && <button type="button" className="mt-3 block text-xs font-bold text-red-600 disabled:opacity-40 dark:text-red-400" disabled={isDeleting} onClick={() => remove(audit.id)}>Удалить</button>}</td>
        </tr>{expanded === audit.id && <tr><td colSpan={6}><AuditDetails audit={audit} onZoomPhoto={setPhoto} onUpdated={() => history.refresh()} /></td></tr>}
      </Fragment>)}</tbody></table></div>
    </>}
    {history.totalPages > 1 && pagination}
    {admin && <details className="text-sm text-gray-500 dark:text-zinc-400"><summary className="cursor-pointer py-3">Действия с историей</summary><button type="button" className="rounded-xl border border-red-200 px-4 py-3 font-bold text-red-600 disabled:opacity-40 dark:border-red-900 dark:text-red-400" disabled={busy} onClick={() => remove()}>Удалить всю историю и фотографии</button></details>}
  </div>;
}
