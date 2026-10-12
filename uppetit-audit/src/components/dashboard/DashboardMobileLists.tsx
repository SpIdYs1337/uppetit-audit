'use client';

import { type ReactNode } from 'react';
import { Badge, Button, Icon } from '@/components/ui';
import { type DashboardReport } from '@/lib/dashboardReport';

const pct = (value: number | null) => value === null ? '—' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
const tone = { green: 'success', yellow: 'warning', red: 'danger', unknown: 'neutral' } as const;
const zone = { green: 'В норме', yellow: 'Внимание', red: 'Ниже нормы', unknown: 'Нет максимума' };
function Value({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

export function DashboardLocationCards({ rows, onOpen, formatDate }: { rows: DashboardReport['locationStats']; onOpen: (id: string) => void; formatDate: (date: string) => string }) {
  return <div className="dashboard-mobile-list" aria-label="Результаты точек">{rows.map(row => <article key={row.key} className="dashboard-mobile-card">
    <header><div><h3>{row.name}</h3>{row.address && <p>{row.address}</p>}<p>ТУ: {row.tu}</p></div><strong className="dashboard-card-score">{pct(row.qualityPct)}</strong></header>
    <dl className="dashboard-card-values"><Value label="Проверки">{row.totalAudits}</Value><Value label="Баллы">{row.score} / {row.max}</Value><Value label="Замечания">{row.violations}</Value><Value label="Критические"><span className={row.criticalViolations ? 'text-red-600 dark:text-red-400' : ''}>{row.criticalViolations}</span></Value><Value label="Повторяющиеся пункты">{row.repeatedProblems}</Value><Value label="Последний результат"><Badge tone={tone[row.latestZone]}>{pct(row.latestPct)}</Badge></Value></dl>
    <footer><span>{formatDate(row.latestDate)}</span><Button variant="secondary" onClick={() => onOpen(row.latestAuditId)}><Icon name="eye" />Последняя проверка</Button></footer>
  </article>)}</div>;
}

export function DashboardProblemCards({ rows, onOpen, renderChange }: { rows: DashboardReport['problemStats']; onOpen: (id: string) => void; renderChange: (value: number | null) => ReactNode }) {
  return <div className="dashboard-mobile-list" aria-label="Нарушения по пунктам">{rows.map(row => <article key={row.key} className="dashboard-mobile-card">
    <header><div><h3>{row.question}</h3><p>{row.checklist} · {row.section}</p></div>{row.criticalCount > 0 && <Badge tone="danger">{row.criticalCount} критических</Badge>}</header>
    <dl className="dashboard-card-values"><Value label="Частота">{pct(row.pct)}<small>{row.count} из {row.checkedAudits} проверок</small></Value><Value label="Точки / с повтором">{row.locations} / {row.repeatedLocations}</Value><Value label="Потеря баллов">{row.penaltyPoints} б.</Value><Value label="Фото / комментарии">{row.photos} / {row.comments}</Value></dl>
    <footer>{renderChange(row.deltaRate)}<Button variant="secondary" onClick={() => onOpen(row.lastAuditId)}><Icon name="eye" />Открыть проверку</Button></footer>
  </article>)}</div>;
}

export function DashboardAuditCards({ rows, onOpen, formatDate }: { rows: DashboardReport['auditRecords']['items']; onOpen: (id: string) => void; formatDate: (date: string) => string }) {
  return <div className="dashboard-mobile-list" aria-label="Проверки по фильтрам">{rows.map(row => <article key={row.id} className="dashboard-mobile-card">
    <header><div><h3>{row.location}</h3><p>{formatDate(row.date)}</p></div><Badge tone={tone[row.zone]}>{pct(row.pct)} · {zone[row.zone]}</Badge></header>
    <p className="dashboard-card-person">{row.auditor}<small>{row.checklist} · v{row.version}</small></p>
    <dl className="dashboard-card-values"><Value label="Баллы">{row.score} / {row.maxScore ?? '—'}</Value><Value label="Замечания">{row.violations}</Value><Value label="Критические"><span className={row.critical ? 'text-red-600 dark:text-red-400' : ''}>{row.critical}</span></Value><Value label="Фотографии">{row.photos}</Value></dl>
    <Button variant="secondary" className="w-full" aria-label={`Открыть аудит ${row.id}`} onClick={() => onOpen(row.id)}><Icon name="eye" />Ответы и фотографии</Button>
  </article>)}</div>;
}
