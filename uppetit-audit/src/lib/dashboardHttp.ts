import { NextResponse } from 'next/server';
import { dashboardFiltersFromParams, dashboardFiltersSchema, dashboardRange, loadDashboardReport } from '@/lib/dashboardReport';
import { dashboardExcel } from '@/lib/dashboardExcel';

export async function dashboardResponse(request: Request, territoryUserId?: string, exportExcel = false) {
  let filters;
  try {
    filters = exportExcel ? dashboardFiltersSchema.parse(await request.json()) : dashboardFiltersFromParams(new URL(request.url).searchParams);
    dashboardRange(filters);
  } catch { return NextResponse.json({ error: 'Проверьте период и параметры фильтров' }, { status: 400 }); }
  try {
    const source = await loadDashboardReport(filters, territoryUserId);
    if (!exportExcel) return NextResponse.json(source.report, { headers: { 'Cache-Control': 'no-store' } });
    if (!source.report.totalAudits) return NextResponse.json({ error: 'Нет проверок для выгрузки по выбранным фильтрам' }, { status: 400 });
    const buffer = await dashboardExcel(source, filters);
    return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Dashboard_${Date.now()}.xlsx"`, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Ошибка отчёта дашборда:', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ error: exportExcel ? 'Не удалось сформировать Excel' : 'Не удалось собрать аналитику' }, { status: 500 });
  }
}
