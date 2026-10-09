import { getSession, signOut } from 'next-auth/react';
import { clearDrafts } from './draftStorage';

export async function clearPrivateCaches() {
  if ('caches' in window) await Promise.all((await caches.keys()).map(name => caches.delete(name)));
}

export async function secureSignOut() {
  const session = await getSession();
  await fetch('/api/user/push', { method: 'DELETE', cache: 'no-store' }).catch(() => {});
  if ('serviceWorker' in navigator) {
    await navigator.serviceWorker.getRegistration().then(async registration => {
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
    }).catch(() => {});
  }
  clearDrafts(session?.user.id);
  await clearPrivateCaches().catch(() => {});
  await signOut({ redirect: false });
  window.location.replace('/');
}
