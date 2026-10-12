'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    search: 'm21 21-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    checklist: 'M9 5h12 M9 12h12 M9 19h12 m-6-15 1 1 2-2 m-3 8 1 1 2-2 m-3 8 1 1 2-2',
    history: 'M3 12a9 9 0 1 0 2-6 M3 3v5h5 M12 7v5l3 2',
    calendar: 'M3 5h18v16H3z M7 3v4 M17 3v4 M3 11h18',
    plus: 'M12 5v14 M5 12h14', close: 'm6 6 12 12 M6 18 18 6',
    menu: 'M4 6h16 M4 12h16 M4 18h16', arrow: 'M19 12H5 m7-7-7 7 7 7',
    panel: 'M3 4h18v16H3z M9 4v16', logout: 'M9 4H4v16h5 M14 8l4 4-4 4 M8 12h12',
    check: 'm5 12 4 4L19 6', edit: 'm15 5 4 4 M4 20l4-1L20 7l-3-3L5 16z',
    shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z m-5 9 3 3 5-5',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    eyeOff: 'M3 3l18 18 M10.5 5.2A12 12 0 0 1 12 5c6 0 10 7 10 7a20 20 0 0 1-3 3.6 M6.3 6.3A20 20 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.7-1.5 M9.9 9.9a3 3 0 0 0 4.2 4.2',
    lock: 'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    chevron: 'm6 9 6 6 6-6', chart: 'M4 20h17 M5 15l5-5 4 3 6-9',
    alert: 'M12 3 2 21h20z M12 9v5 M12 17h.01',
    download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5', copy: 'M9 9h12v12H9z M15 9V3H3v12h6',
    book: 'M12 5C9 3 6 3 3 4v16c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1z M12 5v16',
  };
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.checklist} /></svg>;
}

export function Button({ variant = 'primary', loading, children, className = '', disabled, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`ui-button ui-button-${variant} ${className}`}>
    {loading && <span aria-hidden="true" className="ui-spinner" />}{children}
  </button>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="ui-label"><span>{label}</span>{children}{hint && <span className="ui-muted text-xs font-normal">{hint}</span>}</label>;
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative min-w-0"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ui-muted"><Icon name="search" /></span><input {...props} aria-label={props['aria-label'] || props.placeholder || 'Поиск'} type="search" className={`ui-field pl-10 ${props.className || ''}`} /></div>;
}

export function Switch({ checked, onChange, label, loading, disabled }: { checked: boolean; onChange: () => void; label: string; loading?: boolean; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} aria-busy={loading || undefined} disabled={disabled || loading} onClick={onChange} className={`ui-switch ${checked ? 'is-on' : ''}`}><span className="ui-switch-thumb">{loading && <span className="ui-spinner !h-3 !w-3" />}</span></button>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function Notice({ children, error = false, onClose }: { children: ReactNode; error?: boolean; onClose?: () => void }) {
  return <div role={error ? 'alert' : 'status'} className={`ui-notice ${error ? 'is-error' : ''}`}><span className="min-w-0 break-words">{children}</span>{onClose && <Button variant="ghost" aria-label="Закрыть уведомление" onClick={onClose}><Icon name="close" /></Button>}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-empty"><Icon name="search" className="mx-auto mb-3 h-7 w-7 ui-muted" /><h2 className="font-semibold">{title}</h2>{description && <p className="ui-muted mt-2 text-sm">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 p-12 ui-muted"><span className="ui-spinner" />{label}</div>;
}

const subscribeMounted = () => () => {};
export function Dialog({ title, children, onClose, drawer = false, busy = false, className = '' }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const ready = useSyncExternalStore(subscribeMounted, () => true, () => false);
  useEffect(() => {
    if (!ready) return;
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [ready]);
  if (!ready) return null;
  return createPortal(<dialog ref={ref} aria-labelledby={titleId} className={`ui-dialog ${drawer ? 'ui-drawer' : ''} ${className}`} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="ui-dialog-header"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><Button variant="ghost" disabled={busy} aria-label="Закрыть окно" onClick={onClose}><Icon name="close" /></Button></div>
    <div className="ui-dialog-body">{children}</div>
  </dialog>, document.body);
}

export function ConfirmDialog({ title, message, onClose, onConfirm, busy, error }: { title: string; message: string; onClose: () => void; onConfirm: () => void; busy?: boolean; error?: string }) {
  return <Dialog title={title} onClose={onClose} busy={busy}><p className="ui-muted text-sm leading-relaxed">{message}</p>{error && <div className="mt-4"><Notice error>{error}</Notice></div>}<div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={busy}>Отмена</Button><Button variant="danger" onClick={onConfirm} loading={busy}>Подтвердить</Button></div></Dialog>;
}

export function ActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const menuId = useId();
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector('button')?.focus();
    function close(event: Event) { if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setPosition(null); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setPosition(null); button.current?.focus(); } }
    function hide() { setPosition(null); }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    window.addEventListener('resize', hide); window.addEventListener('scroll', hide, true);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); window.removeEventListener('resize', hide); window.removeEventListener('scroll', hide, true); };
  }, [position]);
  return <><button ref={button} type="button" aria-label={label} aria-expanded={!!position} aria-controls={position ? menuId : undefined} title={label} className="ui-button ui-button-ghost !p-2 !text-2xl !w-11" onClick={() => {
    if (position) { setPosition(null); return; }
    const rect = button.current!.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(rect.right - 232, window.innerWidth - 240)), top: rect.bottom + 8 });
  }}>⋯</button>{position && createPortal(<div ref={menu} id={menuId} aria-label={label} className="ui-action-items !fixed !bottom-auto" style={{ left: position.left, top: Math.max(8, Math.min(position.top, window.innerHeight - 310)), maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto' }} onClick={() => { setPosition(null); button.current?.focus(); }}>{children}</div>, document.body)}</>;
}

export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label="Страницы списка" className="ui-pagination"><span className="ui-muted text-sm">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} из ${total}` : '0 записей'}</span><div className="flex flex-wrap items-center gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(1)} aria-label="Первая страница">«</Button><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Предыдущая страница">‹</Button><span className="text-sm">{page} / {pages}</span><Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Следующая страница">›</Button><Button variant="secondary" disabled={page >= pages} onClick={() => onPage(pages)} aria-label="Последняя страница">»</Button></div></nav>;
}
