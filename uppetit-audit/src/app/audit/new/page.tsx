'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useNewAudit } from '@/hooks/useNewAudit';
import { Badge, Button, EmptyState, Field, Icon, LoadingState, Notice, SearchInput } from '@/components/ui';

function NewAuditContent() {
  const router = useRouter();
  const params = useSearchParams();
  const backTo = params.get('backTo') === '/admin/audits' ? '/admin/audits' : '/audit';
  const audit = useNewAudit(params.get('location') || '');
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState(false);
  const locations = audit.filteredLocations.filter(l => [l.name, l.address].some(v => (v || '').toLowerCase().includes(search.trim().toLowerCase())));
  const selected = audit.filteredLocations.find(l => l.id === audit.selectedLocation);
  const checklist = audit.checklists.find(c => c.id === audit.selectedChecklist);
  function begin() {
    if (!selected || !checklist) return;
    setStarting(true);
    router.push('/audit/run?' + new URLSearchParams({ location: selected.id, checklist: checklist.id, backTo }));
  }
  return <div className="ui-page max-w-4xl space-y-5">
    <header className="ui-heading"><div><Link className="ui-muted inline-flex items-center gap-1 text-sm mb-3 hover:text-orange-600" href={backTo}><Icon name="arrow" className="h-4 w-4" />Назад</Link><h1>Новая проверка</h1><p>Выберите точку и действующий чек-лист.</p></div></header>
    {audit.error && <Notice error>Не удалось загрузить параметры проверки. <button className="underline" onClick={() => void audit.refresh()}>Повторить</button></Notice>}
    {audit.isLoading ? <LoadingState /> : !audit.error && <>
      <section className="ui-panel p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold"><span className="text-[var(--brand)] mr-2">01</span>Точка</h2>
        {audit.currentUserRole !== 'TU' && <Field label="Территория"><select className="ui-field" value={audit.selectedTu} onChange={e => audit.handleTuSelect(e.target.value)}><option value="">Все доступные точки</option>{audit.tus.map(t => <option key={t.id} value={t.id}>{t.name || t.login}</option>)}</select></Field>}
        <SearchInput placeholder="Название, код или адрес" value={search} onChange={e => setSearch(e.target.value)} />
        {audit.selectedLocation && !selected && <Notice error>Выбранная точка больше недоступна. Выберите другую.</Notice>}
        {!locations.length ? <EmptyState title="Нет доступных точек" description="Измените поиск или обратитесь к администратору." /> : <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">{locations.map(l => <button key={l.id} type="button" aria-pressed={selected?.id === l.id} onClick={() => audit.setSelectedLocation(l.id)} className={'w-full flex items-center gap-3 text-left p-3 min-h-16 rounded-xl border ' + (selected?.id === l.id ? 'border-orange-500 bg-[var(--brand-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-muted)]')}><Icon name="location" className="h-5 w-5 shrink-0 ui-muted" /><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{l.name}</span>{l.address && <span className="block text-xs mt-1 ui-muted break-words">{l.address}</span>}</span>{selected?.id === l.id && <Icon name="check" className="h-5 w-5 text-[var(--brand)] shrink-0" />}</button>)}</div>}
      </section>
      <section className="ui-panel p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold"><span className="text-[var(--brand)] mr-2">02</span>Чек-лист</h2>
        {!audit.checklists.length ? <EmptyState title="Нет доступных чек-листов" description="Администратор должен опубликовать чек-лист для вашей роли." /> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{audit.checklists.map(c => <button key={c.id} type="button" aria-pressed={checklist?.id === c.id} onClick={() => audit.setSelectedChecklist(c.id)} className={'text-left p-4 rounded-xl border ' + (checklist?.id === c.id ? 'border-orange-500 bg-[var(--brand-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-muted)]')}><span className="block font-semibold">{c.title}</span><span className="ui-muted text-xs mt-2 block">{Array.isArray(c.items) ? c.items.length : ''} вопросов</span></button>)}</div>}
      </section>
      <section className="ui-panel p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold">{selected?.name || 'Выберите точку'}</p><p className="ui-muted text-xs mt-1">{checklist?.title || 'Выберите чек-лист'}</p>{selected && checklist && <div className="mt-2"><Badge tone="success">Готово к началу</Badge></div>}</div><Button disabled={!selected || !checklist} loading={starting} onClick={begin} className="w-full sm:w-auto"><Icon name="plus" />Начать заполнение</Button></div></section>
    </>}
  </div>;
}
export default function NewAuditPage() {
  return <Suspense fallback={<LoadingState />}><NewAuditContent /></Suspense>;
}
