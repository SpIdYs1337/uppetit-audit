'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PrivacyModal } from '@/components/PrivacyModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Field, Icon, Notice } from '@/components/ui';
import { normalizeOneTimeCode } from '@/lib/oneTimeCode';

type Challenge = { challenge: string; mfaRequired: boolean; expiresAt: number };

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  function back() { setChallenge(null); setCode(''); setPassword(''); setError(''); setRecovery(false); }
  async function finish(proof: Challenge, oneTimeCode = '') {
    const result = await signIn('credentials', { challenge: proof.challenge, code: oneTimeCode, redirect: false });
    if (!result?.ok || result.error) {
      if (Date.now() >= proof.expiresAt) { back(); throw new Error('Время подтверждения истекло. Введите логин и пароль заново.'); }
      throw new Error('Не удалось подтвердить вход. Проверьте код. После нескольких попыток подождите 15 минут.');
    }
    const session = await getSession();
    if (!session?.user) throw new Error('Не удалось открыть сессию. Попробуйте снова.');
    router.replace(session.user.mfaRequired ? '/setup-mfa' : session.user.role === 'ADMIN' ? '/admin' : '/audit');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (challenge) {
        if (Date.now() >= challenge.expiresAt) { back(); throw new Error('Время подтверждения истекло. Введите логин и пароль заново.'); }
        await finish(challenge, code);
      } else {
        const response = await fetch('/api/auth/login-challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Не удалось выполнить вход.');
        setPassword('');
        const proof = data as Challenge;
        if (proof.mfaRequired) setChallenge(proof);
        else await finish(proof);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось связаться с сервером. Попробуйте снова.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell bg-dotted">
    <div aria-hidden="true" className="auth-ambient" />
    <div className="auth-theme"><ThemeToggle /></div>
    <section className="auth-card animate-page-fade" aria-labelledby="login-title">
      <div className="auth-brand"><Image src="/logo3.png" alt="UPPETIT" width={1705} height={500} style={{ width: 220, height: 'auto' }} className="auth-logo-light dark:hidden" priority unoptimized /><Image src="/logo.jpg" alt="UPPETIT" width={1705} height={500} style={{ width: 220, height: 'auto' }} className="auth-logo-dark hidden dark:block" priority unoptimized /><p className="auth-brand-caption">Аудит качества</p></div>
      <div key={challenge ? 'mfa' : 'password'} className="animate-page-fade">
        {challenge && <div className="auth-mfa-mark"><span className="auth-shield"><Icon name="shield" className="h-6 w-6" /></span><span>Подтверждение личности</span></div>}
        <h1 id="login-title" className="auth-title">{challenge ? 'Подтверждение входа' : 'Вход в систему'}</h1>
        <p className="auth-description">{challenge ? recovery ? 'Введите один из сохранённых резервных кодов. Каждый код можно использовать один раз.' : 'Введите шестизначный код из приложения-аутентификатора. Подтверждение действует 5 минут.' : 'Войдите, чтобы проводить проверки и работать с результатами.'}</p>
        <form onSubmit={submit} className="auth-form">
          {!challenge ? <>
            <Field label="Логин или телефон"><div className="relative"><span className="auth-input-icon" aria-hidden="true"><Icon name="users" /></span><input className="ui-field auth-input auth-input-leading" autoComplete="username" required maxLength={200} value={login} onChange={e => setLogin(e.target.value)} placeholder="Введите логин" disabled={busy} /></div></Field>
            <Field label="Пароль"><div className="relative"><span className="auth-input-icon" aria-hidden="true"><Icon name="lock" /></span><input className="ui-field auth-input auth-input-leading pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="Введите пароль" disabled={busy} /><button type="button" className="auth-password-toggle" disabled={busy} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} title={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye' : 'eyeOff'} /></button></div></Field>
          </> : <Field label={recovery ? 'Резервный код' : 'Код аутентификатора'}><input key={recovery ? 'recovery' : 'totp'} autoFocus className={'ui-field auth-input auth-code font-mono ' + (recovery ? '' : '!text-center !text-2xl tracking-[.35em]')} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} required pattern={recovery ? '[a-fA-F0-9]{20}' : '[0-9]{6}'} maxLength={32} value={code} onChange={e => setCode(normalizeOneTimeCode(e.target.value).toLowerCase())} disabled={busy} placeholder={recovery ? '20 символов' : '000000'} /></Field>}
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" loading={busy} className="auth-submit w-full">{challenge ? 'Подтвердить' : 'Войти в систему'}{!busy && <Icon name="arrow" className="auth-submit-arrow h-4 w-4" />}</Button>
          {challenge && <div className="auth-mfa-actions flex flex-col gap-1"><Button variant="ghost" disabled={busy} onClick={() => { setRecovery(!recovery); setCode(''); setError(''); }}>{recovery ? 'Использовать аутентификатор' : 'Использовать резервный код'}</Button><Button variant="ghost" disabled={busy} onClick={back}><Icon name="arrow" />Вернуться к входу</Button></div>}
        </form>
      </div>
      <footer className="auth-policy"><span>Авторизуясь в системе, вы соглашаетесь с</span><button type="button" onClick={() => setPrivacy(true)}>Политикой обработки персональных данных</button></footer>
    </section>
    <p className="auth-footnote"><Icon name="shield" className="h-4 w-4" />Внутренний сервис для сотрудников</p>
    <PrivacyModal isOpen={privacy} onClose={() => setPrivacy(false)} />
  </main>;
}
