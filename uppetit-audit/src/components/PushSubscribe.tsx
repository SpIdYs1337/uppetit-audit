'use client';
import { useState, useEffect } from 'react';

export default function PushSubscribe() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => { if (sub) setIsSubscribed(true); });
    }
  }, []);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) return alert('Браузер не поддерживает пуши');
    try {
      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const base64Padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
      const base64 = (publicVapidKey + base64Padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: outputArray });
      await fetch('/api/user/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription }) });
      setIsSubscribed(true);
      alert('Уведомления успешно включены!');
    } catch (err) { alert('Ошибка. Возможно, вы заблокировали уведомления в настройках браузера.'); }
  };

  if (isSubscribed) return <div className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl text-center border border-green-100 dark:border-green-900/30 transition-colors">✓ Уведомления включены</div>;

  return (
    <button onClick={subscribeToPush} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/30 transition-all active:scale-95">
      🔔 Включить уведомления
    </button>
  );
}