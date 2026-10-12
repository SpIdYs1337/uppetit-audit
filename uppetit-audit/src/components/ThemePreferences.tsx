'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

const changes = 'uppetit-theme-preference';
const PreferenceContext = createContext<((value: string) => void) | null>(null);
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener(changes, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(changes, callback); };
}
export function ThemePreferences({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { setTheme } = useTheme();
  const key = `uppetit:theme:${session?.user.id || 'guest'}`;
  const snapshot = useCallback(() => {
    try { const value = localStorage.getItem(key); return value === 'light' || value === 'dark' ? value : 'system'; }
    catch { return 'system'; }
  }, [key]);
  const preference = useSyncExternalStore(subscribe, snapshot, () => 'system');
  const applied = useRef('');
  useLayoutEffect(() => {
    const identity = `${key}:${preference}`;
    if (applied.current !== identity) { applied.current = identity; setTheme(preference); }
  }, [key, preference, setTheme]);
  const choose = useCallback((value: string) => {
    if (!['light', 'dark', 'system'].includes(value)) return;
    try { localStorage.setItem(key, value); window.dispatchEvent(new Event(changes)); } catch { /* Keep a usable theme if storage is unavailable. */ }
    setTheme(value);
  }, [key, setTheme]);
  return <PreferenceContext.Provider value={choose}>{children}</PreferenceContext.Provider>;
}
export function useThemePreferenceSetter() {
  const preferenceSetter = useContext(PreferenceContext);
  const { setTheme } = useTheme();
  return preferenceSetter || setTheme;
}
