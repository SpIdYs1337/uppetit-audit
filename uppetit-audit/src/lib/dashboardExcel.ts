import ExcelJS from 'exceljs';
import { dashboardAuditFacts } from '@/lib/dashboardMetrics';
import { type loadDashboardReport, type DashboardFilters } from '@/lib/dashboardReport';

export async function dashboardExcel(source: Awaited<ReturnType<typeof loadDashboardReport>>, filters: DashboardFilters) {
  const { report, audits, allRecords } = source;
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'UPPETIT';
  const sheet = (name: string, columns: { header: string; key: string; width: number }[], rows: object[]) => {
    const page = workbook.addWorksheet(name); page.columns = columns; page.views = [{ state: 'frozen', ySplit: 1 }];
    rows.forEach(row => page.addRow(row));
    const header = page.getRow(1); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB94100' } }; header.height = 26;
    page.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, page.rowCount), column: columns.length } };
    page.eachRow((row, index) => { row.alignment = { vertical: 'top', wrapText: true }; if (index > 1 && index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F5F2' } }; });
    return page;
  };
  const col = (header: string, key: string, width = 20) => ({ header, key, width });
  const shown = (name: 'checklists' | 'locations' | 'auditors' | 'tus', values: string[]) => values.length ? values.map(id => report.options[name].find(option => option.id === id)?.title || id).join('; ') : 'Все';
  sheet('Сводка', [col('Показатель', 'name', 45), col('Значение', 'value', 70)], [
    { name: 'Начало периода', value: filters.from || 'Вся история' }, { name: 'Конец периода', value: filters.to || 'Без верхней границы' }, { name: 'Часовой пояс', value: filters.timeZone },
    { name: 'Чек-листы', value: shown('checklists', filters.checklistIds) }, { name: 'Точки', value: shown('locations', filters.locationIds) }, { name: 'Аудиторы', value: shown('auditors', filters.auditorIds) }, { name: 'ТУ (текущие назначения)', value: shown('tus', filters.tuIds) },
    { name: 'Всего проверок', value: report.totalAudits }, { name: 'Выполнение, %', value: report.summary.qualityPct }, { name: 'Полученные / возможные баллы', value: `${report.summary.score} / ${report.summary.max}` },
    { name: 'Проверок с корректным максимумом', value: report.summary.scoredAudits }, { name: 'Проверок без нарушений', value: report.summary.cleanAudits }, { name: 'Нарушений (ответов)', value: report.summary.violations },
    { name: 'Критических нарушений', value: report.summary.criticalViolations }, { name: 'Аудитов с критическими нарушениями', value: report.summary.criticalAudits }, { name: 'Точек с нарушениями', value: report.summary.affectedLocations },
    { name: 'Повторяющихся проблем', value: report.summary.repeatedProblems }, { name: 'Потеря баллов по ответам', value: report.summary.penaltyPoints }, { name: 'Фотографий', value: report.summary.photos },
    { name: 'Нарушений с фото, %', value: report.summary.evidencePct }, { name: 'Обязательных фото не приложено', value: report.summary.missingRequiredPhotos },
    { name: 'Активных точек сейчас', value: report.coverage.activeLocations }, { name: 'Из них проверено в периоде', value: report.coverage.visitedActiveLocations },
    { name: 'Предыдущий период', value: report.metadata.previousFrom ? `${report.metadata.previousFrom} — ${report.metadata.previousTo}` : 'Не задан' },
    { name: 'Изменение качества, п.п.', value: report.comparison.qualityDelta },
    { name: 'Формула качества', value: 'Сумма баллов / сумма максимумов проверок с корректным максимумом. Пороги зон заданы в баллах чек-листа.' },
    { name: 'Формула частоты проблемы', value: 'Число проверок с нарушением пункта / число проверок с ответом на этот пункт. Разные чек-листы и разделы не смешиваются.' },
    { name: 'Повторяемость', value: 'Одинаковый пункт нарушен на одной точке минимум в двух разных проверках периода. Это не статус исправления.' },
    { name: 'Ограничения истории', value: 'Флаг критичности и пороги берутся из сохранённой версии и текущих настроек чек-листа. Уже удалённые фото отсутствуют; факт закрытия нарушения отдельно не хранится.' },
  ]);
  sheet('Статистика', [col('Точка', 'name', 34), col('Адрес точки', 'address', 45), col('ТУ', 'tu', 30), col('Кол-во аудитов', 'totalAudits'), col('% Выполнения', 'qualityPct'), col('Нарушения', 'violations'), col('Критические', 'criticalViolations'), col('Повторяющиеся пункты', 'repeatedProblems'), col('Красных аудитов', 'redAudits'), col('Последняя проверка', 'latestDate', 24)], report.locationStats);
  sheet('Нарушения', [col('Чек-лист', 'checklist', 30), col('Раздел', 'section', 26), col('Пункт', 'question', 65), col('Проверок пункта', 'checkedAudits'), col('Проверок с нарушением', 'count'), col('Частота, %', 'pct'), col('Случаев', 'incidents'), col('Точек', 'locations'), col('Точек с повтором', 'repeatedLocations'), col('Критические', 'criticalCount'), col('Потеря баллов', 'penaltyPoints'), col('Изменение, п.п.', 'deltaRate')], report.problemStats);
  sheet('Разделы', [col('Чек-лист', 'checklist', 30), col('Раздел', 'name', 35), col('Ответов', 'answers'), col('Нарушения', 'violations'), col('Частота, %', 'failurePct'), col('Критические', 'critical'), col('Потеря баллов', 'penalties')], report.sectionStats);
  sheet('Аудиторы', [col('Аудитор', 'name', 36), col('Проверок', 'totalAudits'), col('% Выполнения', 'qualityPct'), col('Пунктов проверено', 'answers'), col('Нарушений выявлено', 'violations'), col('Критические', 'criticalViolations'), col('Фото', 'photos')], report.auditorStats);
  sheet('Чек-листы', [col('Чек-лист', 'name', 42), col('Проверок', 'totalAudits'), col('% Выполнения', 'qualityPct'), col('Ответов', 'answers'), col('Нарушения', 'violations'), col('Критические', 'criticalViolations')], report.checklistStats);
  const dates = new Intl.DateTimeFormat('ru-RU', { timeZone: filters.timeZone, dateStyle: 'short', timeStyle: 'short' });
  sheet('Проверки', [col('ID аудита', 'id', 28), col('Дата', 'date', 24), col('Точка', 'location', 34), col('Адрес', 'address', 40), col('Аудитор', 'auditor', 28), col('ТУ', 'tu', 28), col('Чек-лист', 'checklist', 32), col('Версия', 'version'), col('Баллы', 'score'), col('Максимум', 'maxScore'), col('Выполнение, %', 'pct'), col('Зона', 'zone'), col('Ответов', 'answers'), col('Нарушения', 'violations'), col('Критические', 'critical'), col('Фото', 'photos'), col('Смена', 'shiftEmployees', 40), col('Общий комментарий', 'comment', 65)], allRecords.map(row => ({ ...row, date: dates.format(new Date(row.date)), shiftEmployees: row.shiftEmployees.join('; ') })));
  const answers = audits.flatMap(audit => { const facts = dashboardAuditFacts(audit); return facts.answers.map(answer => ({ auditId: audit.id, date: dates.format(audit.date), location: facts.name, auditor: facts.auditor, checklist: audit.checklistVersion.checklist.title, version: audit.checklistVersion.version,
    zone: answer.zone, question: answer.question, status: answer.isOk ? 'Соответствует' : 'Нарушение', critical: answer.matched ? answer.critical ? 'Да' : 'Нет' : 'Не определено', penalty: answer.penalty, comment: answer.comment || '', photos: answer.photos.join('\n') })); });
  // Keep every answer; split only at Excel's actual row limit, never at the UI page size.
  for (let offset = 0; offset < Math.max(1, answers.length); offset += 1048575) sheet(offset ? `Ответы ${Math.floor(offset / 1048575) + 1}` : 'Ответы', [col('ID аудита', 'auditId', 28), col('Дата', 'date', 24), col('Точка', 'location', 34), col('Аудитор', 'auditor', 28), col('Чек-лист', 'checklist', 30), col('Версия', 'version'), col('Раздел', 'zone', 28), col('Пункт', 'question', 65), col('Ответ', 'status'), col('Критический пункт', 'critical'), col('Штраф', 'penalty'), col('Комментарий', 'comment', 65), col('Фотографии', 'photos', 65)], answers.slice(offset, offset + 1048575));
  sheet('Без проверок', [col('Точка', 'name', 36), col('Адрес', 'address', 45)], report.coverage.unvisited);
  return workbook.xlsx.writeBuffer();
}
