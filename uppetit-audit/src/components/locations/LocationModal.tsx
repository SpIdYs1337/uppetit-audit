'use client';

import { useState } from 'react';
import type { PublicUser } from '@/hooks/useUsers';
import { assignedManagers, type EnrichedLocation, type LocationChanges } from '@/hooks/useLocations';
import { Button, Dialog, Field, Notice, SearchInput, Switch } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

export function LocationModal({ isOpen, onClose, initialData, onSave, tus }: {
  isOpen: boolean; onClose: () => void; initialData: EnrichedLocation | null;
  onSave: (data: LocationChanges, isEdit: boolean) => Promise<void>; tus: PublicUser[];
}) {
  return isOpen ? <LocationForm initialData={initialData} onClose={onClose} onSave={onSave} tus={tus} /> : null;
}
function LocationForm({ initialData, onClose, onSave, tus }: Omit<Parameters<typeof LocationModal>[0], 'isOpen'>) {
  const initial = { name: initialData?.name || '', address: initialData?.address || '',
    isActive: initialData?.isActive !== false, activeFrom: initialData?.activeFrom ? new Date(initialData.activeFrom).toISOString().slice(0, 10) : '',
    activeTo: initialData?.activeTo ? new Date(initialData.activeTo).toISOString().slice(0, 10) : '', tuIds: initialData ? assignedManagers(initialData).map(t => t.id).sort() : [] as string[] };
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);
  const managers = [...new Map([...tus, ...(initialData ? assignedManagers(initialData).map(t => ({ ...t, role: 'TU' as const })) : [])].map(t => [t.id, t])).values()];
  function close() { if (!busy && (!dirty || window.confirm('Закрыть форму и потерять несохранённые изменения?'))) onClose(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (form.activeFrom && form.activeTo && form.activeFrom > form.activeTo) { setError('Дата окончания должна быть не раньше даты начала.'); return; }
    if (!form.name.trim()) { setError('Укажите название точки.'); return; }
    setBusy(true);
    try {
      const data: LocationChanges = { name: form.name.trim(), address: form.address.trim() || null,
        ...(!initialData || form.isActive !== initial.isActive ? { isActive: form.isActive } : {}),
        ...(!initialData || form.activeFrom !== initial.activeFrom ? { activeFrom: form.activeFrom || null } : {}),
        ...(!initialData || form.activeTo !== initial.activeTo ? { activeTo: form.activeTo || null } : {}),
        ...(!initialData || JSON.stringify(form.tuIds) !== JSON.stringify(initial.tuIds) ? { tuIds: form.tuIds } : {}),
      };
      await onSave(data, !!initialData); onClose();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось сохранить точку.'); }
    finally { setBusy(false); }
  }
  return <Dialog title={initialData ? 'Редактировать точку' : 'Новая точка'} onClose={close} drawer busy={busy}>
    <form onSubmit={submit} className="space-y-5">
      <Field label="Название / код точки"><input className="ui-field" autoFocus required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={busy} placeholder="Например: Б1" /></Field>
      <Field label="Адрес"><input className="ui-field" maxLength={1000} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={busy} /></Field>
      <div className="ui-panel flex items-center justify-between p-4 gap-3"><div><p className="text-sm font-semibold">Активность точки</p><p className="ui-muted text-xs mt-1">Проверки доступны в пределах периода</p></div><Switch checked={form.isActive} label="Точка активна" disabled={busy} onChange={() => setForm({ ...form, isActive: !form.isActive })} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Доступна с"><input className="ui-field" type="date" value={form.activeFrom} onChange={e => setForm({ ...form, activeFrom: e.target.value })} disabled={busy} /></Field><Field label="Доступна до"><input className="ui-field" type="date" min={form.activeFrom || undefined} value={form.activeTo} onChange={e => setForm({ ...form, activeTo: e.target.value })} disabled={busy} /></Field></div>
      <p className="ui-muted text-xs">Пустые даты означают отсутствие ограничения. Период относится ко всей точке.</p>
      <section className="space-y-3"><h3 className="text-sm font-semibold">Территориальные управляющие · {form.tuIds.length}</h3><SearchInput placeholder="Найти управляющего" value={search} onChange={e => setSearch(e.target.value)} /><div className="ui-panel max-h-60 overflow-y-auto p-2">{managers.filter(t => (t.name || t.login).toLowerCase().includes(search.trim().toLowerCase())).map(t => <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--surface-muted)] cursor-pointer"><input className="ui-checkbox" type="checkbox" disabled={busy} checked={form.tuIds.includes(t.id)} onChange={() => setForm({ ...form, tuIds: (form.tuIds.includes(t.id) ? form.tuIds.filter(id => id !== t.id) : [...form.tuIds, t.id]).sort() })} /><span className="text-sm">{t.name || t.login}</span></label>)}{!managers.length && <p className="ui-muted p-3 text-sm">Управляющие пока не добавлены.</p>}</div></section>
      {error && <Notice error>{error}</Notice>}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-5" style={{ borderColor: 'var(--border)' }}><Button variant="secondary" disabled={busy} onClick={close}>Отмена</Button><Button type="submit" loading={busy}>Сохранить точку</Button></div>
    </form>
  </Dialog>;
}
