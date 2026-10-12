'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import type { PublicUser, UserChanges, UserSaveResult } from '@/hooks/useUsers';
import { Button, Dialog, Field, Notice, Switch, Badge } from '@/components/ui';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

export function UserEditor({ initialData, onClose, onSave, onSaved }: {
  initialData: PublicUser | null; onClose: () => void;
  onSave: (body: UserChanges, isUpdate: boolean) => Promise<UserSaveResult>;
  onSaved: (result: UserSaveResult) => void;
}) {
  const { data: session } = useSession();
  const initial = { name: initialData?.name || '', login: initialData?.login || '', email: initialData?.email || '',
    phone: initialData?.phone || '', role: initialData?.role || 'AUDITOR' as Role, isActive: initialData?.isActive !== false };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);
  const own = initialData?.id === session?.user.id;
  const locations = [...new Map([...(initialData?.locations || []), ...(initialData?.managedLocations || [])].map(l => [l.id, l])).values()];
  function close() { if (!busy && (!dirty || window.confirm('Закрыть форму и потерять несохранённые изменения?'))) onClose(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!form.name.trim()) { setError('Укажите имя сотрудника.'); return; }
    setBusy(true);
    try {
      const result = await onSave({ ...form, id: initialData?.id, name: form.name.trim(), login: form.login.trim(), email: form.email.trim(), phone: form.phone.trim() || null }, !!initialData);
      onSaved(result); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка сохранения'); }
    finally { setBusy(false); }
  }
  return <Dialog title={initialData ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={close} drawer busy={busy}>
    <form onSubmit={submit} className="space-y-5">
      <Field label="Имя и фамилия"><input className="ui-field" autoFocus required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={busy} /></Field>
      <Field label="Логин"><input className="ui-field" required minLength={2} maxLength={200} value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} disabled={busy} /></Field>
      <Field label="Роль"><select className="ui-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} disabled={busy || own}><option value="AUDITOR">Аудитор</option><option value="TU">Территориальный управляющий</option><option value="ADMIN">Администратор</option></select></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Электронная почта"><input className="ui-field" type="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={busy} /></Field>
        <Field label="Телефон"><input className="ui-field" type="tel" maxLength={32} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={busy} /></Field>
      </div>
      <div className="ui-panel flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-semibold">Доступ в приложение</p><p className="ui-muted mt-1 text-xs">{form.isActive ? 'Сотрудник может входить' : 'Вход заблокирован'}</p></div><Switch checked={form.isActive} label="Доступ сотрудника" disabled={busy || own} onChange={() => setForm({ ...form, isActive: !form.isActive })} /></div>
      {initialData && <div className="flex flex-wrap gap-2"><Badge tone={initialData.totpEnabled ? 'success' : 'neutral'}>{initialData.totpEnabled ? 'MFA настроена' : 'MFA не настроена'}</Badge>{own && <Badge>Ваша учётная запись</Badge>}</div>}
      {initialData?.role === 'TU' && <section><h3 className="text-sm font-semibold mb-2">Назначенные точки · {locations.length}</h3><div className="flex flex-wrap gap-2">{locations.map(l => <Badge key={l.id}>{l.name}</Badge>)}</div><Link onClick={event => { if (dirty && !window.confirm('Перейти к точкам и потерять несохранённые изменения?')) event.preventDefault(); }} className="inline-block mt-3 text-sm underline underline-offset-4 text-orange-600 dark:text-orange-400" href="/admin/locations">Изменить назначения в разделе «Точки»</Link></section>}
      {error && <Notice error>{error}</Notice>}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-5" style={{ borderColor: 'var(--border)' }}><Button variant="secondary" disabled={busy} onClick={close}>Отмена</Button><Button type="submit" loading={busy}>Сохранить профиль</Button></div>
      {!initialData && <p className="ui-muted text-xs">После создания появится ссылка для установки пароля. Она действует 24 часа.</p>}
    </form>
  </Dialog>;
}
