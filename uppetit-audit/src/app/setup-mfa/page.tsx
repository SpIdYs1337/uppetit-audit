'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { secureSignOut } from '@/lib/clientSignOut';
import { MfaEnrollmentQr } from '@/components/MfaEnrollmentQr';
import { ThemeToggle } from '@/components/ThemeToggle';
import { normalizeOneTimeCode } from '@/lib/oneTimeCode';

export default function SetupMfaPage() {
  const { data: session, update } = useSession();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codeErrorTime, setCodeErrorTime] = useState('');

  async function submit(action: 'start' | 'confirm') {
    setBusy(true); setError(''); setCodeErrorTime('');
    try {
      const response = await fetch('/api/mfa', { method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, password, code }) });
      const data = await response.json();
      if (!response.ok && typeof data.serverTime === 'string') setCodeErrorTime(data.serverTime);
      if (!response.ok) throw new Error(data.error || 'Не удалось настроить защиту');
      setCode('');
      if (action === 'start') { setSecret(data.secret); setAccount(data.account); setIssuer(data.issuer); }
      else { setRecoveryCodes(data.recoveryCodes); setSecret(''); setPassword(''); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Ошибка соединения'); }
    finally { setBusy(false); }
  }

  function downloadCodes() {
    const blob = new Blob([`UPPETIT Audit — резервные коды\nКаждый код используется один раз. Храните отдельно от устройства.\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'uppetit-recovery-codes.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (session?.user.role !== 'ADMIN') return <p className="p-8">Настройка доступна администраторам.</p>;
  return <main className="min-h-screen bg-dotted bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4 sm:p-6 relative">
    <section className="ui-panel w-full max-w-lg p-5 sm:p-6 space-y-5"><div className="flex justify-end"><ThemeToggle /></div>
      <h1 className="text-2xl font-bold">Двухфакторный вход</h1>
      {recoveryCodes.length ? <>
        <p>Защита включена. Сохраните резервные коды: они понадобятся при потере телефона. Каждый код действует один раз и показывается только сейчас.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm select-all">{recoveryCodes.map(value => <code key={value}>{value}</code>)}</div>
        <button className="underline" onClick={downloadCodes}>Скачать коды</button>
        <label className="flex gap-3"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} />Я сохранил коды в безопасном месте</label>
        <button disabled={!saved || busy} className="w-full bg-orange-600 text-white rounded-xl p-3 disabled:opacity-40" onClick={async () => {
          setBusy(true);
          try { await update(); window.location.replace('/admin/users'); }
          catch { setError('Не удалось обновить сессию. Сохраните коды и войдите заново.'); setBusy(false); }
        }}>Продолжить</button>
      </> : <>
        <p>{session.user.mfaRequired ? 'Для доступа администратора требуется приложение-аутентификатор.' : 'Здесь можно заменить аутентификатор и получить новые резервные коды.'}</p>
        <label className="block">Текущий пароль<input autoComplete="current-password" type="password" maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-3" /></label>
        {!secret && <>
          {!session.user.mfaRequired && <label className="block">Код текущего аутентификатора или резервный код<input autoComplete="one-time-code" maxLength={32} value={code} onChange={e => setCode(normalizeOneTimeCode(e.target.value))} className="mt-2 w-full bg-[var(--surface-muted)] rounded-xl p-3" /></label>}
          <button disabled={busy || !password} className="w-full bg-orange-600 text-white rounded-xl p-3 disabled:opacity-40" onClick={() => submit('start')}>Начать настройку</button>
        </>}
        {secret && <>
          <p>В приложении-аутентификаторе нажмите «Добавить аккаунт» → «Сканировать QR-код» и наведите камеру на код ниже.</p>
          <MfaEnrollmentQr secret={secret} issuer={issuer} account={account} />
          <p className="text-center text-sm break-all">{issuer} / {account}</p>
          <details className="rounded-xl border border-[var(--border)] p-3">
            <summary className="cursor-pointer">Не получается отсканировать? Ввести ключ вручную</summary>
            <p className="mt-3 text-sm ui-muted">Название аккаунта: {issuer} / {account}. Тип кода: по времени (TOTP).</p>
            <code className="mt-3 block break-all select-all bg-[var(--surface-muted)] rounded-xl p-3">{secret}</code>
          </details>
          <p className="text-sm ui-muted">Не передавайте QR-код и секретный ключ другим людям. Настройка действует 15 минут.</p>
          <label className="block">Код нового аутентификатора<input autoComplete="one-time-code" inputMode="numeric" maxLength={32} value={code} onChange={e => setCode(normalizeOneTimeCode(e.target.value))} className="mt-2 w-full bg-[var(--surface-muted)] rounded-xl p-3" /></label>
          <button disabled={busy || code.length !== 6 || !password} className="w-full bg-orange-600 text-white rounded-xl p-3 disabled:opacity-40" onClick={() => submit('confirm')}>Подтвердить</button>
          <button disabled={busy} onClick={() => { setSecret(''); setCode(''); }} className="underline">Начать заново</button>
        </>}
      </>}
      {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
      {error && codeErrorTime && <p className="text-sm ui-muted">Время сервера при проверке: {new Date(codeErrorTime).toLocaleString('ru-RU')}. Сверьте с датой и временем на телефоне.</p>}
      <button onClick={() => secureSignOut()} className="ui-muted underline">Выйти</button>
    </section>
  </main>;
}
