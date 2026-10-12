'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useUsers, type PublicUser, type UserSaveResult } from '@/hooks/useUsers';
import { usePreference } from '@/hooks/usePreference';
import { UserEditor } from '@/components/users/UserEditor';
import { ActionMenu, Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, Icon, LoadingState, Notice, Pagination, SearchInput } from '@/components/ui';

export type EnrichedUser = PublicUser;
const roles = { ADMIN: 'Администратор', TU: 'ТУ', AUDITOR: 'Аудитор' };
const views = ['table', 'cards'] as const;
const sizes = ['25', '50', '100'] as const;
type Action = { user: PublicUser; type: 'delete' | 'reset' | 'revoke' | 'block' | 'invite' };

export default function AdminUsersPage() {
  const { users, isLoading, error: loadError, refresh, saveUser, deleteUser, resetPassword } = useUsers();
  const { data: session } = useSession();
  const [editor, setEditor] = useState<{ user: PublicUser | null } | null>(null);
  const [tab, setTab] = useState('employees');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = usePreference('users-view', 'table', views);
  const [size, setSize] = usePreference('users-size', '25', sizes);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [link, setLink] = useState<{ url: string; title: string; expires?: string } | null>(null);
  const employees = users.filter(u => u.hasPassword).length;
  const filtered = useMemo(() => users.filter(u =>
    (tab === 'employees' ? u.hasPassword : !u.hasPassword)
    && (!role || u.role === role)
    && (!status || (status === 'active' ? u.isActive !== false : u.isActive === false))
    && [u.name, u.login, u.email, u.phone].some(v => (v || '').toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')))),
  [users, tab, role, status, search]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / Number(size))));
  const rows = filtered.slice((currentPage - 1) * Number(size), currentPage * Number(size));
  function startAction(user: PublicUser, type: Action['type']) { setActionError(''); setAction({ user, type }); }
  function saved(result: UserSaveResult) {
    setNotice('Профиль сотрудника сохранён.');
    if (result.inviteToken) setLink({ url: window.location.origin + '/setup-password?token=' + encodeURIComponent(result.inviteToken), title: 'Приглашение сотрудника', expires: result.inviteExpiresAt || undefined });
  }
  async function confirmAction() {
    if (!action) return; setBusy(true); setActionError('');
    try {
      let result: UserSaveResult = {};
      if (action.type === 'delete') await deleteUser(action.user.id);
      else if (action.type === 'reset') result = await resetPassword(action.user.id);
      else result = await saveUser({ id: action.user.id, ...(action.type === 'invite' ? { reissueInvite: true } : action.type === 'revoke' ? { revokeSessions: true } : { isActive: action.user.isActive === false }) }, true);
      if (result.token) setLink({ url: window.location.origin + '/setup-password?token=' + encodeURIComponent(result.token), title: action.type === 'reset' ? 'Установка нового пароля' : 'Новое приглашение', expires: result.expiresAt });
      setNotice('Изменения сохранены.'); setAction(null);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие'); }
    finally { setBusy(false); }
  }
  function actions(user: PublicUser) {
    const own = user.id === session?.user.id;
    return <div className="flex items-center justify-end gap-1"><Button variant="ghost" onClick={() => setEditor({ user })} aria-label={'Редактировать ' + (user.name || user.login)} title="Редактировать"><Icon name="edit" /></Button><ActionMenu label={'Действия для ' + user.login}>
      <button onClick={() => setEditor({ user })}>Редактировать профиль</button>
      {!user.hasPassword && <button onClick={() => startAction(user, 'invite')}>Выпустить приглашение</button>}
      {user.hasPassword && <button onClick={() => startAction(user, 'reset')}>Сбросить пароль</button>}
      <button onClick={() => startAction(user, 'revoke')}>Завершить сеансы</button>
      <button disabled={own} onClick={() => startAction(user, 'block')}>{user.isActive === false ? 'Разблокировать' : 'Заблокировать'}</button>
      <button disabled={own} className="text-red-600 dark:text-red-400" onClick={() => startAction(user, 'delete')}>{user.hasPassword ? 'Удалить сотрудника' : 'Отменить приглашение'}</button>
    </ActionMenu></div>;
  }
  const title = action ? ({ delete: 'Удалить запись?', reset: 'Сбросить пароль?', revoke: 'Завершить сеансы?', block: action.user.isActive === false ? 'Открыть доступ?' : 'Заблокировать сотрудника?', invite: 'Новое приглашение?' })[action.type] : '';
  const message = action ? action.type === 'delete' ? 'Сотрудник будет удалён, его планы удалятся. Аудиты сохранятся с историческим именем автора. Отменить это действие нельзя.'
    : action.type === 'reset' ? 'Текущий пароль перестанет работать, сеансы будут завершены. Появится ссылка установки пароля на 15 минут. Привязка MFA сохраняется.'
    : action.type === 'invite' ? 'Предыдущая ссылка перестанет работать. Новая ссылка будет показана после подтверждения.'
    : action.type === 'revoke' ? 'Сотрудник выйдет из приложения на всех устройствах. Данные проверок сохранятся.'
    : action.user.isActive === false ? 'Сотрудник сможет снова входить в приложение.' : 'Вход сотрудника будет заблокирован, все его сеансы завершатся.' : '';
  return <div className="ui-page space-y-5">
    <header className="ui-heading"><div><h1>Сотрудники</h1><p>Доступ, роли и приглашения · {users.length} записей</p></div><Button onClick={() => setEditor({ user: null })}><Icon name="plus" />Добавить сотрудника</Button></header>
    {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="ui-tabs"><button aria-pressed={tab === 'employees'} onClick={() => { setTab('employees'); setPage(1); }}>Сотрудники · {employees}</button><button aria-pressed={tab === 'invites'} onClick={() => { setTab('invites'); setPage(1); }}>Приглашения · {users.length - employees}</button></div>
      <div className="flex gap-2"><div className="ui-tabs hidden lg:flex"><button aria-pressed={view === 'table'} onClick={() => setView('table')}>Таблица</button><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Карточки</button></div><Button variant="secondary" onClick={() => void refresh()}>Обновить</Button></div>
    </div>
    <section className="ui-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_180px_180px_100px] gap-3 p-4">
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Имя, логин, почта или телефон" />
        <select className="ui-field" aria-label="Роль сотрудника" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">Все роли</option>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="ui-field" aria-label="Статус сотрудника" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Все статусы</option><option value="active">Активные</option><option value="blocked">Заблокированные</option></select>
        <select className="ui-field" aria-label="Строк на странице" value={size} onChange={e => { setSize(e.target.value as typeof size); setPage(1); }}>{sizes.map(value => <option key={value}>{value}</option>)}</select>
      </div>
      {loadError ? <div className="p-4"><Notice error>Не удалось загрузить сотрудников. <button className="underline" onClick={() => void refresh()}>Повторить</button></Notice></div> : isLoading ? <LoadingState label="Загружаем сотрудников…" /> : !rows.length ? <EmptyState title="Сотрудники не найдены" description="Измените поиск или фильтры." /> : <>
        {view === 'table' && <div className="hidden lg:block overflow-x-auto"><table className="ui-table"><thead><tr><th>Сотрудник</th><th>Контакты</th><th>Роль / точки</th><th>Доступ</th><th><span className="sr-only">Действия</span></th></tr></thead><tbody>{rows.map(user => {
          const points = new Set([...(user.locations || []), ...(user.managedLocations || [])].map(l => l.id)).size;
          return <tr key={user.id}><td><button className="text-left font-semibold hover:text-orange-600" onClick={() => setEditor({ user })}>{user.name || user.login}</button><p className="ui-muted mt-1 text-xs">@{user.login}</p></td><td className="max-w-56 break-words"><p>{user.email || '—'}</p><p className="ui-muted mt-1 text-xs">{user.phone || 'Телефон не указан'}</p></td><td><Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>{roles[user.role]}</Badge>{user.role === 'TU' && <p className="ui-muted mt-1 text-xs">{points} точек</p>}</td><td><Badge tone={user.isActive === false ? 'danger' : 'success'}>{user.isActive === false ? 'Заблокирован' : 'Активен'}</Badge>{!user.hasPassword && <p className="ui-muted mt-1 text-xs">{user.inviteExpiresAt ? 'Ссылка до ' + new Date(user.inviteExpiresAt).toLocaleDateString('ru') : 'Ссылка не выдана'}</p>}</td><td>{actions(user)}</td></tr>;
        })}</tbody></table></div>}
        <div className={view === 'table' ? 'lg:hidden divide-y divide-[var(--border)]' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4'}>{rows.map(user => <article key={user.id} className={view === 'table' ? 'p-4' : 'ui-panel p-4'}><div className="flex justify-between items-start gap-2"><div className="min-w-0"><button className="text-left font-semibold break-words" onClick={() => setEditor({ user })}>{user.name || user.login}</button><p className="ui-muted text-xs mt-1">@{user.login}</p></div>{actions(user)}</div><div className="flex flex-wrap gap-2 mt-3"><Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>{roles[user.role]}</Badge><Badge tone={user.isActive === false ? 'danger' : 'success'}>{user.isActive === false ? 'Заблокирован' : 'Активен'}</Badge></div><p className="ui-muted text-xs mt-3 break-words">{[user.email, user.phone].filter(Boolean).join(' · ') || 'Контакты не указаны'}</p></article>)}</div>
      </>}
      {!isLoading && !loadError && <Pagination page={currentPage} total={filtered.length} pageSize={Number(size)} onPage={setPage} />}
    </section>
    <a className="ui-muted text-sm underline underline-offset-4" href="/setup-mfa">Настройки моего аутентификатора</a>
    {editor && <UserEditor initialData={editor.user} onClose={() => setEditor(null)} onSave={saveUser} onSaved={saved} />}
    {action && <ConfirmDialog title={title} message={message} onClose={() => setAction(null)} onConfirm={() => void confirmAction()} busy={busy} error={actionError} />}
    {link && <Dialog title={link.title} onClose={() => setLink(null)}><div className="space-y-4"><Notice>Передайте ссылку сотруднику лично. После закрытия этого окна получить её снова нельзя.</Notice><Field label="Ссылка установки пароля"><input readOnly className="ui-field" value={link.url} onFocus={e => e.target.select()} /></Field>{link.expires && <p className="ui-muted text-xs">Действует до {new Date(link.expires).toLocaleString('ru')}</p>}<Button onClick={async () => { try { await navigator.clipboard.writeText(link.url); setNotice('Ссылка скопирована.'); } catch { setNotice('Не удалось скопировать. Выделите ссылку и скопируйте вручную.'); } }}>Скопировать ссылку</Button></div></Dialog>}
  </div>;
}
