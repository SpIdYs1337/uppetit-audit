'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { secureSignOut } from '@/lib/clientSignOut';
import { APP_VERSION } from '@/lib/version';
import { usePreference } from '@/hooks/usePreference';
import PushSubscribe from '@/components/PushSubscribe';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Brand } from '@/components/Brand';
import { Button, Dialog, Icon } from '@/components/ui';

const preferences = ['expanded', 'collapsed'] as const;
const links = [
  { href: '/admin', label: 'Дашборд', icon: 'dashboard' },
  { href: '/admin/users', label: 'Сотрудники', icon: 'users' },
  { href: '/admin/locations', label: 'Точки', icon: 'location' },
  { href: '/admin/checklists', label: 'Чек-листы', icon: 'checklist' },
  { href: '/admin/audits', label: 'Аудиты', icon: 'history' },
  { href: '/admin/schedule', label: 'Календарь проверок', icon: 'calendar' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobile, setMobile] = useState(false);
  const [preference, setPreference] = usePreference('admin-sidebar', 'expanded', preferences);
  const collapsed = preference === 'collapsed';
  function navigation(compact = false) {
    return <nav aria-label="Разделы администратора" className="space-y-1">{links.map(link => {
      const active = link.href === '/admin' ? pathname === link.href : pathname.startsWith(link.href);
      return <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} title={compact ? link.label : undefined} onClick={() => setMobile(false)} className={'ui-nav-link ' + (compact ? '!justify-center !px-2' : '')}><Icon name={link.icon} className="h-5 w-5 shrink-0" /><span className={compact ? 'sr-only' : ''}>{link.label}</span></Link>;
    })}</nav>;
  }
  return <div className="min-h-dvh flex bg-[var(--background)] text-[var(--foreground)]">
    <div className="fixed inset-0 pointer-events-none bg-dotted opacity-60" />
    <aside aria-label="Панель администратора" className={'hidden md:flex sticky top-0 h-dvh shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] relative z-20 transition-[width] duration-200 ' + (collapsed ? 'w-20' : 'w-60')}>
      <div className={'flex items-center p-5 ' + (collapsed ? 'justify-center' : 'justify-between')}><Brand compact={collapsed} />{!collapsed && <Button variant="ghost" className="!p-2" onClick={() => setPreference('collapsed')} title="Свернуть меню" aria-label="Свернуть меню"><Icon name="panel" /></Button>}</div>
      {collapsed && <Button variant="ghost" className="mx-3 !p-2" onClick={() => setPreference('expanded')} title="Развернуть меню" aria-label="Развернуть меню"><Icon name="panel" /></Button>}
      <div className="px-3 py-3"><Link className={'ui-button ui-button-primary w-full ' + (collapsed ? '!p-2' : '')} href="/audit/new?backTo=/admin/audits" title="Провести аудит"><Icon name="plus" /><span className={collapsed ? 'sr-only' : ''}>Провести аудит</span></Link></div>
      <div className="flex-1 overflow-y-auto px-3">{navigation(collapsed)}</div>
      <div className="border-t border-[var(--border)] p-3 space-y-3">{!collapsed && <PushSubscribe />}<div className={'flex items-center gap-2 ' + (collapsed ? 'flex-col' : 'justify-between')}><ThemeToggle /><Button variant="ghost" className="!p-2" onClick={() => void secureSignOut()} title="Выйти" aria-label="Выйти"><Icon name="logout" /></Button></div>{!collapsed && <p className="ui-muted px-1 text-[11px]">UPPETIT · {APP_VERSION}</p>}</div>
    </aside>
    <div className="min-w-0 flex-1 relative z-10">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 sm:px-6 backdrop-blur">
        <div className="md:hidden"><Brand /></div><div className="hidden md:block ui-muted text-sm">Рабочее пространство <span className="mx-2 opacity-40">/</span><span className="text-[var(--foreground)]">{links.find(l => l.href !== '/admin' && pathname.startsWith(l.href))?.label || 'Дашборд'}</span></div>
        <div className="flex items-center gap-2"><span className="hidden sm:block text-xs ui-muted max-w-48 truncate">{session?.user.name || 'Администратор'}</span><div className="md:hidden"><ThemeToggle /></div><Button variant="ghost" className="md:!hidden !p-2" aria-label="Открыть меню" aria-expanded={mobile} onClick={() => setMobile(true)}><Icon name="menu" /></Button></div>
      </header>
      <main key={pathname} className="min-w-0 animate-page-fade">{children}</main>
    </div>
    {mobile && <Dialog title="Навигация" onClose={() => setMobile(false)} drawer><div className="space-y-5"><Brand />{navigation()}<Link href="/audit/new?backTo=/admin/audits" onClick={() => setMobile(false)} className="ui-button ui-button-primary w-full"><Icon name="plus" />Провести аудит</Link><PushSubscribe /><Button variant="secondary" className="w-full" onClick={() => void secureSignOut()}><Icon name="logout" />Выйти из системы</Button><p className="ui-muted text-xs">Версия {APP_VERSION}</p></div></Dialog>}
  </div>;
}
