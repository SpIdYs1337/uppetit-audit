'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';

export function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'Tab') { event.preventDefault(); close.current?.focus(); } };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label="Фотография аудита" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
    <Image src={url} alt="Фотография аудита" width={1600} height={1200} unoptimized className="max-h-[90dvh] w-auto max-w-full rounded-xl object-contain" onClick={event => event.stopPropagation()} />
    <button ref={close} type="button" aria-label="Закрыть фотографию" onClick={onClose} className="absolute right-4 top-4 h-12 w-12 rounded-full bg-white/20 text-xl font-bold text-white">✕</button>
  </div>;
}
