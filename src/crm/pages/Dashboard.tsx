import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Building2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import type { Tender } from '../../types';

interface ChartDataItem {
  month: string;
  income: number;
  expense: number;
}

interface SegmentDataItem {
  name: string;
  value: number;
  revenue: number;
}

interface StatusDataItem {
  name: string;
  value: number;
}

interface StatsData {
  new_leads: number;
  active_projects: number;
  monthly_revenue: number;
  conversion: number;
  chart_data: ChartDataItem[];
  segment_data: SegmentDataItem[];
  status_data: StatusDataItem[];
}

export const Dashboard: React.FC = () => {
  const [cashRegister, setCashRegister] = useState<string>('');

  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ['dashboardStats', cashRegister],
    queryFn: () => {
      const queryParam = cashRegister ? { cash_register: cashRegister } : undefined;
      return apiClient.get('/dashboard/stats', queryParam);
    }
  });

  const { data: tenders = [] } = useQuery<Tender[]>({
    queryKey: ['dashboardTenders'],
    queryFn: () => apiClient.get('/tenders/')
  });

  const getDeadlineDaysLeft = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Истек';
    if (days === 1) return 'Остался 1 день';
    if (days <= 4) return `Осталось ${days} дня`;
    return `Осталось ${days} дней`;
  };

  const upcomingDeadlines = React.useMemo(() => {
    return tenders
      .filter(t => t.submission_deadline && new Date(t.submission_deadline).getTime() > Date.now() && t.status !== 'Выигран' && t.status !== 'Проигран')
      .sort((a, b) => new Date(a.submission_deadline!).getTime() - new Date(b.submission_deadline!).getTime())
      .slice(0, 3);
  }, [tenders]);

  const recentEvents = React.useMemo(() => {
    return [
      {
        id: 1,
        title: 'Закупка запущена в работу',
        detail: 'Создан проект на основе выигранного тендера',
        time: '5 минут назад',
        type: 'project',
        icon: Building2,
        iconColor: 'text-orange-500 bg-orange-500/5 border-orange-500/10'
      },
      {
        id: 2,
        title: 'Новая транзакция (Касса)',
        detail: 'Получена оплата от заказчика ООО "Русал"',
        time: '1 час назад',
        type: 'finance',
        icon: TrendingUp,
        iconColor: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10'
      },
      {
        id: 3,
        title: 'Добавлен новый контакт',
        detail: 'Зарегистрирован представитель ООО "Газпром инвест"',
        time: '2 часа назад',
        type: 'client',
        icon: Users,
        iconColor: 'text-blue-500 bg-blue-500/5 border-blue-500/10'
      }
    ];
  }, []);

  // Email Send Modal wrapper (now handled globally in CRMLayout)
  const handleOpenGlobalEmailModal = () => {
    window.dispatchEvent(new Event('open_email_modal'));
  };

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F95700]" />
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Новые лиды', 
      value: stats.new_leads.toString(), 
      icon: Users, 
      color: 'text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30', 
      bg: 'bg-blue-50 dark:bg-blue-900/20' 
    },
    { 
      label: 'В работе (Объекты)', 
      value: stats.active_projects.toString(), 
      icon: Building2, 
      color: 'text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30', 
      bg: 'bg-orange-50 dark:bg-orange-900/20' 
    },
    { 
      label: 'Выручка (мес)', 
      value: `${stats.monthly_revenue.toLocaleString('ru-RU')} ₽`, 
      icon: TrendingUp, 
      color: 'text-green-600 dark:text-emerald-400 border-green-100 dark:border-emerald-900/30', 
      bg: 'bg-green-50 dark:bg-emerald-900/20' 
    },
    { 
      label: 'Конверсия клиентов', 
      value: `${stats.conversion}%`, 
      icon: BarChart3, 
      color: 'text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30', 
      bg: 'bg-purple-50 dark:bg-purple-900/20' 
    },
  ];

  // SVG Chart Calculations
  const chartHeight = 190;
  const chartWidth = 700;
  const paddingBottom = 30;
  const paddingLeft = 60;
  const paddingTop = 15;
  const paddingRight = 20;

  const graphHeight = chartHeight - paddingTop - paddingBottom;
  const graphWidth = chartWidth - paddingLeft - paddingRight;

  // Find max value for scaling
  const maxVal = Math.max(
    ...stats.chart_data.map(d => Math.max(d.income, d.expense)),
    100000 // Minimum scale limit
  );

  // Helper to format values on Y-axis
  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toString();
  };

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <div className="space-y-5 flex flex-col h-full min-h-0 pb-4">
      <Helmet>
        <title>Дашборд | СФЕРА</title>
      </Helmet>

      {/* Top Dashboard Actions (Glassmorphism & Fluid Typo) */}
      <div className="glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl shadow-[0_8px_30px_rgba(249,0,0,0.015)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-start w-full sm:w-auto">
          <div>
            <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Дашборд аналитики
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Живая статистика и показатели эффективности предприятия</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Свитчер касс */}
          <div className="flex space-x-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm w-full sm:w-auto overflow-x-auto">
            {[
              { id: '', label: 'Сводный баланс' },
              { id: 'works', label: 'Работы' },
              { id: 'materials', label: 'ЛКМ и расходники' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setCashRegister(r.id)}
                className={`flex-1 sm:flex-initial px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 select-none cursor-pointer whitespace-nowrap ${cashRegister === r.id ? 'bg-[#F95700] text-white shadow-lg shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento-box Grid (3 Rows Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-auto">
        {/* 4 Stats Cards */}
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const bgGlows = [
            'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/10 dark:border-blue-500/20 text-blue-500 dark:text-blue-400',
            'bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/10 dark:border-orange-500/20 text-[#F95700] dark:text-orange-400',
            'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-500/20 text-emerald-500 dark:text-emerald-400',
            'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/10 dark:border-purple-500/20 text-purple-500 dark:text-purple-400'
          ];
          const shadowGlows = [
            'hover:shadow-[0_15px_30px_rgba(59,130,246,0.08)] hover:border-blue-500/30',
            'hover:shadow-[0_15px_30px_rgba(249,87,0,0.08)] hover:border-[#F95700]/30',
            'hover:shadow-[0_15px_30px_rgba(16,185,129,0.08)] hover:border-emerald-500/30',
            'hover:shadow-[0_15px_30px_rgba(168,85,247,0.08)] hover:border-purple-500/30'
          ];
          
          return (
            <div 
              key={idx} 
              className={`glass-panel p-4 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 group ${shadowGlows[idx]}`}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-1">{stat.label}</p>
                <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 font-['Montserrat']">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${bgGlows[idx]}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}

        {/* Income / Expense chart */}
        <div className="glass-panel rounded-2xl p-5 md:col-span-2 lg:col-span-3 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
                Динамика доходов и расходов
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Соотношение финансовых поступлений и затрат предприятия</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold text-zinc-650 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-200/55 dark:border-zinc-700/50">
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span>Доходы</span>
              </div>
              <div className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <span>Расходы</span>
              </div>
            </div>
          </div>

          {/* SVG Custom Responsive Bar Chart */}
          <div className="relative w-full overflow-x-auto pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[600px] h-auto overflow-visible">
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.05"/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.05"/>
                </linearGradient>
                <filter id="shadowIncome" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#10B981" floodOpacity="0.25" />
                </filter>
                <filter id="shadowExpense" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#F43F5E" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Y Axis Grid Lines */}
              {yTicks.map((tick, idx) => {
                const y = chartHeight - paddingBottom - (tick / maxVal) * graphHeight;
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={chartWidth - paddingRight} 
                      y2={y} 
                      className="stroke-zinc-150 dark:stroke-zinc-800/40"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      className="text-[10px] fill-zinc-450 dark:fill-zinc-500 font-bold"
                      textAnchor="end"
                    >
                      {formatYAxis(tick)} ₽
                    </text>
                  </g>
                );
              })}

              {/* X Axis Line */}
              <line 
                x1={paddingLeft} 
                y1={chartHeight - paddingBottom} 
                x2={chartWidth - paddingRight} 
                y2={chartHeight - paddingBottom} 
                className="stroke-zinc-200 dark:stroke-zinc-800/80"
                strokeWidth={1}
              />

              {/* Data Bars */}
              {stats.chart_data.map((data, idx) => {
                const barSpacing = graphWidth / stats.chart_data.length;
                const xCenter = paddingLeft + (idx * barSpacing) + (barSpacing / 2);
                
                const barWidth = Math.min(22, barSpacing * 0.28);
                const gap = 4;
                
                const incomeH = (data.income / maxVal) * graphHeight;
                const expenseH = (data.expense / maxVal) * graphHeight;

                const incomeY = chartHeight - paddingBottom - incomeH;
                const expenseY = chartHeight - paddingBottom - expenseH;

                return (
                  <g key={idx} className="group/bar">
                    {/* Income Bar (Green) */}
                    <rect
                      x={xCenter - barWidth - (gap / 2)}
                      y={incomeY}
                      width={barWidth}
                      height={Math.max(4, incomeH)}
                      rx={6}
                      fill="url(#incomeGradient)"
                      filter="url(#shadowIncome)"
                      className="hover:opacity-90 hover:stroke-emerald-400 hover:stroke-[1.5px] transition-all duration-300 cursor-pointer origin-bottom"
                    >
                      <title>{`Доход: ${data.income.toLocaleString()} ₽`}</title>
                    </rect>

                    {/* Expense Bar (Red) */}
                    <rect
                      x={xCenter + (gap / 2)}
                      y={expenseY}
                      width={barWidth}
                      height={Math.max(4, expenseH)}
                      rx={6}
                      fill="url(#expenseGradient)"
                      filter="url(#shadowExpense)"
                      className="hover:opacity-90 hover:stroke-rose-400 hover:stroke-[1.5px] transition-all duration-300 cursor-pointer origin-bottom"
                    >
                      <title>{`Расход: ${data.expense.toLocaleString()} ₽`}</title>
                    </rect>

                    {/* X Label */}
                    <text
                      x={xCenter}
                      y={chartHeight - paddingBottom + 18}
                      className="text-[10px] fill-zinc-400 dark:fill-zinc-550 font-bold transition-colors group-hover/bar:fill-zinc-800 dark:group-hover/bar:fill-zinc-200"
                      textAnchor="middle"
                    >
                      {data.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Quick info / actions sidebar */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-1 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100 mb-3">
              Сводка состояния
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_2px_10px_rgba(16,185,129,0.05)] rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">Баланс</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">Положительный</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 dark:border-orange-500/30 shadow-[0_2px_10px_rgba(249,87,0,0.05)] rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-[#F95700] shadow-[0_0_8px_rgba(249,87,0,0.5)] animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">В работе</span>
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{stats.active_projects} объекта</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20 dark:border-blue-500/30 shadow-[0_2px_10px_rgba(59,130,246,0.05)] rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">Лиды</span>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-450">Активно ({stats.new_leads})</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800 text-[9px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 text-center mt-2">
            СФЕРА ERP • Обновлено в реальном времени
          </div>
        </div>

        {/* Donut Chart: Market Segments */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2 space-y-4 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300">
          <div>
            <h3 className="text-lg font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Распределение по сегментам
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Доли рынка и количество по категориям контрагентов</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1 pt-1">
            {/* Custom SVG Donut Chart with Glassmorphic Center */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90 overflow-visible">
                <defs>
                  <filter id="donutGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
                  </filter>
                </defs>
                <circle 
                  cx="80" 
                  cy="80" 
                  r="50" 
                  fill="transparent" 
                  className="stroke-zinc-100 dark:stroke-zinc-800/60" 
                  strokeWidth="14" 
                />
                {(() => {
                  const total = stats.segment_data?.reduce((sum, item) => sum + item.value, 0) || 0;
                  const C = 314.16;
                  const R = 50;
                  let accPercent = 0;
                  const colors = ['#F95700', '#6366F1', '#14B8A6', '#10B981', '#F59E0B'];
                  
                  if (total === 0) {
                    return (
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="50" 
                        fill="transparent" 
                        stroke="#e4e4e7" 
                        strokeWidth="14" 
                      />
                    );
                  }
                  
                  return stats.segment_data?.map((item, idx) => {
                    const percent = (item.value / total) * 100;
                    if (percent === 0) return null;
                    const strokeLen = (percent / 100) * C;
                    const strokeOffset = C - (accPercent / 100) * C;
                    accPercent += percent;
                    
                    return (
                      <circle
                        key={idx}
                        cx="80"
                        cy="80"
                        r={R}
                        fill="transparent"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="14"
                        strokeDasharray={`${strokeLen} ${C - strokeLen}`}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        filter="url(#donutGlow)"
                        className="transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.03] origin-center hover:opacity-90"
                      >
                        <title>{`${item.name}: ${item.value} кл. (${percent.toFixed(0)}%)`}</title>
                      </circle>
                    );
                  });
                })()}
              </svg>
              {/* Inner Donut Text with Glassmorphism Overlay */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center pointer-events-none backdrop-blur-md bg-white/40 dark:bg-zinc-900/40 border border-white/25 dark:border-zinc-800/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.05)]">
                <span className="text-2xl font-black font-['Montserrat'] text-zinc-950 dark:text-zinc-50 leading-none">
                  {stats.segment_data?.reduce((sum, item) => sum + item.value, 0) || 0}
                </span>
                <span className="text-[8px] text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-bold mt-1">Клиентов</span>
              </div>
            </div>
            
            {/* Legend & stats list with custom hover states & micro-progress bars */}
            <div className="space-y-2 flex-1 w-full max-w-xs text-left">
              {(() => {
                const total = stats.segment_data?.reduce((sum, item) => sum + item.value, 0) || 0;
                const colors = ['#F95700', '#6366F1', '#14B8A6', '#10B981', '#F59E0B'];
                
                return stats.segment_data?.map((item, idx) => {
                  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div 
                      key={idx} 
                      className="group/item flex flex-col gap-1 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/30 px-2.5 py-1 -mx-2.5 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover/item:scale-110" 
                            style={{ 
                              backgroundColor: colors[idx % colors.length],
                              boxShadow: `0 0 8px ${colors[idx % colors.length]}40`
                            }} 
                          />
                          <span className="text-zinc-700 dark:text-zinc-350 font-semibold truncate max-w-[120px] group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-100 transition-colors" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-200 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-100 transition-colors">{item.value}</span>
                          <span className="text-zinc-400 dark:text-zinc-550 font-bold min-w-[25px] text-right">{percent}%</span>
                        </div>
                      </div>
                      <div className="h-[3px] w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${percent}%`,
                            backgroundColor: colors[idx % colors.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Funnel Chart: Sales pipeline */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2 space-y-4 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300">
          <div>
            <h3 className="text-lg font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Воронка продаж сделок
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Этапы прохождения лидов по воронке конверсии</p>
          </div>
          
          <div className="space-y-3.5 flex-1 justify-center flex flex-col pt-1">
            {(() => {
              const maxCount = Math.max(...(stats.status_data?.map(s => s.value) || []), 1);
              const totalCount = stats.status_data?.reduce((sum, item) => sum + item.value, 0) || 0;
              
              const funnelGradients = [
                'from-[#F95700] via-[#ff7324] to-amber-400 shadow-[0_0_12px_rgba(249,87,0,0.3)]',
                'from-indigo-650 via-indigo-550 to-purple-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
                'from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
                'from-emerald-600 via-emerald-500 to-teal-450 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
                'from-rose-600 via-rose-500 to-orange-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              ];
              
              return stats.status_data?.map((item, idx) => {
                const percentOfMax = (item.value / maxCount) * 100;
                const percentOfTotal = totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0;
                
                return (
                  <div key={idx} className="space-y-1.5 text-left group/funnel cursor-pointer">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 group-hover/funnel:text-zinc-950 dark:group-hover/funnel:text-zinc-100 transition-colors">{item.name}</span>
                      <div className="space-x-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.value}</span>
                        <span className="text-zinc-400 dark:text-zinc-550 font-bold">({percentOfTotal}%)</span>
                      </div>
                    </div>
                    
                    {/* Glowing Glass Tube styling */}
                    <div className="h-3.5 w-full bg-zinc-150/40 dark:bg-zinc-850/30 p-[2px] border border-zinc-200/35 dark:border-zinc-800/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${funnelGradients[idx % funnelGradients.length]} transition-all duration-500 ease-out`}
                        style={{ width: `${percentOfMax}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Row 4: Upcoming Deadlines (lg:col-span-2) + Activity Feed (lg:col-span-1) + Quick Actions (lg:col-span-1) */}
        {/* Upcoming Deadlines Widget */}
        <div className="glass-panel rounded-2xl p-5 md:col-span-2 lg:col-span-2 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300">
          <div>
            <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Ближайшие дедлайны тендеров
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Сроки подачи заявок, требующие внимания</p>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mb-2" />
                <span className="text-xs font-bold">Все заявки отправлены в срок!</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Нет активных дедлайнов</span>
              </div>
            ) : (
              upcomingDeadlines.map((t) => {
                const diffDays = Math.ceil((new Date(t.submission_deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 3;
                return (
                  <div key={t.id} className="flex justify-between items-center p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/45 bg-zinc-50/30 dark:bg-zinc-900/30 hover:border-[#F95700]/25 transition-all">
                    <div className="text-left max-w-[70%]">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" title={t.title}>{t.title}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-0.5 font-medium">{t.platform} • {t.price.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${isUrgent ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 animate-pulse-subtle' : 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/20'}`}>
                        {getDeadlineDaysLeft(t.submission_deadline)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-1 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300">
          <div>
            <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Лента активности
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Последние изменения в CRM-системе</p>
          </div>
          <div className="space-y-3.5">
            {recentEvents.map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.id} className="flex gap-3 text-left font-['Inter'] group/event">
                  <div className={`p-2 rounded-lg border shrink-0 h-fit transition-transform group-hover/event:scale-105 ${ev.iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{ev.title}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 leading-snug">{ev.detail}</p>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-bold block mt-1">{ev.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-panel rounded-2xl p-5 lg:col-span-1 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(249,87,0,0.03)] hover:border-[#F95700]/20 hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300">
          <div>
            <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Быстрые действия
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Часто используемые операции</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={handleOpenGlobalEmailModal}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 hover:bg-orange-50 dark:bg-zinc-800/30 dark:hover:bg-orange-950/20 text-zinc-700 dark:text-zinc-300 hover:text-[#F95700] dark:hover:text-[#F95700] border border-zinc-200/50 dark:border-zinc-700/50 transition-all duration-200 cursor-pointer text-xs font-bold active:scale-[0.98] select-none"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F95700]" />
                <span>Отправить Email</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <a
              href="#/crm/clients"
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/50 hover:bg-orange-50 dark:bg-zinc-800/30 dark:hover:bg-orange-950/20 text-zinc-700 dark:text-zinc-300 hover:text-[#F95700] dark:hover:text-[#F95700] border border-zinc-200/50 dark:border-zinc-700/50 transition-all duration-200 cursor-pointer text-xs font-bold active:scale-[0.98] select-none"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F95700]" />
                <span>Все клиенты</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
