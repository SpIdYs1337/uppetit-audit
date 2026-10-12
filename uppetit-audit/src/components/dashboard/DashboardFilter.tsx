'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, SearchInput } from '@/components/ui';

export function DashboardFilter({ label, options, selected, onChange }: { label: string; options: { id: string; title: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const root = useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) root.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && root.current?.open) { root.current.open = false; root.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  const visible = options.filter(option => option.title.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  return <details ref={root} className="dashboard-filter">
    <summary><span><span className="ui-muted block text-[10px] font-semibold uppercase tracking-wide">{label}</span><span className="block truncate mt-1">{selected.length ? `Выбрано: ${selected.length}` : 'Все'}</span></span><Icon name="chevron" className="h-4 w-4 shrink-0" /></summary>
    <div className="dashboard-filter-menu">
      <SearchInput aria-label={`Найти: ${label}`} placeholder="Найти в списке" value={search} onChange={event => setSearch(event.target.value)} />
      <div className="mt-2 max-h-56 overflow-y-auto">{visible.map(option => <label key={option.id} className="dashboard-filter-option"><input className="ui-checkbox" type="checkbox" checked={selected.includes(option.id)} onChange={() => onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id])} /><span>{option.title}</span></label>)}{!visible.length && <p className="p-3 ui-muted text-sm">Ничего не найдено</p>}</div>
      <div className="flex justify-between gap-2 mt-3"><Button variant="ghost" onClick={() => onChange([])}>Сбросить</Button><Button variant="secondary" onClick={() => { if (root.current) root.current.open = false; }}>Готово</Button></div>
    </div>
  </details>;
}
