'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalAudits: number;
  avgScore: number;
  trends: { total: number | null; score: number | null };
  zones: { name: string; value: number; fill: string }[];
  trendData: { date: string; count: number }[];
  topLocations: { name: string; avg: number }[];
  bottomLocations: { name: string; avg: number }[];
  trendType: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false); 

  // Устанавливаем текущий месяц по умолчанию
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

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Функция для отрисовки процентов внутри круговой диаграммы
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

  // Компонент для бейджа динамики
  const TrendBadge = ({ trend }: { trend: number | null }) => {
    if (trend === null) return null;
    const isPositive = trend > 0;
    const isNeutral = trend === 0;
    
    return (
      <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
        isPositive ? 'bg-green-50 text-green-700 border-green-100' : 
        isNeutral ? 'bg-gray-50 text-gray-500 border-gray-100' : 
        'bg-red-50 text-red-700 border-red-100'
      }`}>
        <span className="text-sm font-black">{isPositive ? '↑' : isNeutral ? '—' : '↓'} {Math.abs(trend)}%</span>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">к прошлому периоду</span>
      </div>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 font-bold animate-pulse">Сбор аналитики...</div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-red-500 font-bold">Ошибка загрузки данных</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 relative">
      
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Аналитика сети</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base font-medium">Сводная информация по проверкам</p>
      </div>

      {/* ПАНЕЛЬ ФИЛЬТРОВ ПО ДАТЕ */}
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-end gap-4 relative z-20">
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Период (От и До)</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full md:w-40 p-2.5 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:bg-white focus:border-[#F25C05] font-bold text-gray-700 text-xs sm:text-sm transition-colors"
            />
            <span className="text-gray-300 font-bold">-</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full md:w-40 p-2.5 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:bg-white focus:border-[#F25C05] font-bold text-gray-700 text-xs sm:text-sm transition-colors"
            />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button 
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs font-bold text-[#F25C05] hover:text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl transition-colors h-[42px] flex items-center justify-center"
          >
            ✕ Сбросить фильтр
          </button>
        )}
      </div>

      {/* Затемнение при загрузке новых данных */}
      <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {/* KPI КАРТОЧКИ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shrink-0">📊</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Всего аудитов</div>
              <div className="text-4xl font-black text-gray-900 leading-none">{data.totalAudits}</div>
              <TrendBadge trend={data.trends.total} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-5">
            <div className="w-16 h-16 bg-orange-50 text-[#F25C05] rounded-2xl flex items-center justify-center text-3xl shrink-0">⭐</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Средний балл</div>
              <div className="text-4xl font-black text-gray-900 leading-none">{data.avgScore}</div>
              <TrendBadge trend={data.trends.score} />
            </div>
          </div>
        </div>

        {/* ГРАФИКИ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Светофор с ПРОЦЕНТАМИ */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6">Зоны качества (Дни)</h2>
            {data.zones.reduce((a, b) => a + b.value, 0) === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 font-bold">Нет данных за период</div>
            ) : (
              <>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={data.zones} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={65} 
                        outerRadius={105} 
                        paddingAngle={2} 
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                        label={renderCustomizedLabel} // <-- ПРОЦЕНТЫ ЗДЕСЬ
                      >
                        {data.zones.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} itemStyle={{ color: '#111827' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-gray-900">{data.zones.reduce((a, b) => a + b.value, 0)}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Оценок</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6">
                  {data.zones.map(z => (
                    <div key={z.name} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: z.fill }}></span>
                      {z.name}: <span className="text-gray-900">{z.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Динамика */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6">
              Динамика проверок <span className="text-[#F25C05] text-sm font-bold ml-2 bg-orange-50 px-2 py-1 rounded-lg">{data.trendType}</span>
            </h2>
            {data.trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 font-bold">Нет данных за период</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="count" name="Аудитов" stroke="#F25C05" strokeWidth={4} dot={{ r: 4, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#F25C05' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* РЕЙТИНГИ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">🏆 Лидеры (Топ-5)</h2>
            <div className="space-y-3">
              {data.topLocations.map((loc, i) => (
                <div key={i} className="flex justify-between items-center p-3.5 bg-green-50/50 border border-green-100/50 rounded-2xl hover:bg-green-50 transition-colors">
                  <span className="font-bold text-gray-700 text-sm truncate pr-2"><span className="text-green-500 mr-2">{i + 1}.</span> {loc.name}</span>
                  <span className="font-black text-green-600 bg-white px-3 py-1 rounded-lg border border-green-100 shadow-sm shrink-0">{loc.avg} б.</span>
                </div>
              ))}
              {data.topLocations.length === 0 && <div className="text-sm font-bold text-gray-400 text-center py-4">Нет данных за период</div>}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">⚠️ Требуют внимания</h2>
            <div className="space-y-3">
              {data.bottomLocations.map((loc, i) => (
                <div key={i} className="flex justify-between items-center p-3.5 bg-red-50/50 border border-red-100/50 rounded-2xl hover:bg-red-50 transition-colors">
                  <span className="font-bold text-gray-700 text-sm truncate pr-2"><span className="text-red-400 mr-2">{i + 1}.</span> {loc.name}</span>
                  <span className="font-black text-red-500 bg-white px-3 py-1 rounded-lg border border-red-100 shadow-sm shrink-0">{loc.avg} б.</span>
                </div>
              ))}
              {data.bottomLocations.length === 0 && <div className="text-sm font-bold text-gray-400 text-center py-4">Нет данных за период</div>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}