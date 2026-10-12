'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Brand } from '@/components/Brand';
import { Button, Icon } from '@/components/ui';
import { secureSignOut } from '@/lib/clientSignOut';

const links = [
  { href: '/audit', label: 'Главная', icon: 'dashboard' },
  { href: '/audit/new', label: 'Проверка', icon: 'plus' },
  { href: '/audit/history', label: 'История', icon: 'history' },
  { href: '/audit/schedule', label: 'План', icon: 'calendar' },
];
export default function AuditLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const running = pathname === '/audit/run';
  function nav(mobile = false) {
    return <nav aria-label={mobile ? 'Мобильная навигация' : 'Разделы проверяющего'} className={mobile ? 'grid grid-cols-4' : 'flex gap-1'}>
      {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={'ui-nav-link ' + (mobile ? 'flex-col !gap-1 !px-1 !py-2 !text-[11px] !rounded-none min-h-16' : '')}><Icon name={link.icon} className="h-5 w-5" />{link.label}</Link>)}
      {!mobile && (session?.user.role === 'ADMIN' || session?.user.role === 'TU') && <Link href="/audit/dashboard" className="ui-nav-link" aria-current={pathname === '/audit/dashboard' ? 'page' : undefined}><Icon name="dashboard" />Аналитика</Link>}
    </nav>;
  }
  return <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] relative">
    <div className="fixed inset-0 pointer-events-none bg-dotted opacity-60" />
    {!running && <header className="relative z-20 border-b border-[var(--border)] bg-[var(--surface)]"><div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center gap-3"><Link href="/audit" aria-label="UPPETIT — главная"><Brand /></Link><div className="flex items-center gap-2"><ThemeToggle /><Button variant="ghost" className="!p-2" aria-label="Выйти" title="Выйти" onClick={() => void secureSignOut()}><Icon name="logout" /></Button></div></div><div className="hidden lg:block max-w-7xl mx-auto px-4 pb-2">{nav()}</div></header>}
    <main key={pathname} className={'relative z-10 max-w-7xl mx-auto min-w-0 animate-page-fade ' + (running ? '' : 'pb-24 lg:pb-6')}>{children}</main>
    {!running && <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]">{nav(true)}</div>}
  </div>;
}
