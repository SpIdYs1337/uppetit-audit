/** Calendar dates in inputs use the viewer's timezone, not the server's timezone. */
export function localDateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new Error('Некорректная дата');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Некорректная дата');
  const day = value.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    throw new Error('Некорректная дата');
  }
  return date;
}

export function parseReportRange(from?: string | null, to?: string | null) {
  const gte = from ? validDate(from) : undefined;
  const lte = to ? validDate(/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to) : undefined;
  if (gte && lte && gte > lte) throw new Error('Дата начала должна быть раньше даты окончания');
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

export function serializeReportRange(from: string, to: string) {
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) throw new Error('Некорректная дата');
  if (from) validDate(from);
  if (to) validDate(to);
  if (from && to && from > to) throw new Error('Дата начала должна быть раньше даты окончания');
  return {
    from: from ? new Date(`${from}T00:00:00.000`).toISOString() : '',
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : '',
  };
}

export function reportCalendarDate(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00Z`);
}
