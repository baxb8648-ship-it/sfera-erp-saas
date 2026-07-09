import React from 'react';
import { Sparkles, ArrowRight, Bot, ShieldCheck, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UpsellBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/[0.08] via-orange-500/[0.08] to-[#F95700]/[0.12] dark:from-amber-500/[0.12] dark:via-orange-500/[0.10] dark:to-[#F95700]/[0.15] border border-orange-500/30 dark:border-orange-500/40 p-6 sm:p-8 shadow-lg shadow-orange-500/5 transition-all shrink-0 min-h-[180px] w-full flex flex-col justify-center">
      {/* Декоративное фоновое свечение справа */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-amber-400/20 to-[#F95700]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Левая часть: контент */}
        <div className="flex-1 min-w-0 space-y-3.5">
          {/* Бейдж тарифа */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/25 text-[#F95700] dark:text-orange-400 text-xs font-black tracking-wide uppercase">
            <Crown className="w-3.5 h-3.5" />
            <span>SaaS Enterprise & AI Suite</span>
          </div>

          {/* Заголовок и описание */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-['Montserrat'] tracking-tight text-zinc-900 dark:text-white leading-snug">
              Разблокируйте полную мощность ИИ-агентов и безлимитный ERP
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium mt-1.5 max-w-3xl">
              Перейдите на тариф <span className="font-bold text-zinc-900 dark:text-white underline decoration-[#F95700] decoration-2 underline-offset-4">БИЗНЕС</span> или <span className="font-bold text-zinc-900 dark:text-white underline decoration-orange-500 decoration-2 underline-offset-4">PRO</span>, чтобы снять все ограничения на операции, подключить 12+ автономных ИИ-агентов и получить приоритетную техподдержку 24/7.
            </p>
          </div>

          {/* Фичи (Feature Pills) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-sm">
              <Bot className="w-3.5 h-3.5 text-[#F95700]" />
              <span>12+ ИИ-агентов</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Безлимитные документы и ТМЦ</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>SLA поддержка 24/7</span>
            </div>
          </div>
        </div>

        {/* Правая часть: CTA */}
        <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5">
          <button 
            onClick={() => navigate('/crm/admin')}
            className="group/btn relative inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-extrabold text-sm cursor-pointer transition-all shadow-md shadow-orange-500/25 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Улучшить тариф</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center lg:text-right">
            Активация мгновенно без остановки работы
          </span>
        </div>
      </div>
    </div>
  );
};
