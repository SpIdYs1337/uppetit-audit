'use client';
import { useEffect, useRef, useState } from 'react';

export function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (values: string[]) => void;
}) {
  const root = useRef<HTMLDetailsElement>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) root.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && root.current?.open) { root.current.open = false; root.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  const visible = options.filter(option => option.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  return <details ref={root} className="relative min-w-0">
    <summary className="list-none cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold dark:border-zinc-700 dark:bg-zinc-800 flex justify-between gap-2"><span className="truncate">{label}: {selected.length ? `выбрано ${selected.length}` : 'Все'}</span><span aria-hidden="true">⌄</span></summary>
    <div className="absolute left-0 top-full mt-2 z-50 w-full min-w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <input aria-label={`Найти: ${label}`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Найти в списке" className="mb-2 w-full rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-zinc-800" />
      <div className="max-h-56 overflow-y-auto">{visible.map(option => <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"><input type="checkbox" className="mt-1 accent-[#F25C05]" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter(value => value !== option) : [...selected, option])} /><span className="break-words">{option}</span></label>)}{!visible.length && <p className="p-2 text-sm text-gray-500 dark:text-zinc-400">Ничего не найдено</p>}</div>
      <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 dark:border-zinc-800"><button type="button" onClick={() => onChange([])} className="rounded-lg px-2 py-1 text-xs font-bold text-gray-500 dark:text-zinc-400">Сбросить</button><button type="button" onClick={() => { if (root.current) root.current.open = false; }} className="rounded-lg px-3 py-1 text-xs font-bold text-[#F25C05]">Готово</button></div>
    </div>
  </details>;
}
