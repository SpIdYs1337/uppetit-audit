'use client';

import { useMemo, useState } from 'react';
import { useLocations, assignedManagers, type EnrichedLocation, type LocationChanges } from '@/hooks/useLocations';
import { usePreference } from '@/hooks/usePreference';
import { LocationModal } from '@/components/locations/LocationModal';
import { ActionMenu, Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, Icon, LoadingState, Notice, Pagination, SearchInput, Switch } from '@/components/ui';

const sizes = ['25', '50', '100'] as const;
const day = (value: Date | string | null) => value ? new Date(value).toLocaleDateString('ru') : 'Без ограничения';

export default function LocationsPage() {
  const { locations, tus, isLoading, error: loadError, refresh, createLocation, updateLocation, deleteLocation, bulkUpdate } = useLocations();
  const [editor, setEditor] = useState<{ location: EnrichedLocation | null } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [manager, setManager] = useState('');
  const [sort, setSort] = useState('name');
  const [size, setSize] = usePreference('locations-size', '25', sizes);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [deleting, setDeleting] = useState<EnrichedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [bulk, setBulk] = useState<'active' | 'managers' | null>(null);
  const [bulkActive, setBulkActive] = useState(true);
  const [bulkTuIds, setBulkTuIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'ADD' | 'REPLACE'>('ADD');
  const filtered = useMemo(() => locations.filter(l => (!status || (status === 'active' ? l.isActive : !l.isActive))
    && (!manager || (manager === 'none' ? !assignedManagers(l).length : assignedManagers(l).some(t => t.id === manager)))
    && [l.name, l.address].some(v => (v || '').toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))))
    .sort((a, b) => (sort === 'status' ? Number(b.isActive) - Number(a.isActive) : 0) || a.name.localeCompare(b.name, 'ru', { numeric: true })), [locations, search, status, manager, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / Number(size))));
  const rows = filtered.slice((currentPage - 1) * Number(size), currentPage * Number(size));
  const selectedIds = selected.filter(id => locations.some(l => l.id === id));
  const pageSelected = rows.length > 0 && rows.every(l => selectedIds.includes(l.id));
  function filtersChanged() { setPage(1); setSelected([]); }
  function selectOne(id: string) {
    if (!selected.includes(id) && selectedIds.length >= 200) { setNotice({ message: 'За один раз можно изменить не больше 200 точек.', error: true }); return; }
    setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  function selectPage() {
    if (pageSelected) setSelected(previous => previous.filter(id => !rows.some(l => l.id === id)));
    else {
      const ids = [...new Set([...selectedIds, ...rows.map(l => l.id)])];
      if (ids.length > 200) { setNotice({ message: 'За один раз можно изменить не больше 200 точек.', error: true }); return; }
      setSelected(ids);
    }
  }
  async function toggle(location: EnrichedLocation) {
    setPending(previous => [...previous, location.id]);
    try { await updateLocation(location.id, { isActive: !location.isActive }); setNotice({ message: 'Активность точки сохранена.' }); }
    catch (cause) { setNotice({ message: cause instanceof Error ? cause.message : 'Сохранение не удалось. Состояние восстановлено.', error: true }); }
    finally { setPending(previous => previous.filter(id => id !== location.id)); }
  }
  async function save(data: LocationChanges, isEdit: boolean) {
    if (isEdit && editor?.location) await updateLocation(editor.location.id, data); else await createLocation(data);
    setNotice({ message: 'Точка сохранена.' });
  }
  async function remove() {
    if (!deleting) return; setBusy(true); setActionError('');
    try { await deleteLocation(deleting.id); setSelected(previous => previous.filter(id => id !== deleting.id)); setDeleting(null); setNotice({ message: 'Точка удалена. История проверок сохранена.' }); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Не удалось удалить точку.'); }
    finally { setBusy(false); }
  }
  async function saveBulk() {
    setBusy(true); setActionError('');
    try {
      const result = await bulkUpdate(selectedIds, bulk === 'active' ? { isActive: bulkActive } : { tuIds: bulkTuIds, assignmentMode: mode });
      setNotice({ message: 'Изменено точек: ' + result.count }); setBulk(null); setSelected([]);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Не удалось изменить точки.'); }
    finally { setBusy(false); }
  }
  function rowActions(location: EnrichedLocation) {
    return <div className="flex justify-end items-center"><Button variant="ghost" disabled={pending.includes(location.id)} aria-label={'Редактировать точку ' + location.name} title="Редактировать" onClick={() => setEditor({ location })}><Icon name="edit" /></Button><ActionMenu label={'Действия для точки ' + location.name}><button onClick={() => setEditor({ location })}>Редактировать точку</button><button className="text-red-600 dark:text-red-400" onClick={() => { setActionError(''); setDeleting(location); }}>Удалить точку</button></ActionMenu></div>;
  }
  function checkbox(location: EnrichedLocation) {
    return <input className="ui-checkbox" type="checkbox" aria-label={'Выбрать точку ' + location.name} checked={selectedIds.includes(location.id)} onChange={() => selectOne(location.id)} />;
  }
  return <div className="ui-page space-y-5">
    <header className="ui-heading"><div><h1>Точки</h1><p>Территории, управляющие и доступность · {locations.length} точек</p></div><Button onClick={() => setEditor({ location: null })}><Icon name="plus" />Добавить точку</Button></header>
    {notice && <Notice error={notice.error} onClose={() => setNotice(null)}>{notice.message}</Notice>}
    <section className="ui-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_150px_190px_160px] gap-3 p-4">
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); filtersChanged(); }} placeholder="Название, код или адрес" />
        <select className="ui-field" aria-label="Активность точек" value={status} onChange={e => { setStatus(e.target.value); filtersChanged(); }}><option value="">Все статусы</option><option value="active">Активные</option><option value="inactive">Неактивные</option></select>
        <select className="ui-field" aria-label="Управляющий точки" value={manager} onChange={e => { setManager(e.target.value); filtersChanged(); }}><option value="">Все управляющие</option><option value="none">Без управляющего</option>{tus.map(t => <option key={t.id} value={t.id}>{t.name || t.login}</option>)}</select>
        <select className="ui-field" aria-label="Сортировка точек" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="name">По названию</option><option value="status">Сначала активные</option></select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4"><p className="ui-muted text-sm">Найдено: {filtered.length}</p><div className="flex gap-2 items-center"><select className="ui-field !w-20" aria-label="Точек на странице" value={size} onChange={e => { setSize(e.target.value as typeof size); setPage(1); }}>{sizes.map(value => <option key={value}>{value}</option>)}</select><Button variant="secondary" onClick={() => void refresh()}>Обновить</Button></div></div>
      {selectedIds.length > 0 && <div className="flex flex-wrap gap-2 items-center mx-4 mb-4 p-3 rounded-xl bg-[var(--brand-soft)]"><strong className="text-sm mr-2">Выбрано: {selectedIds.length}</strong><Button variant="secondary" onClick={() => { setActionError(''); setBulk('active'); }}>Изменить активность</Button><Button variant="secondary" onClick={() => { setActionError(''); setMode('ADD'); setBulkTuIds([]); setBulk('managers'); }}>Назначить ТУ</Button><Button variant="ghost" onClick={() => setSelected([])}>Снять выбор</Button></div>}
      {loadError ? <div className="p-4"><Notice error>Не удалось загрузить точки. <button className="underline" onClick={() => void refresh()}>Повторить</button></Notice></div> : isLoading ? <LoadingState label="Загружаем точки…" /> : !rows.length ? <EmptyState title="Точки не найдены" description="Измените поиск или фильтры." /> : <>
        <div className="hidden xl:block overflow-x-auto"><table className="ui-table"><thead><tr><th><input type="checkbox" className="ui-checkbox" aria-label="Выбрать точки на странице" checked={pageSelected} onChange={selectPage} /></th><th>Точка / адрес</th><th>Управляющие</th><th>Период активности</th><th>Доступ</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{rows.map(location => <tr key={location.id}><td>{checkbox(location)}</td><td className="max-w-72"><button className="font-semibold text-left hover:text-orange-600" onClick={() => setEditor({ location })}>{location.name}</button><p className="ui-muted text-xs mt-1 break-words">{location.address || 'Адрес не указан'}</p></td><td className="max-w-56"><div className="flex flex-wrap gap-1">{assignedManagers(location).map(t => <Badge key={t.id}>{t.name || t.login}</Badge>)}{!assignedManagers(location).length && <span className="ui-muted text-xs">Не назначены</span>}</div></td><td className="text-xs ui-muted whitespace-nowrap"><p>{day(location.activeFrom)}</p><p className="mt-1">{location.activeTo ? 'до ' + day(location.activeTo) : 'Без даты окончания'}</p></td><td><div className="flex items-center gap-2"><Switch checked={location.isActive} label={'Точка ' + location.name + ' активна'} loading={pending.includes(location.id)} onChange={() => void toggle(location)} /><span className="ui-muted text-xs">{location.isActive ? 'Активна' : 'Выключена'}</span></div></td><td>{rowActions(location)}</td></tr>)}</tbody></table></div>
        <div className="xl:hidden"><label className="flex items-center gap-3 p-4 border-t border-[var(--border)] text-sm"><input type="checkbox" className="ui-checkbox" checked={pageSelected} onChange={selectPage} />Выбрать страницу</label>{rows.map(location => <article key={location.id} className="p-4 border-t border-[var(--border)]"><div className="flex items-start gap-3">{checkbox(location)}<div className="flex-1 min-w-0"><button className="font-semibold text-left" onClick={() => setEditor({ location })}>{location.name}</button><p className="ui-muted text-xs mt-1 break-words">{location.address || 'Адрес не указан'}</p></div>{rowActions(location)}</div><div className="flex flex-wrap gap-1 mt-3">{assignedManagers(location).map(t => <Badge key={t.id}>{t.name || t.login}</Badge>)}{!assignedManagers(location).length && <Badge>Без управляющего</Badge>}</div><div className="flex items-center justify-between gap-3 mt-4"><p className="ui-muted text-xs">{location.isActive ? 'Активна' : 'Неактивна'}{location.activeFrom || location.activeTo ? ' · ' + day(location.activeFrom) + ' — ' + day(location.activeTo) : ''}</p><Switch checked={location.isActive} label={'Точка ' + location.name + ' активна'} loading={pending.includes(location.id)} onChange={() => void toggle(location)} /></div></article>)}</div>
      </>}
      {!isLoading && !loadError && <Pagination page={currentPage} total={filtered.length} pageSize={Number(size)} onPage={setPage} />}
    </section>
    {editor && <LocationModal isOpen initialData={editor.location} onClose={() => setEditor(null)} onSave={save} tus={tus} />}
    {deleting && <ConfirmDialog title={'Удалить точку «' + deleting.name + '»?'} message="Точка и её планы будут удалены. Аудиты и фотографии сохранятся с историческим названием точки. Отменить удаление нельзя." onClose={() => setDeleting(null)} onConfirm={() => void remove()} busy={busy} error={actionError} />}
    {bulk && <Dialog title={bulk === 'active' ? 'Активность выбранных точек' : 'Назначение управляющих'} onClose={() => setBulk(null)} busy={busy}><div className="space-y-4"><Notice>Будут изменены только выбранные точки: {selectedIds.length}. Проверьте параметры перед сохранением.</Notice>
      {bulk === 'active' ? <Field label="Новая активность"><select className="ui-field" value={bulkActive ? 'on' : 'off'} onChange={e => setBulkActive(e.target.value === 'on')} disabled={busy}><option value="on">Включить точки</option><option value="off">Выключить точки</option></select></Field> : <>
        <Field label="Способ назначения"><select className="ui-field" value={mode} onChange={e => setMode(e.target.value as typeof mode)} disabled={busy}><option value="ADD">Добавить к существующим ТУ</option><option value="REPLACE">Заменить всех назначенных ТУ</option></select></Field>
        {mode === 'REPLACE' && <Notice error>Существующие назначения на выбранных точках будут заменены. Если никого не выбрать, все назначения будут сняты.</Notice>}
        <div className="ui-panel max-h-64 overflow-y-auto p-2">{tus.filter(t => t.isActive !== false).map(t => <label key={t.id} className="flex items-center gap-3 p-3 cursor-pointer"><input type="checkbox" className="ui-checkbox" checked={bulkTuIds.includes(t.id)} disabled={busy} onChange={() => setBulkTuIds(previous => previous.includes(t.id) ? previous.filter(id => id !== t.id) : [...previous, t.id])} /><span className="text-sm">{t.name || t.login}</span></label>)}</div>
      </>}
      {actionError && <Notice error>{actionError}</Notice>}<div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setBulk(null)}>Отмена</Button><Button loading={busy} disabled={bulk === 'managers' && mode === 'ADD' && !bulkTuIds.length} onClick={() => void saveBulk()}>Применить к {selectedIds.length} точкам</Button></div>
    </div></Dialog>}
  </div>;
}
