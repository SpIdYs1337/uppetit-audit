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
      
      // Конвертируем ключ
      const base64Padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
      const base64 = (publicVapidKey + base64Padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      // Запрашиваем подписку
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      // Сохраняем в БД
      await fetch('/api/user/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      setIsSubscribed(true);
      alert('Уведомления успешно включены!');
    } catch (err) {
      console.error(err);
      alert('Ошибка. Возможно, вы заблокировали уведомления в настройках браузера.');
    }
  };

  if (isSubscribed) return <div className="text-xs text-green-600 font-bold bg-green-50 px-3 py-2 rounded-xl text-center">✓ Уведомления включены</div>;

  return (
    <button onClick={subscribeToPush} className="w-full bg-blue-50 text-blue-600 font-bold text-xs py-2 rounded-xl hover:bg-blue-100 transition-colors">
      🔔 Включить уведомления
    </button>
  );
}