'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSession, useSession } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { clearDrafts } from '@/lib/draftStorage';
import { clearPrivateCaches } from '@/lib/clientSignOut';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const userId = session?.user.id;
  const { cache } = useMemo(() => ({ userId, cache: new Map() }), [userId]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { clearDrafts(); } catch { /* Storage may be disabled by browser policy. */ }
    void clearPrivateCaches().catch(() => {}).finally(() => setReady(true));
    if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration().then(reg => reg?.update()).catch(() => {});
  }, []);
  useEffect(() => {
    // The installed PWA starts at /. Restore its working screen only after
    // Auth.js has checked the persistent cookie against the server session.
    if (status === 'authenticated' && session?.user && pathname === '/') {
      window.location.replace(session.user.mfaRequired ? '/setup-mfa' : session.user.role === 'ADMIN' ? '/admin' : '/audit');
      return;
    }
    if (status === 'unauthenticated' && pathname !== '/' && pathname !== '/setup-password') window.location.replace('/');
    if (session?.user.mfaRequired && pathname !== '/setup-mfa' && pathname !== '/' && pathname !== '/setup-password') window.location.replace('/setup-mfa');
  }, [status, pathname, session?.user]);
  useEffect(() => {
    if (!userId) return;
    let lastSent = 0;
    let inFlight = false;
    const activity = async (event: Event) => {
      if (!event.isTrusted || document.visibilityState !== 'visible' || inFlight || Date.now() - lastSent < 60_000) return;
      inFlight = true; lastSent = Date.now();
      try {
        const response = await fetch('/api/session/activity', { method: 'POST', cache: 'no-store' });
        // Refresh the signed cookie deadline after extending the server record.
        if (response.status === 204 || response.status === 401) await getSession();
      } catch { /* Offline activity does not extend server sessions. */ }
      finally { inFlight = false; }
    };
    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach(name => window.addEventListener(name, activity, { passive: true }));
    const timer = setInterval(() => { if (navigator.onLine) void getSession(); }, 60_000);
    return () => { clearInterval(timer); events.forEach(name => window.removeEventListener(name, activity)); };
  }, [userId]);
  const isPrivate = pathname !== '/' && pathname !== '/setup-password';
  if (!ready || (pathname === '/' && status !== 'unauthenticated')
    || (isPrivate && (status !== 'authenticated' || (session?.user.mfaRequired && pathname !== '/setup-mfa')))) return null;
  return <SWRConfig key={userId || 'anonymous'} value={{ provider: () => cache }}>{children}</SWRConfig>;
}
