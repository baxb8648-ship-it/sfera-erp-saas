import React, { useState } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  BarChart3, 
  Calendar, 
  ArrowRightLeft, 
  Percent, 
  DollarSign, 
  Sparkles,
  Search
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

interface CohortItem {
  cohort: string;
  cohort_size: number;
  total_revenue: number;
  total_cac: number;
  avg_ltv: number;
  avg_cac: number;
  roi: number;
}

interface FunnelStep {
  stage: string;
  count: number;
  conv_base: number;
  conv_prev: number;
}

interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

interface SegmentFinance {
  segment_key: string;
  segment_name: string;
  revenue: number;
  expense: number;
  profit: number;
}

interface AnalyticsData {
  summary: {
    total_revenue: number;
    total_expense: number;
    total_profit: number;
    win_rate: number;
    tenders_won_count: number;
    tenders_total_value: number;
  };
  cohort_data: CohortItem[];
  funnel_data: FunnelStep[];
  category_data: CategoryExpense[];
  segment_data: SegmentFinance[];
}

export const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ltvcac' | 'tenders' | 'finance'>('ltvcac');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cashRegister, setCashRegister] = useState('all');
  
  // Query state for API
  const [appliedFilters, setAppliedFilters] = useState({
    start_date: '',
    end_date: '',
    cash_register: 'all'
  });

  const { data: stats, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analyticsStats', appliedFilters],
    queryFn: () => {
      const params: any = {};
      if (appliedFilters.start_date) params.start_date = appliedFilters.start_date;
      if (appliedFilters.end_date) params.end_date = appliedFilters.end_date;
      if (appliedFilters.cash_register !== 'all') params.cash_register = appliedFilters.cash_register;
      return apiClient.get('/analytics/stats', params);
    }
  });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      start_date: startDate,
      end_date: endDate,
      cash_register: cashRegister
    });
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCashRegister('all');
    setAppliedFilters({
      start_date: '',
      end_date: '',
      cash_register: 'all'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F95700]" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="text-center py-20 glass-panel max-w-lg mx-auto mt-10 p-8 rounded-2xl border-red-100">
        <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Ошибка загрузки аналитики</h3>
        <p className="text-zinc-500 dark:text-zinc-400 mb-4">Не удалось соединиться с API-сервером или загрузить данные.</p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // Bento stat items
  const summaryCards = [
    {
      title: 'Финансовый оборот',
      value: `${stats.summary.total_revenue.toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: 'text-emerald-500 dark:text-emerald-400 border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10',
      shadow: 'hover:shadow-[0_15px_30px_rgba(16,185,129,0.06)] hover:border-emerald-500/20'
    },
    {
      title: 'Суммарные расходы',
      value: `${stats.summary.total_expense.toLocaleString('ru-RU')} ₽`,
      icon: Wallet,
      color: 'text-rose-500 dark:text-rose-400 border-rose-500/10 dark:border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10',
      shadow: 'hover:shadow-[0_15px_30px_rgba(244,63,94,0.06)] hover:border-rose-500/20'
    },
    {
      title: 'Чистая прибыль',
      value: `${stats.summary.total_profit.toLocaleString('ru-RU')} ₽`,
      icon: DollarSign,
      color: stats.summary.total_profit >= 0 
        ? 'text-[#F95700] dark:text-orange-400 border-[#F95700]/10 dark:border-[#F95700]/20 bg-[#F95700]/5 dark:bg-[#F95700]/10' 
        : 'text-red-500 dark:text-red-400 border-red-500/10 dark:border-red-500/20 bg-red-500/5 dark:bg-red-500/10',
      shadow: 'hover:shadow-[0_15px_30px_rgba(249,87,0,0.06)] hover:border-[#F95700]/20'
    },
    {
      title: 'Выиграно тендеров',
      value: `${stats.summary.win_rate}% (${stats.summary.tenders_won_count} шт.)`,
      icon: Percent,
      color: 'text-purple-500 dark:text-purple-400 border-purple-500/10 dark:border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10',
      shadow: 'hover:shadow-[0_15px_30px_rgba(168,85,247,0.06)] hover:border-purple-500/20'
    }
  ];

  // Helper to render LTV/CAC SVG comparison chart
  const renderCohortChart = () => {
    const data = stats.cohort_data;
    if (data.length === 0) {
      return (
        <div className="py-20 text-center text-zinc-400 dark:text-zinc-500">
          Нет достаточных данных для визуализации когорт
        </div>
      );
    }

    const chartHeight = 180;
    const chartWidth = 600;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const graphWidth = chartWidth - paddingLeft - paddingRight;

    // Find max value for scaling Y-axis
    const maxVal = Math.max(
      ...data.map(d => Math.max(d.avg_ltv, d.avg_cac)),
      10000 // min scale limit
    );

    const xStep = data.length > 1 ? graphWidth / (data.length - 1) : graphWidth;

    // Build SVG path points
    let ltvPoints = '';
    let cacPoints = '';

    data.forEach((d, idx) => {
      const x = paddingLeft + idx * xStep;
      const yLtv = paddingTop + graphHeight - (d.avg_ltv / maxVal) * graphHeight;
      const yCac = paddingTop + graphHeight - (d.avg_cac / maxVal) * graphHeight;
      
      ltvPoints += `${idx === 0 ? 'M' : 'L'} ${x} ${yLtv} `;
      cacPoints += `${idx === 0 ? 'M' : 'L'} ${x} ${yCac} `;
    });

    const yTicks = [0, maxVal * 0.5, maxVal];

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[500px] h-auto font-sans text-[10px] fill-zinc-400 dark:fill-zinc-500">
          {/* Background Grid Lines */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + graphHeight - (tick / maxVal) * graphHeight;
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={chartWidth - paddingRight} 
                  y2={y} 
                  className="stroke-zinc-100 dark:stroke-zinc-800" 
                  strokeDasharray="4 4"
                />
                <text x={paddingLeft - 10} y={y + 3} textAnchor="end">
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k ₽` : `${tick} ₽`}
                </text>
              </g>
            );
          })}

          {/* X Axis labels */}
          {data.map((d, idx) => {
            const x = paddingLeft + idx * xStep;
            return (
              <text key={idx} x={x} y={chartHeight - 10} textAnchor="middle">
                {d.cohort}
              </text>
            );
          })}

          {/* Trend lines */}
          {data.length > 1 && (
            <>
              {/* CAC Line (Orange) */}
              <path 
                d={cacPoints} 
                fill="none" 
                className="stroke-[#F95700] stroke-[2.5]" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              {/* LTV Line (Emerald) */}
              <path 
                d={ltvPoints} 
                fill="none" 
                className="stroke-emerald-500 stroke-[2.5]" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Data points */}
          {data.map((d, idx) => {
            const x = paddingLeft + idx * xStep;
            const yLtv = paddingTop + graphHeight - (d.avg_ltv / maxVal) * graphHeight;
            const yCac = paddingTop + graphHeight - (d.avg_cac / maxVal) * graphHeight;

            return (
              <g key={idx}>
                {/* LTV Dot */}
                <circle 
                  cx={x} 
                  cy={yLtv} 
                  r="4" 
                  className="fill-emerald-500 stroke-white dark:stroke-zinc-900 stroke-[2]" 
                />
                {/* CAC Dot */}
                <circle 
                  cx={x} 
                  cy={yCac} 
                  r="4" 
                  className="fill-[#F95700] stroke-white dark:stroke-zinc-900 stroke-[2]" 
                />
              </g>
            );
          })}
        </svg>
        <div className="flex justify-center space-x-6 text-xs font-bold mt-2 text-zinc-650 dark:text-zinc-300">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            Средний LTV (Доход на клиента)
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-[#F95700] mr-2 shadow-[0_0_8px_rgba(249,87,0,0.3)]" />
            Средний CAC (Стоимость привлечения)
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 flex flex-col h-full min-h-0 pb-12 sm:pb-16">
      <Helmet>
        <title>Аналитика | СФЕРА</title>
      </Helmet>

      {/* Title Bar */}
      <div className="glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl shadow-[0_8px_30px_rgba(249,87,0,0.01)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
            Сквозная Бизнес-Аналитика
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Оценка эффективности маркетинга, конверсии тендерных заявок и финансовых результатов</p>
        </div>

        {/* Tab Switcher */}
        <div 
          className="flex space-x-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm overflow-x-auto scrollbar-none w-full sm:w-auto flex-nowrap"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {[
            { id: 'ltvcac', label: 'Маркетинг (LTV & CAC)', icon: Users },
            { id: 'tenders', label: 'Воронка тендеров', icon: BarChart3 },
            { id: 'finance', label: 'Финансовые отчеты', icon: Wallet }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range & Cash Register Filter Bar */}
      <div className="glass-panel p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <form onSubmit={handleApplyFilters} className="flex flex-col lg:flex-row items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-[#F95700]" /> Дата начала
              </label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
              />
            </div>
            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-[#F95700]" /> Дата окончания
              </label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
              />
            </div>
            {/* Cash Register Switch */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center">
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-[#F95700]" /> Касса
              </label>
              <select
                value={cashRegister}
                onChange={(e) => setCashRegister(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
              >
                <option value="all">Сводный баланс (Все)</option>
                <option value="works">Касса Работ (Работы)</option>
                <option value="materials">Касса: Товары и материалы</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto">
            <button
              type="submit"
              className="flex-1 lg:flex-none flex items-center justify-center px-4 py-2.5 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#F95700]/15 select-none cursor-pointer active:scale-95"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" /> Применить
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex-1 lg:flex-none px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-350 rounded-xl text-xs font-bold transition-all select-none cursor-pointer active:scale-95"
            >
              Сбросить
            </button>
          </div>
        </form>
      </div>

      {/* Bento Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`glass-panel p-6 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:-translate-y-1 transition-all duration-300 group border ${card.shadow}`}
            >
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-extrabold mb-1">{card.title}</p>
                <h3 className="text-xl lg:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 font-['Montserrat']">
                  {card.value}
                </h3>
              </div>
              <div className={`p-3 rounded-xl border transition-all duration-300 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1">
        {activeTab === 'ltvcac' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cohort SVG Chart (Spans 2 cols) */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-[#F95700] animate-pulse" /> Динамика LTV vs CAC по когортам
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Визуальное сравнение ценности клиента и расходов на его привлечение</p>
              </div>
              
              <div className="pt-4">
                {renderCohortChart()}
              </div>
            </div>

            {/* Premium explanation sidebar (1 col) */}
            <div className="glass-panel p-6 rounded-2xl space-y-5 bg-gradient-to-br from-[#F95700]/5 to-transparent dark:from-[#F95700]/5 dark:to-transparent">
              <h3 className="text-sm font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[#F95700]">
                Метрики когортного анализа
              </h3>
              
              <div className="space-y-4 text-xs leading-relaxed text-zinc-650 dark:text-zinc-400">
                <div className="p-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-800">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">LTV (Lifetime Value)</span>
                  Средняя суммарная выручка, которую приносит один привлеченный клиент за все время взаимодействия.
                </div>
                <div className="p-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-800">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">CAC (Customer Acquisition Cost)</span>
                  Средняя стоимость затрат на привлечение одного платящего клиента в определенном месяце.
                </div>
                <div className="p-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-800">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">ROI привлечения (%)</span>
                  Коэффициент возврата маркетинговых инвестиций. Рассчитывается как: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-amber-600">(LTV / CAC) * 100</code>.
                </div>
              </div>
            </div>

            {/* Cohort Table (Spans all columns) */}
            <div className="glass-panel rounded-2xl lg:col-span-3 overflow-hidden shadow-sm border">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/30">
                <h3 className="text-sm font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">Детальный когортный отчет</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100/50 dark:bg-zinc-800/30 text-zinc-400 dark:text-zinc-550 border-b border-zinc-200/50 dark:border-zinc-800 font-extrabold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Когорта (Месяц)</th>
                      <th className="px-6 py-3.5 text-center">Размер когорты</th>
                      <th className="px-6 py-3.5 text-right">Расходы привлечения (CAC)</th>
                      <th className="px-6 py-3.5 text-right">Доход когорты</th>
                      <th className="px-6 py-3.5 text-right">Средний CAC</th>
                      <th className="px-6 py-3.5 text-right">Средний LTV</th>
                      <th className="px-6 py-3.5 text-right">ROI привлечения</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                    {stats.cohort_data.map((c, i) => {
                      const isHighRoi = c.roi >= 150;
                      const isLowRoi = c.roi < 100;
                      
                      return (
                        <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{c.cohort}</td>
                          <td className="px-6 py-4 text-center font-bold text-zinc-650 dark:text-zinc-400">{c.cohort_size} кл.</td>
                          <td className="px-6 py-4 text-right font-medium">{c.total_cac.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-6 py-4 text-right font-medium">{c.total_revenue.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400">{c.avg_cac.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-200">{c.avg_ltv.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-sm ${
                              isHighRoi 
                                ? 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : isLowRoi 
                                ? 'bg-red-500/10 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}>
                              {c.roi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tender conversion funnel chart */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-8">
              <div>
                <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
                  Воронка конверсии участия в тендерах
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Показатели прохождения этапов biding-процесса и их взаимная конверсия</p>
              </div>

              {/* Vertical Funnel visual (Custom Awwwards bar design) */}
              <div className="space-y-5 py-4 max-w-xl mx-auto">
                {stats.funnel_data.map((step, idx) => {
                  // Width shrinks from 100% to 50% down the funnel
                  const barWidths = ["w-full", "w-11/12 sm:w-[92%]", "w-5/6 sm:w-[84%]", "w-2/3 sm:w-[70%]"];
                  const gradients = [
                    "from-zinc-800 to-zinc-700 dark:from-zinc-750 dark:to-zinc-800",
                    "from-indigo-650 to-indigo-500",
                    "from-purple-650 to-purple-500",
                    "from-[#F95700] to-orange-500"
                  ];
                  const glows = [
                    "",
                    "shadow-[0_4px_12px_rgba(79,70,229,0.2)]",
                    "shadow-[0_4px_12px_rgba(147,51,234,0.2)]",
                    "shadow-[0_4px_12px_rgba(249,87,0,0.25)]"
                  ];

                  return (
                    <div key={idx} className="flex flex-col space-y-1.5 items-center">
                      <div className="flex justify-between items-center w-full max-w-xl px-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        <span>{step.stage}</span>
                        <span>{step.count} тенд.</span>
                      </div>
                      
                      <div className={`relative flex items-center justify-between px-4 py-3 text-white rounded-xl bg-gradient-to-r font-extrabold text-sm ${barWidths[idx]} ${gradients[idx]} ${glows[idx]}`}>
                        <span>Конверсия от входа:</span>
                        <span>{step.conv_base}%</span>
                        
                        {/* Previous stage conversion arrow indicators */}
                        {idx > 0 && (
                          <div className="absolute -top-4 right-4 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 px-2 py-0.5 rounded-md text-[9px] font-black text-zinc-650 dark:text-zinc-400 shadow-sm">
                            Шаг: {step.conv_prev}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side tender metrics bento card */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Эффективность тендеров
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 dark:border-purple-500/20 rounded-xl">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block mb-1">Win Rate (Конверсия побед)</span>
                    <span className="text-2xl font-black font-['Montserrat'] text-purple-600 dark:text-purple-400">{stats.summary.win_rate}%</span>
                    <p className="text-[10px] text-zinc-500 mt-1">Отношение выигранных тендеров к общему числу проанализированных заявок в выбранный период.</p>
                  </div>
                  <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/10 dark:border-orange-500/20 rounded-xl">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block mb-1">Общий объем выигранных контрактов</span>
                    <span className="text-xl font-black font-['Montserrat'] text-[#F95700] dark:text-orange-400">{stats.summary.tenders_total_value.toLocaleString('ru-RU')} ₽</span>
                    <p className="text-[10px] text-zinc-500 mt-1">Общая сумма денежных средств по всем выигранным тендерам.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                💡 <b>Рекомендация:</b> Если конверсия на шаге «Заявка подана → Выигран» опускается ниже 20%, рекомендуется провести повторный аудит тендерной документации и оптимизировать ценообразование.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Category Expenses Breakdown (1 col) */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
                  Расходы по категориям
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Распределение операционных затрат по статьям бюджета</p>
              </div>

              {stats.category_data.length === 0 ? (
                <div className="py-20 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  Нет расходов по кассе в выбранном диапазоне
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.category_data.map((cat, idx) => {
                    const colors = [
                      "bg-blue-500", "bg-rose-500", "bg-amber-500", "bg-purple-500", "bg-emerald-500", "bg-indigo-500"
                    ];
                    const activeColor = colors[idx % colors.length];

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-zinc-650 dark:text-zinc-300">{cat.category}</span>
                          <span className="text-zinc-500">{cat.percentage}%</span>
                        </div>
                        {/* Bar */}
                        <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${activeColor}`} 
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-400 text-right">
                          {cat.amount.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Segment profitability breakdown (2 cols) */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-bold font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
                  Прибыльность по отраслевым сегментам
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Финансовые показатели по ключевым секторам рынка</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.segment_data.map((seg, idx) => {
                  const isProfitable = seg.profit >= 0;
                  const margin = seg.revenue > 0 ? (seg.profit / seg.revenue) * 100 : 0.0;
                  
                  return (
                    <div 
                      key={idx} 
                      className="p-5 border border-zinc-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 rounded-xl space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.005)] hover:shadow-md transition-all duration-300 hover:border-[#F95700]/15"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-200 uppercase tracking-wide truncate max-w-[140px]" title={seg.segment_name}>
                          {seg.segment_name}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                          margin >= 25 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : margin > 0 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                          Маржа: {margin.toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold">
                        <div className="flex justify-between">
                          <span>Доходы (Выручка)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-300">{seg.revenue.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Расходы (Затраты)</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-300">{seg.expense.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1.5 flex justify-between font-extrabold text-xs">
                          <span>Прибыль</span>
                          <span className={isProfitable ? 'text-emerald-500' : 'text-red-500'}>
                            {isProfitable ? '+' : ''}{seg.profit.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
