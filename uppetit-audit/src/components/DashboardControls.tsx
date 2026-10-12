'use client';
import { localDateInput } from '@/lib/reportDates';
import { Button, Notice } from '@/components/ui';

export function DashboardControls({ onPeriod, onRefresh, busy, error }: {
  onPeriod: (from: string, to: string) => void; onRefresh: () => void; busy: boolean; error: string;
}) {
  const period = (days?: number) => {
    const now = new Date(), from = new Date(now);
    if (days) from.setDate(from.getDate() - days + 1); else from.setDate(1);
    onPeriod(localDateInput(from), localDateInput(now));
  };
  return <div className="relative min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {[{ label: 'Этот месяц', days: undefined }, { label: '7 дней', days: 7 }, { label: '30 дней', days: 30 }].map(item => <Button key={item.label} variant="secondary" onClick={() => period(item.days)} className="dashboard-period">{item.label}</Button>)}
      <Button variant="secondary" onClick={() => onPeriod('', '')} className="dashboard-period">Вся история</Button>
      <Button variant="ghost" loading={busy} onClick={onRefresh} className="dashboard-period">Обновить</Button>
    </div>
    {error && <Notice error>{error}. Показанные ранее данные могут не соответствовать фильтрам.</Notice>}
  </div>;
}

export const TrendBadge = ({ trend }: { trend: number | null }) => {
    if (trend === null) return null;
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    return (
      <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
        isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30' :
        isNeutral ? 'bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-100 dark:border-zinc-700' :
        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30'
      }`}>
        <span className="text-sm font-black">{isPositive ? '↑' : isNeutral ? '—' : '↓'} {Math.abs(trend)}%</span>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">к прошлому периоду</span>
      </div>
    );
  };
