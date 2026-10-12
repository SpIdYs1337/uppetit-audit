'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';

const eventName = 'uppetit-preference-change';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener(eventName, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(eventName, callback); };
}

export function usePreference<T extends string>(name: string, fallback: T, allowed: readonly T[]) {
  const { data: session } = useSession();
  const key = session?.user.id ? `uppetit:ui:${session.user.id}:${name}` : null;
  const getSnapshot = useCallback(() => {
    try { const value = key ? localStorage.getItem(key) : null; return allowed.includes(value as T) ? value as T : fallback; }
    catch { return fallback; }
  }, [key, fallback, allowed]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const setValue = useCallback((next: T) => {
    if (!key || !allowed.includes(next)) return;
    try { localStorage.setItem(key, next); window.dispatchEvent(new Event(eventName)); } catch { /* Storage may be disabled by the browser. */ }
  }, [key, allowed]);
  return [value, setValue] as const;
}
