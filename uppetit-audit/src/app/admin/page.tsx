'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

interface ReportProblem {
  question: string;
  count: number;
  pct: number;
  prevCount: number;
  prevPct: number;
  delta: number;
}

interface ReportLocation {
  name: string;
  score: number;
  maxScore: number;
  pct: number;
  tu: string;
  criticalCount: number;
}

interface ReportCritical {
  locationName: string;
  tu: string;
  questions: string[];
}

interface DashboardData {
  totalAudits: number;
  avgScore: number;
  avgPct: number;
  trends: { total: number | null; score: number | null };
  zones: { name: string; value: number; fill: string }[];
  trendData: { date: string; count: number }[];
  wowData: { date: string; pct: number }[];
  momData: { date: string; pct: number }[];
  topLocations: { name: string; avg: number; avgPct: number }[];
  bottomLocations: { name: string; avg: number; avgPct: number }[];
  trendType: string;
  availableChecklists: { id: string; title: string }[];
  report: {
    failedLocations: ReportLocation[];
    problems: ReportProblem[];
    criticalViolations: ReportCritical[];
  };
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); 
  const [isExporting, setIsExporting] = useState(false);

  const [activeTab, setActiveTab] = useState<'summary' | 'isolated'>('summary');
  const [selectedChecklists, setSelectedChecklists] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [dateTo, setDateTo] = useState(() => new Date().toLocaleDateString('en-CA'));

  const fetchDashboard = useCallback(async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      
      if (activeTab === 'isolated' && selectedChecklists.length > 0) {
        params.append('checklistIds', selectedChecklists.join(','));
      }

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [dateFrom, dateTo, activeTab, selectedChecklists]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          from: dateFrom, 
          to: dateTo, 
          checklistIds: activeTab === 'isolated' ? selectedChecklists : [] 
        })
      });

      if (!response.ok) throw new Error('Ошибка скачивания');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Аналитика_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Не удалось сформировать Excel');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleChecklist = (id: string) => {
    setSelectedChecklists(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCopyTextReport = () => {
    if (!data?.report) return;
    
    let text = "🚨 Провалившиеся точки (Красная зона)\n";
    if (data.report.failedLocations.length > 0) {
      data.report.failedLocations.forEach(loc => {
        text += `• ${loc.name} — ${loc.score}/${loc.maxScore} (${loc.pct}%), ТУ: ${loc.tu}, критических: ${loc.criticalCount} шт\n`;
      });
    } else {
      text += "• Нет провалившихся точек\n";
    }

    text += "\n📊 Детализация по всем пунктам (Топ нарушений)\n";
    if (data.report.problems.length > 0) {
      data.report.problems.forEach(p => {
        const deltaStr = p.delta > 0 ? `+${p.delta}` : p.delta.toString();
        text += `• ${p.question}. — ${p.count} случаев (${p.pct}%), прошлая неделя: ${p.prevCount} случаев (${p.prevPct}%), Δ: ${deltaStr}\n`;
      });
    } else {
      text += "• Идеально, нарушений нет\n";
    }

    text += "\n❌ Критические замечания по точкам\n";
    if (data.report.criticalViolations.length > 0) {
      data.report.criticalViolations.forEach(cv => {
        text += `${cv.locationName} (${cv.tu})\n`;
        cv.questions.forEach(q => {
          text += `• ${q}\n`;
        });
        text += "\n";
      });
    } else {
      text += "• Нет критических нарушений\n";
    }

    navigator.clipboard.writeText(text.trim());
    alert('✅ Отчет скопирован в буфер обмена!');
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null; 
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="900" className="drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const TrendBadge = ({ trend }: { trend: number | null }) => {
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

  if (isLoading && !data) {
    return (
      <div className="p-8 h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 dark:text-zinc-500 font-bold animate-pulse">Сбор аналитики...</div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-red-500 font-bold">Ошибка загрузки данных</div>;

  // Стили для тултипов графиков, чтобы они адаптировались под тему
  const tooltipStyle = {
    borderRadius: '16px',
    border: isDark ? '1px solid #27272a' : 'none', // border-zinc-800
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    fontWeight: 'bold',
    backgroundColor: isDark ? '#18181b' : '#ffffff', // bg-zinc-900 or white
    color: isDark ? '#f4f4f5' : '#111827' // text-zinc-100 or gray-900
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 relative transition-colors duration-300">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight transition-colors">Аналитика сети</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 text-sm md:text-base font-medium transition-colors">Сводная информация по проверкам</p>
        </div>
        
        <button 
          onClick={handleExportExcel} 
          disabled={isExporting}
          className="w-full sm:w-auto text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-900/30 px-4 py-3 sm:py-2.5 rounded-xl font-bold text-sm transition-all text-center shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {isExporting ? 'Формируем...' : '📊 Выгрузить в Excel'}
        </button>
      </div>

      <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto transition-colors">
        <button
          onClick={() => { setActiveTab('summary'); setSelectedChecklists([]); }}
          className={`pb-3 font-black text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'summary' ? 'border-[#F25C05] text-gray-900 dark:text-zinc-100' : 'border-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}
        >
          Общая сводка
        </button>
        <button
          onClick={() => setActiveTab('isolated')}
          className={`pb-3 font-black text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'isolated' ? 'border-[#F25C05] text-gray-900 dark:text-zinc-100' : 'border-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}
        >
          Изолированная аналитика
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-8 flex flex-col md:flex-row items-end gap-4 relative z-20 transition-all duration-300">
        
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wider transition-colors">Период (От и До)</label>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full md:w-40 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"/>
            <span className="text-gray-300 dark:text-zinc-600 font-bold">-</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full md:w-40 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-[#F25C05] dark:focus:border-[#F25C05] font-bold text-gray-700 dark:text-zinc-300 text-xs sm:text-sm transition-colors [color-scheme:light] dark:[color-scheme:dark]"/>
          </div>
        </div>

        {activeTab === 'isolated' && (
          <div className="relative w-full md:w-auto md:min-w-[250px] z-30">
            <label className="block text-[10px] font-bold text-[#F25C05] mb-1 uppercase tracking-wider">Выберите Чек-листы</label>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full p-2.5 rounded-xl border outline-none font-bold text-sm cursor-pointer flex justify-between items-center transition-colors ${isDropdownOpen ? 'border-[#F25C05] bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100' : 'bg-[#FFF6F0] dark:bg-[#F25C05]/10 border-orange-200 dark:border-orange-500/30 text-gray-800 dark:text-orange-400'}`}
            >
              <span className="truncate pr-2">
                {selectedChecklists.length === 0 ? 'Выберите чек-лист' : `Выбрано: ${selectedChecklists.length}`}
              </span>
              <svg className={`w-4 h-4 text-orange-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[240px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar transition-colors">
                  {data.availableChecklists.map(c => {
                    const isChecked = selectedChecklists.includes(c.id);
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => toggleChecklist(c.id)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors group"
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[#F25C05] border-[#F25C05]' : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-[#F25C05]'}`}>
                          {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-sm truncate select-none ${isChecked ? 'font-bold text-gray-900 dark:text-zinc-100' : 'font-medium text-gray-700 dark:text-zinc-400'}`}>{c.title}</span>
                      </div>
                    );
                  })}
                  {data.availableChecklists.length === 0 && <div className="p-3 text-center text-sm font-bold text-gray-400 dark:text-zinc-600">Нет чек-листов</div>}
                </div>
              </>
            )}
          </div>
        )}

        {(dateFrom || dateTo || selectedChecklists.length > 0) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setSelectedChecklists([]); }} className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 rounded-xl transition-all h-[42px] flex items-center justify-center border border-gray-200 dark:border-zinc-700 active:scale-95">
            ✕ Сбросить
          </button>
        )}
      </div>

      {activeTab === 'isolated' && selectedChecklists.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-dashed border-gray-300 dark:border-zinc-700 text-center transition-colors duration-300">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 dark:text-zinc-400 font-bold text-lg">Выберите чек-лист в фильтре выше,<br/>чтобы увидеть изолированную статистику.</p>
        </div>
      ) : (
        <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-start gap-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-colors">📊</div>
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1 transition-colors">Всего аудитов</div>
                <div className="text-4xl font-black text-gray-900 dark:text-zinc-100 leading-none transition-colors">{data.totalAudits}</div>
                <TrendBadge trend={data.trends.total} />
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-start gap-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-[#F25C05] dark:text-[#F25C05] rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-colors">⭐</div>
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1 transition-colors">Средний балл</div>
                <div className="text-4xl font-black text-gray-900 dark:text-zinc-100 leading-none flex items-baseline gap-2 transition-colors">
                  {data.avgScore} <span className="text-lg text-gray-400 dark:text-zinc-600 font-black tracking-tight">({data.avgPct}%)</span>
                </div>
                <TrendBadge trend={data.trends.score} />
              </div>
            </div>
          </div>

          {/* ТЕКСТОВЫЙ ОТЧЕТ */}
          {activeTab === 'isolated' && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-zinc-950 dark:to-zinc-900 p-6 md:p-8 rounded-3xl shadow-lg border dark:border-zinc-800 mb-8 text-white relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z"/></svg>
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                  <h2 className="text-xl font-black mb-1">Детализация (Текстовый отчет)</h2>
                  <p className="text-gray-400 text-sm font-medium">Готовый формат для отправки в рабочие чаты</p>
                </div>
                <button 
                  onClick={handleCopyTextReport}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Скопировать текст
                </button>
              </div>

              {/* ПРЕДПРОСМОТР ОТЧЕТА */}
              <div className="bg-black/30 p-5 rounded-2xl border border-white/10 text-sm font-mono text-gray-300 h-64 overflow-y-auto custom-scrollbar">
                
                <div className="font-bold text-white mb-2">🚨 Провалившиеся точки (Красная зона)</div>
                {data.report.failedLocations.slice(0, 5).map((loc, i) => (
                  <div key={i}>• {loc.name} — {loc.score}/{loc.maxScore} ({loc.pct}%), ТУ: {loc.tu}, критических: {loc.criticalCount} шт</div>
                ))}
                {data.report.failedLocations.length > 5 && <div className="italic opacity-50 mt-1">...и еще {data.report.failedLocations.length - 5} точек</div>}
                {data.report.failedLocations.length === 0 && <div className="opacity-50 text-green-400">Нет провалившихся точек 🎉</div>}
                
                <div className="font-bold text-white mt-6 mb-2">📊 Детализация по пунктам (Топ нарушений)</div>
                {data.report.problems.slice(0, 8).map((p, i) => (
                  <div key={i} className="mb-1">
                    • {p.question}. — {p.count} случаев ({p.pct}%), прошлая неделя: {p.prevCount} случаев ({p.prevPct}%), Δ: {p.delta > 0 ? `+${p.delta}` : p.delta}
                  </div>
                ))}
                {data.report.problems.length > 8 && <div className="italic opacity-50 mt-1">...и еще {data.report.problems.length - 8} нарушений</div>}
                {data.report.problems.length === 0 && <div className="opacity-50">Нарушений нет</div>}

                <div className="font-bold text-white mt-6 mb-2">❌ Критические замечания по точкам</div>
                {data.report.criticalViolations.slice(0, 5).map((cv, i) => (
                  <div key={i} className="mb-3">
                    <div className="text-white bg-white/5 inline-block px-2 py-0.5 rounded mb-1">{cv.locationName} ({cv.tu})</div>
                    {cv.questions.map((q, j) => <div key={j} className="pl-2 border-l border-red-500/50 ml-1">• {q}</div>)}
                  </div>
                ))}
                {data.report.criticalViolations.length > 5 && <div className="italic opacity-50 mt-1">...и еще {data.report.criticalViolations.length - 5} точек</div>}
                {data.report.criticalViolations.length === 0 && <div className="opacity-50">Нет критических нарушений</div>}
                
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 transition-colors">Зоны качества (Аудиты)</h2>
              {data.zones.reduce((a, b) => a + b.value, 0) === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-600 font-bold">Нет данных</div>
              ) : (
                <>
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.zones} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={2} dataKey="value" stroke="none" labelLine={false} label={renderCustomizedLabel}>
                          {data.zones.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDark ? '#f4f4f5' : '#111827' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-gray-900 dark:text-zinc-100 transition-colors">{data.zones.reduce((a, b) => a + b.value, 0)}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 mt-1 transition-colors">Аудитов</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6">
                    {data.zones.map(z => (
                      <div key={z.name} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-zinc-400 transition-colors">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: z.fill }}></span>
                        <span className="text-gray-900 dark:text-zinc-200">{z.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 transition-colors">
                Количество проверок <span className="text-[#F25C05] text-xs font-bold ml-2 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">{data.trendType}</span>
              </h2>
              {data.trendData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-600 font-bold">Нет данных</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="count" name="Аудитов" stroke="#F25C05" strokeWidth={4} dot={{ r: 4, strokeWidth: 3, fill: isDark ? '#18181b' : '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#F25C05' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 flex items-center transition-colors">
                Динамика качества <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold ml-2 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">По неделям</span>
              </h2>
              {data.wowData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-600 font-bold">Нет данных</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.wowData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`${val}%`, 'Качество']} />
                      <Line type="monotone" dataKey="pct" name="Качество" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 3, fill: isDark ? '#18181b' : '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 flex items-center transition-colors">
                Динамика качества <span className="text-blue-600 dark:text-blue-400 text-xs font-bold ml-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">По месяцам</span>
              </h2>
              {data.momData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-600 font-bold">Нет данных</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.momData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke={isDark ? "#52525b" : "#9ca3af"} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`${val}%`, 'Качество']} />
                      <Line type="monotone" dataKey="pct" name="Качество" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 3, fill: isDark ? '#18181b' : '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2 transition-colors">🏆 Лидеры (Топ-5)</h2>
              <div className="space-y-3">
                {data.topLocations.map((loc, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-green-50/50 dark:bg-green-900/10 border border-green-100/50 dark:border-green-900/30 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
                    <span className="font-bold text-gray-700 dark:text-zinc-300 text-sm truncate pr-2 transition-colors"><span className="text-green-500 mr-2">{i + 1}.</span> {loc.name}</span>
                    <span className="font-black text-green-600 dark:text-green-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/50 shadow-sm shrink-0 flex items-center gap-1 transition-colors">
                      {loc.avg} б. <span className="text-[11px] opacity-70">({loc.avgPct}%)</span>
                    </span>
                  </div>
                ))}
                {data.topLocations.length === 0 && <div className="text-sm font-bold text-gray-400 dark:text-zinc-600 text-center py-4">Нет данных за период</div>}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2 transition-colors">⚠️ Требуют внимания</h2>
              <div className="space-y-3">
                {data.bottomLocations.map((loc, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/30 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <span className="font-bold text-gray-700 dark:text-zinc-300 text-sm truncate pr-2 transition-colors"><span className="text-red-400 mr-2">{i + 1}.</span> {loc.name}</span>
                    <span className="font-black text-red-500 dark:text-red-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50 shadow-sm shrink-0 flex items-center gap-1 transition-colors">
                      {loc.avg} б. <span className="text-[11px] opacity-70">({loc.avgPct}%)</span>
                    </span>
                  </div>
                ))}
                {data.bottomLocations.length === 0 && <div className="text-sm font-bold text-gray-400 dark:text-zinc-600 text-center py-4">Нет данных за период</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}