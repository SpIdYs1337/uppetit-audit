'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@/lib/sessionPolicy';
import { PrivacyModal } from '@/components/PrivacyModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Brand } from '@/components/Brand';
import { Button, Field, Icon, LoadingState, Notice } from '@/components/ui';

function SetupPasswordContent() {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [show, setShow] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = useSearchParams().get('token');
  const router = useRouter();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) { setError('Пароль должен содержать от 15 до 128 символов. Можно использовать длинную фразу.'); return; }
    if (password !== repeat) { setError('Пароли не совпадают.'); return; }
    if (!token) { setError('Неверная ссылка'); return; }
    if (!accepted) { setError('Необходимо принять политику'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/setup-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось установить пароль.');
      setPassword(''); setRepeat(''); router.replace('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка соединения. Попробуйте снова.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-dotted flex flex-col items-center justify-center p-4 relative">
    <div className="absolute right-5 top-5"><ThemeToggle /></div>
    <section className="ui-panel w-full max-w-[420px] p-6 sm:p-9 space-y-6"><Brand /><div><h1 className="text-2xl font-semibold tracking-tight">Установка пароля</h1><p className="ui-muted mt-2 text-sm">Придумайте пароль или длинную фразу из 15–128 символов.</p></div>
      {!token ? <Notice error>Ссылка для установки пароля отсутствует. Обратитесь к администратору за новым приглашением.</Notice> : <form onSubmit={submit} className="space-y-5">
        <Field label="Новый пароль"><div className="relative"><input className="ui-field pr-12" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><button type="button" className="absolute right-1 top-0 min-h-11 px-3 ui-muted" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow(!show)}><Icon name="eye" /></button></div></Field>
        <Field label="Повторите пароль"><input className="ui-field" type={show ? 'text' : 'password'} autoComplete="new-password" required maxLength={MAX_PASSWORD_LENGTH} value={repeat} onChange={e => setRepeat(e.target.value)} disabled={busy} /></Field>
        <div className="flex gap-3 items-start"><input id="password-policy" className="ui-checkbox mt-1" type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={busy} /><div className="text-xs ui-muted leading-relaxed"><label htmlFor="password-policy">Я принимаю условия </label><button type="button" className="underline underline-offset-4 text-orange-600 dark:text-orange-400" onClick={() => setPrivacy(true)}>Политики обработки данных</button></div></div>
        {error && <Notice error>{error}</Notice>}<Button type="submit" loading={busy} disabled={!accepted} className="w-full">Сохранить пароль</Button>
      </form>}
      <button type="button" className="ui-muted text-sm underline underline-offset-4" onClick={() => router.replace('/')}>Вернуться к входу</button>
    </section><PrivacyModal isOpen={privacy} onClose={() => setPrivacy(false)} />
  </main>;
}
export default function SetupPasswordPage() {
  return <Suspense fallback={<LoadingState />}><SetupPasswordContent /></Suspense>;
}
