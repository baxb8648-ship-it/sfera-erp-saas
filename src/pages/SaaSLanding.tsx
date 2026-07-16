import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';

// ── Spring easing ──────────────────────────────────────────────────────────────
const SPRING = [0.32, 0.72, 0, 1] as const;
const spring = { ease: SPRING, duration: 0.75 };
const springFast = { ease: SPRING, duration: 0.45 };

// ── Fade-up variant ────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: 'blur(6px)' },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...spring, delay },
  }),
};

// ── Section reveal wrapper ─────────────────────────────────────────────────────
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ── Count-up hook ──────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [inView, target, duration]);
  return { count, ref };
}

// ── Marquee ───────────────────────────────────────────────────────────────────
const companies = [
  'СтройИнвест', 'АгроПрофи', 'МебельМастер', 'ТехноСервис', 'ГрадПроект',
  'ЮграТехника', 'СалонПро', 'ПромАктив', 'ДальСтрой', 'АгроСибирь',
  'МегаСтрой', 'ТехноГрупп', 'СервисПлюс', 'РемСтрой', 'ЭкоАгро',
];

const Marquee: React.FC = () => (
  <div className="relative overflow-hidden">
    <div
      className="flex gap-12 whitespace-nowrap"
      style={{ animation: 'marquee 22s linear infinite' }}
    >
      {[...companies, ...companies].map((c, i) => (
        <span key={i} className="text-sm font-semibold text-zinc-500 shrink-0">
          {c}
        </span>
      ))}
    </div>
    <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#060608] to-transparent pointer-events-none z-10" />
    <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#060608] to-transparent pointer-events-none z-10" />
  </div>
);

// ── Pill badge ────────────────────────────────────────────────────────────────
const PillBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children, color = 'orange',
}) => {
  const colors: Record<string, string> = {
    orange: 'bg-orange-500/10 border-orange-500/30 text-[#F95700]',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${colors[color]}`}>
      {children}
    </span>
  );
};

// ── Double-bezel card ─────────────────────────────────────────────────────────
const BCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: string;
  hover?: boolean;
}> = ({ children, className = '', glow = '', hover = true }) => (
  <div
    className={`
      relative rounded-[2rem] p-[1.5px] bg-white/5
      ring-1 ring-white/[0.07]
      ${hover ? 'transition-all duration-700 hover:ring-orange-500/20 hover:bg-white/[0.07]' : ''}
      ${glow}
      ${className}
    `}
  >
    <div className="rounded-[calc(2rem-1.5px)] bg-zinc-950/90 backdrop-blur-sm h-full
      shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
      {children}
    </div>
  </div>
);

// ── Industry tabs data ────────────────────────────────────────────────────────
const industries = [
  {
    id: 'construction',
    icon: '🏗️',
    label: 'Строительство',
    title: 'Стройте умнее',
    desc: 'Сметы, журнал работ, акты КС-2/КС-3, контроль ГЛОНАСС-телеметрии спецтехники, автосписание ЛКМ и материалов по нормам расхода.',
    features: ['Сметы и акты КС-2/КС-3', 'Журнал фотоотчётов', 'ГЛОНАСС мониторинг', '2D-раскрой плит', 'Тендеры и субподряды'],
    accent: 'text-yellow-400',
    bg: 'from-yellow-500/10 to-transparent',
  },
  {
    id: 'agro',
    icon: '🌾',
    label: 'Агропромышленность',
    title: 'Управляйте полями с точностью',
    desc: 'Интерактивные карты полей (2GIS), учёт ГСМ, севооборот, животноводство с RFID-бирками, автосписание семян и удобрений.',
    features: ['Карты полей 2GIS API', 'Учёт ГСМ и материалов', 'Животноводство по биркам', 'Сезонное планирование', 'Финансы агрокомплекса'],
    accent: 'text-emerald-400',
    bg: 'from-emerald-500/10 to-transparent',
  },
  {
    id: 'furniture',
    icon: '🪵',
    label: 'Производство',
    title: 'BOM и раскрой без Excel',
    desc: 'BOM-спецификации изделий, маршрутные листы производства, математический движок 2D-раскроя с учётом реза и вращения деталей.',
    features: ['BOM-спецификации', 'Математика Guillotine Bin-Packing', 'Маршрутный лист (Канбан)', 'Себестоимость через BOM', 'Отходы и деловые остатки'],
    accent: 'text-amber-400',
    bg: 'from-amber-500/10 to-transparent',
  },
  {
    id: 'beauty',
    icon: '✂️',
    label: 'Услуги и Beauty',
    title: 'Шахматка записей онлайн',
    desc: 'Интерактивная шахматка расписания, онлайн-запись клиентов, техкарты услуг с автосписанием материалов и Telegram-уведомлениями.',
    features: ['Шахматка расписания', 'Онлайн-запись', 'Техкарты списания', 'Telegram HITL бот', 'Касса и интеграция'],
    accent: 'text-purple-400',
    bg: 'from-purple-500/10 to-transparent',
  },
  {
    id: 'fleet',
    icon: '🚜',
    label: 'Аренда спецтехники',
    title: 'Диаграмма Ганта по всему парку',
    desc: 'Шахматка аренды спецтехники (до 14/30 дней), телеметрия ГЛОНАСС в реальном времени, ТО-алерты по моточасам, счета на аренду.',
    features: ['Шахматка аренды (Гант)', 'ГЛОНАСС телеметрия', 'Алерты ТО/ремонт', 'Счета и договоры', 'KPI загрузки парка'],
    accent: 'text-blue-400',
    bg: 'from-blue-500/10 to-transparent',
  },
];

// ── FAQ data ──────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Можно ли начать бесплатно и без карты?',
    a: 'Да. Тариф СТАРТ — бесплатный навсегда. Достаточно ввести ИНН компании. Карта не нужна. 3 ИИ-агента, CRM и задачи уже включены.',
  },
  {
    q: 'Как работает изоляция данных (мультитенантность)?',
    a: 'Каждая компания работает в полностью изолированной среде через Row-Level Security в PostgreSQL Neon. Ни один другой тенант физически не может получить доступ к вашим данным.',
  },
  {
    q: 'Есть ли мобильное приложение?',
    a: 'Да — через Telegram Mini App. Прорабы и сотрудники получают полноценный доступ к CRM прямо в Telegram без установки дополнительных приложений.',
  },
  {
    q: 'Как отменить или сменить тариф?',
    a: 'В разделе «Администрирование → Тариф» в любой момент. Отмена вступает в силу в конце оплаченного периода. Данные хранятся 90 дней после отмены.',
  },
  {
    q: 'Какие данные хранятся в облаке?',
    a: 'Только ваши данные — клиенты, объекты, финансы, документы. Хранилище Neon PostgreSQL расположено в EU (eu-central-1). Бэкапы каждые 6 часов.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const SaaSLanding: React.FC = () => {
  const navigate = useNavigate();
  const [innInput, setInnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string; full_name: string; address: string; director: string;
    ogrn?: string; kpp?: string;
  } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState('construction');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // ── Scroll listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── FNS debounce ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (innInput.length !== 10 && innInput.length !== 12) {
      setCompanyInfo(null); setSearchError(''); return;
    }
    const fetch_ = async () => {
      setIsSearching(true); setSearchError('');
      try {
        const r = await fetch(`${baseUrl}/tenants/suggest/${innInput}`);
        if (r.ok) {
          const d = await r.json();
          if (d?.name) setCompanyInfo(d);
          else { setCompanyInfo(null); setSearchError('Компания не найдена в реестре ЕГРЮЛ/ЕГРИП'); }
        } else { setCompanyInfo(null); setSearchError('Не удалось проверить ИНН в реестре ФНС'); }
      } catch { setSearchError('Ошибка связи с сервером'); }
      finally { setIsSearching(false); }
    };
    const t = setTimeout(fetch_, 420);
    return () => clearTimeout(t);
  }, [innInput, baseUrl]);

  const goRegister = () => {
    if (innInput && (innInput.length === 10 || innInput.length === 12))
      navigate(`/crm/login?tab=register&inn=${innInput}`);
    else navigate('/crm/login?tab=register');
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeInd = industries.find(i => i.id === activeIndustry) ?? industries[0];

  // ── Count-up stats ───────────────────────────────────────────────────────────
  const stat1 = useCountUp(1204);
  const stat2 = useCountUp(47318);
  const stat3 = useCountUp(997);

  // ── Marketplace mock ──────────────────────────────────────────────────────────
  const listings = [
    { title: 'Аренда гусеничного экскаватора JCB 3CX', region: 'Самарская обл.', budget: '150 000 ₽/смена', type: 'Спецтехника', age: '2ч назад' },
    { title: 'Субподряд: Устройство кровли 2 000 м²', region: 'Оренбург', budget: '2 800 000 ₽', type: 'Строительство', age: '5ч назад' },
    { title: 'Закупка: Пшеница 3 класс, 200 т', region: 'Уфа, Башкортостан', budget: 'Договорная', type: 'Агро', age: '7ч назад' },
  ];

  return (
    <>
      {/* ── Global styles ──────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap');
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes ping-slow { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.5);opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-12px) rotate(-3deg)} }
        .float-card { animation: float 5s ease-in-out infinite; }
        * { scroll-behavior: smooth; }
        :root { --font-main: 'Plus Jakarta Sans', sans-serif; --font-mono: 'Geist Mono', monospace; }
      `}</style>

      <div className="min-h-screen text-zinc-100 overflow-x-hidden selection:bg-[#F95700]/25"
        style={{ background: '#060608', fontFamily: 'var(--font-main)' }}>

        {/* ── DOT GRID BACKGROUND ──────────────────────────────────────────── */}
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse 900px 500px at 70% 20%, rgba(249,87,0,0.07) 0%, transparent 60%)' }} />

        {/* ══════════════════════════════════════════════════════════════════════
            NAVBAR — Fluid Island Pill
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springFast, delay: 0.1 }}
            className={`
              flex items-center gap-6 px-5 py-2.5 rounded-full
              ring-1 transition-all duration-500
              ${isScrolled
                ? 'bg-zinc-950/85 backdrop-blur-2xl ring-white/10 shadow-xl shadow-black/40'
                : 'bg-zinc-900/70 backdrop-blur-md ring-white/[0.07]'}
            `}
          >
            {/* Logo */}
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
                style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 0 12px rgba(249,87,0,0.35)' }}>
                С
              </div>
              <span className="text-sm font-black tracking-tight text-white">
                СФЕРУМ<span className="text-[#F95700]">.</span>
              </span>
            </button>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400">
              <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors duration-300">Возможности</button>
              <button onClick={() => scrollTo('industry')} className="hover:text-white transition-colors duration-300">Отрасли</button>
              <button onClick={() => scrollTo('marketplace')} className="hover:text-white transition-colors duration-300">Биржа</button>
              <button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors duration-300">Тарифы</button>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/crm/login')}
                className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors duration-300 px-2 py-1.5">
                Войти
              </button>
              <button onClick={() => scrollTo('register')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white
                  transition-all duration-500 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 0 14px rgba(249,87,0,0.3)' }}>
                Начать бесплатно
                <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center text-[9px]">→</span>
              </button>
            </div>

            {/* Mobile toggle */}
            <button className="md:hidden w-7 h-7 flex flex-col items-center justify-center gap-[5px]"
              onClick={() => setMobileMenuOpen(v => !v)} aria-label="Меню">
              <span className={`block h-[1.5px] bg-zinc-400 rounded-full transition-all duration-300
                ${mobileMenuOpen ? 'w-5 rotate-45 translate-y-[6.5px]' : 'w-5'}`} />
              <span className={`block h-[1.5px] bg-zinc-400 rounded-full transition-all duration-300
                ${mobileMenuOpen ? 'opacity-0 w-0' : 'w-3.5'}`} />
              <span className={`block h-[1.5px] bg-zinc-400 rounded-full transition-all duration-300
                ${mobileMenuOpen ? 'w-5 -rotate-45 -translate-y-[6.5px]' : 'w-5'}`} />
            </button>
          </motion.nav>
        </div>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springFast}
              className="fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-3xl flex flex-col items-center justify-center gap-8"
            >
              {['Возможности', 'Отрасли', 'Биржа', 'Тарифы'].map((label, i) => {
                const ids = ['features', 'industry', 'marketplace', 'pricing'];
                return (
                  <motion.button
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.06 }}
                    onClick={() => scrollTo(ids[i])}
                    className="text-3xl font-bold text-zinc-200 hover:text-[#F95700] transition-colors"
                  >{label}</motion.button>
                );
              })}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.28 }}
                onClick={() => navigate('/crm/login')}
                className="mt-4 px-8 py-3 rounded-full border border-zinc-700 text-zinc-300 font-semibold text-lg"
              >Войти в кабинет</motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO — Asymmetric Split
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100dvh] flex items-center px-6 md:px-16 max-w-[1400px] mx-auto pt-28 pb-24">
          {/* Ambient orb */}
          <div className="absolute right-0 top-1/4 w-[600px] h-[600px] rounded-full pointer-events-none -z-10"
            style={{ background: 'radial-gradient(circle, rgba(249,87,0,0.12) 0%, transparent 65%)' }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
            {/* ── Left: Text ── */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springFast, delay: 0.15 }}
                className="mb-6"
              >
                <PillBadge color="orange">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F95700]"
                    style={{ animation: 'ping-slow 2s ease-in-out infinite' }} />
                  СФЕРУМ 2.0 · Мультитенантная SaaS
                </PillBadge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ ...spring, delay: 0.22 }}
                className="font-black leading-[1.05] tracking-tight mb-6"
                style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)' }}
              >
                Управление бизнесом<br />
                <span style={{ background: 'linear-gradient(92deg,#F95700 0%,#ff9a4d 50%,#ffd89b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  в единой Сфере
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.32 }}
                className="text-zinc-400 leading-relaxed mb-10 max-w-lg"
                style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}
              >
                Интеллектуальная облачная ERP с векторным ИИ (Pinecone RAG), нативным Telegram HITL
                и B2B-маркетплейсом. Полная изоляция данных каждой компании через RLS.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-3 mb-12"
              >
                <button
                  onClick={() => scrollTo('register')}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm text-white
                    transition-all duration-500 active:scale-[0.97] group"
                  style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 0 22px rgba(249,87,0,0.35)' }}
                >
                  <span>Начать бесплатно</span>
                  <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs
                    group-hover:translate-x-0.5 transition-transform duration-300">→</span>
                </button>
                <button
                  onClick={() => navigate('/crm/login')}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
                    text-zinc-300 ring-1 ring-white/10 hover:ring-white/20 hover:text-white
                    transition-all duration-300 bg-white/[0.03] hover:bg-white/[0.06]"
                >
                  Войти в кабинет
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="flex items-center gap-3"
              >
                <div className="flex -space-x-2">
                  {[12, 17, 23, 31].map(seed => (
                    <div key={seed} className="w-8 h-8 rounded-full ring-2 ring-[#060608] bg-zinc-800 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`}
                        alt="" className="w-full h-full opacity-75" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Уже <span className="text-zinc-300 font-bold">1 204</span> компании доверили нам свой бизнес
                </p>
              </motion.div>
            </div>

            {/* ── Right: Floating UI card ── */}
            <motion.div
              initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ ...spring, delay: 0.45 }}
              className="relative hidden lg:block"
            >
              <div className="float-card">
                <BCard className="overflow-hidden" hover={false}>
                  <div className="p-6">
                    {/* Mock header */}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Дашборд</p>
                        <p className="text-base font-bold text-white">ООО МегаСтрой</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        ● ОНЛАЙН
                      </div>
                    </div>
                    {/* KPI tiles */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                      {[
                        { label: 'Выручка', val: '4.7M ₽', color: 'text-[#F95700]' },
                        { label: 'Объекты', val: '12', color: 'text-blue-400' },
                        { label: 'На складе', val: '843 ед', color: 'text-emerald-400' },
                        { label: 'Задачи', val: '28 / 34', color: 'text-amber-400' },
                      ].map(k => (
                        <div key={k.label} className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-3">
                          <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{k.label}</p>
                          <p className={`text-sm font-black ${k.color}`} style={{ fontFamily: 'var(--font-mono)' }}>{k.val}</p>
                        </div>
                      ))}
                    </div>
                    {/* Mini chart */}
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                      <p className="text-[9px] text-zinc-500 font-semibold uppercase mb-2">Поступления, 6 мес</p>
                      <div className="flex items-end gap-1.5 h-14">
                        {[35, 52, 41, 67, 58, 80].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm"
                            style={{ height: `${h}%`, background: `rgba(249,87,0,${0.3 + i * 0.1})` }} />
                        ))}
                      </div>
                    </div>
                    {/* ИИ alert */}
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <span className="text-[#F95700]">🤖</span>
                      <p className="text-[10px] text-zinc-300">PM Copilot: кассовый разрыв через 14 дней</p>
                    </div>
                  </div>
                </BCard>
              </div>

              {/* Decorative glow */}
              <div className="absolute -inset-4 rounded-[3rem] pointer-events-none -z-10"
                style={{ background: 'radial-gradient(circle at 60% 40%, rgba(249,87,0,0.1) 0%, transparent 65%)' }} />
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SOCIAL PROOF
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-16 border-y border-white/[0.04]">
          <Reveal className="text-center mb-6">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-[0.2em]">
              Нам доверяют компании по всей России
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Marquee />
          </Reveal>

          {/* Stats */}
          <div className="max-w-2xl mx-auto mt-14 grid grid-cols-3 gap-8 px-6">
            {[
              { ref: stat1.ref, val: stat1.count, suffix: '+', label: 'компаний работают' },
              { ref: stat2.ref, val: stat2.count, suffix: '+', label: 'задач обработано' },
              { ref: stat3.ref, val: stat3.count / 10, suffix: '%', label: 'аптайм платформы' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <p className="font-black text-white mb-1"
                  style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontFamily: 'var(--font-mono)' }}>
                  <span ref={s.ref as React.RefObject<HTMLSpanElement>}>
                    {i === 2 ? (s.val).toFixed(1) : s.val.toLocaleString('ru')}
                  </span>{s.suffix}
                </p>
                <p className="text-xs text-zinc-500 font-medium">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            INN REGISTRATION WIDGET
        ═══════════════════════════════════════════════════════════════════════ */}
        <section id="register" className="py-28 px-6 max-w-5xl mx-auto">
          <Reveal>
            <BCard className="overflow-hidden" hover={false}>
              <div className="relative p-8 sm:p-12">
                {/* Orb */}
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(249,87,0,0.12) 0%, transparent 65%)' }} />

                <div className="text-center max-w-2xl mx-auto mb-10">
                  <PillBadge color="orange">
                    <span>✦</span> Онлайн B2B-Регистрация
                  </PillBadge>
                  <h2 className="font-black mt-4 mb-3 text-white"
                    style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', lineHeight: 1.1 }}>
                    Мгновенный старт по ИНН
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Введите 10 или 12 цифр ИНН вашей организации — СФЕРУМ автоматически
                    загрузит данные из реестра ЕГРЮЛ/ЕГРИП ФНС и подготовит профиль компании.
                  </p>
                </div>

                <div className="max-w-lg mx-auto">
                  {/* Input */}
                  <div className="relative flex items-center rounded-2xl ring-1 ring-white/[0.08]
                    focus-within:ring-[#F95700]/50 transition-all duration-300 bg-white/[0.03]">
                    <svg className="absolute left-4 w-5 h-5 text-zinc-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                    </svg>
                    <input
                      type="text"
                      maxLength={12}
                      value={innInput}
                      onChange={e => setInnInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Введите ИНН (например: 5610248560)"
                      className="w-full pl-12 pr-28 py-4 bg-transparent text-white text-base
                        placeholder:text-zinc-600 focus:outline-none rounded-2xl"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                    <div className="absolute right-2.5">
                      {isSearching ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 rounded-xl text-xs text-zinc-300">
                          <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#F95700] rounded-full animate-spin" />
                          ФНС...
                        </div>
                      ) : (
                        <button onClick={goRegister}
                          className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all duration-300
                            active:scale-[0.97]"
                          style={{ background: 'linear-gradient(135deg,#F95700,#c94400)' }}>
                          Далее →
                        </button>
                      )}
                    </div>
                  </div>

                  {searchError && (
                    <p className="mt-3 text-xs text-red-400 text-center bg-red-950/30 py-2 rounded-xl border border-red-900/40">
                      {searchError}
                    </p>
                  )}

                  {!companyInfo && !isSearching && (
                    <p className="mt-4 text-center text-xs text-zinc-600">
                      Пример ИНН:{' '}
                      <button onClick={() => setInnInput('5610248560')} className="text-zinc-400 underline hover:text-[#F95700]">
                        5610248560
                      </button>
                      {' · '}
                      <button onClick={goRegister} className="text-[#F95700] font-bold hover:underline">
                        Заполнить вручную →
                      </button>
                    </p>
                  )}
                </div>

                {/* Company card */}
                <AnimatePresence>
                  {companyInfo && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={spring}
                      className="mt-8 max-w-lg mx-auto"
                    >
                      <BCard hover={false}>
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <PillBadge color="emerald">✔ Проверено ФНС</PillBadge>
                              <h3 className="text-lg font-black text-white mt-2">{companyInfo.name}</h3>
                              <p className="text-xs text-zinc-500 mt-0.5">{companyInfo.full_name}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              { label: 'Руководитель', val: companyInfo.director || 'Не указан' },
                              { label: 'ИНН / ОГРН', val: `${innInput}${companyInfo.ogrn ? ` / ${companyInfo.ogrn}` : ''}` },
                              { label: 'Юридический адрес', val: companyInfo.address, span: true },
                            ].map(f => (
                              <div key={f.label}
                                className={`rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 ${f.span ? 'col-span-2' : ''}`}>
                                <span className="block text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{f.label}</span>
                                <span className="font-semibold text-zinc-200" style={f.label === 'ИНН / ОГРН' ? { fontFamily: 'var(--font-mono)' } : undefined}>{f.val}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={goRegister}
                            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
                              transition-all duration-300 active:scale-[0.98] group"
                            style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 4px 20px rgba(249,87,0,0.35)' }}>
                            <span>Создать облачную ERP для этой компании</span>
                            <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs
                              group-hover:translate-x-0.5 transition-transform">→</span>
                          </button>
                        </div>
                      </BCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </BCard>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            INDUSTRY USE-CASES — Tabbed
        ═══════════════════════════════════════════════════════════════════════ */}
        <section id="industry" className="py-28 px-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-4 items-start lg:items-end justify-between mb-12">
            <Reveal>
              <PillBadge color="blue">Отрасли</PillBadge>
              <h2 className="font-black mt-3 text-white max-w-lg"
                style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', lineHeight: 1.05 }}>
                Создано для вашей ниши
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
                СФЕРУМ адаптирует интерфейс и модули под тип бизнеса сразу после регистрации.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Tab list */}
            <Reveal className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {industries.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold whitespace-nowrap lg:whitespace-normal
                    transition-all duration-300 text-left shrink-0
                    ${activeIndustry === ind.id
                      ? 'bg-[#F95700]/15 border border-[#F95700]/30 text-white'
                      : 'bg-white/[0.03] border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}
                  `}
                >
                  <span className="text-lg">{ind.icon}</span>
                  <span>{ind.label}</span>
                </button>
              ))}
            </Reveal>

            {/* Content panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndustry}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={springFast}
              >
                <BCard hover={false} className="h-full">
                  <div className={`relative p-8 rounded-[calc(2rem-1.5px)] h-full overflow-hidden bg-gradient-to-br ${activeInd.bg}`}>
                    <div className="mb-6">
                      <span className="text-4xl mb-4 block">{activeInd.icon}</span>
                      <h3 className="text-2xl font-black text-white mb-3">{activeInd.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">{activeInd.desc}</p>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeInd.features.map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                          <span className={`text-sm font-bold ${activeInd.accent}`}>✔</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <button onClick={() => scrollTo('register')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white
                          ring-1 ring-white/10 hover:ring-white/20 bg-white/[0.05] hover:bg-white/[0.08] transition-all duration-300"
                      >
                        Попробовать бесплатно <span>→</span>
                      </button>
                    </div>
                  </div>
                </BCard>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            MARKETPLACE TEASER
        ═══════════════════════════════════════════════════════════════════════ */}
        <section id="marketplace" className="py-28 px-6 border-y border-white/[0.04]">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between mb-12">
              <Reveal>
                <div className="flex items-center gap-2 mb-3">
                  <PillBadge color="emerald">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'ping-slow 1.8s ease-in-out infinite' }} />
                    LIVE Биржа
                  </PillBadge>
                </div>
                <h2 className="font-black text-white"
                  style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', lineHeight: 1.05 }}>
                  Биржа B2B-заказов
                </h2>
                <p className="text-zinc-400 text-sm mt-3 max-w-lg leading-relaxed">
                  Находите субподряды, арендуйте спецтехнику и закупайте материалы
                  у проверенных контрагентов. Бесплатно для всех пользователей СФЕРЫ.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <button onClick={() => navigate('/marketplace-preview')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-zinc-300
                    ring-1 ring-white/10 hover:ring-white/20 hover:text-white bg-white/[0.03] hover:bg-white/[0.06]
                    transition-all duration-300 whitespace-nowrap shrink-0">
                  Смотреть все заявки →
                </button>
              </Reveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {listings.map((item, idx) => (
                <Reveal key={idx} delay={idx * 0.1}>
                  <BCard className="group h-full">
                    <div className="p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                          bg-white/[0.05] border border-white/[0.07] text-zinc-400">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-zinc-600 shrink-0">{item.age}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 leading-snug flex-1">{item.title}</h3>
                      <p className="text-xs text-zinc-500 mb-5">📍 {item.region}</p>

                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-zinc-600">Бюджет:</span>
                          <span className="text-sm font-bold text-emerald-400 blur-[3px] group-hover:blur-[5px] transition-all select-none">
                            {item.budget}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-600">Заказчик:</span>
                          <span className="text-sm font-semibold text-zinc-400 blur-[5px] group-hover:blur-[7px] transition-all select-none">
                            ООО КонтрагентПлюс
                          </span>
                        </div>
                        {/* Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100
                          transition-all duration-300 bg-zinc-950/60 rounded-xl backdrop-blur-[2px]">
                          <button onClick={() => navigate('/crm/login')}
                            className="px-4 py-2 rounded-full text-xs font-bold text-white transition-all duration-300"
                            style={{ background: 'linear-gradient(135deg,#F95700,#c94400)' }}>
                            Войти и откликнуться
                          </button>
                        </div>
                      </div>
                    </div>
                  </BCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            FEATURES — Asymmetric Bento
        ═══════════════════════════════════════════════════════════════════════ */}
        <section id="features" className="py-28 px-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between mb-16">
            <Reveal>
              <PillBadge color="orange">Архитектура платформы</PillBadge>
              <h2 className="font-black mt-3 text-white"
                style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', lineHeight: 1.05 }}>
                Всё что нужно вашему бизнесу
              </h2>
            </Reveal>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[220px]">

            {/* LARGE: RAG AI */}
            <Reveal delay={0} className="md:col-span-2 md:row-span-2">
              <BCard className="h-full" glow="">
                <div className="relative p-8 h-full flex flex-col overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(249,87,0,0.06) 0%, transparent 60%)' }}>
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-5 text-xl">
                    🤖
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">ИИ-Ассистент и Векторная БД (RAG)</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                    Pinecone-интеграция с namespace по tenant_id. Ваш ИИ обучается на собственных договорах,
                    ГОСТах и регламентах. Предсказывает риски в документах без утечки в публичные модели.
                  </p>
                  <div className="mt-auto pt-6 grid grid-cols-3 gap-2">
                    {['RAG на ваших документах', 'LangGraph агенты', 'Fine-tuning LoRA'].map(f => (
                      <div key={f} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                        <p className="text-[10px] font-semibold text-zinc-500">{f}</p>
                      </div>
                    ))}
                  </div>
                  {/* Decorative node graph */}
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10">
                    <svg viewBox="0 0 128 128" fill="none">
                      <circle cx="64" cy="64" r="40" stroke="#F95700" strokeWidth="1" strokeDasharray="4 4"/>
                      <circle cx="64" cy="24" r="6" fill="#F95700"/>
                      <circle cx="104" cy="64" r="6" fill="#F95700"/>
                      <circle cx="64" cy="104" r="6" fill="#F95700"/>
                      <circle cx="24" cy="64" r="6" fill="#F95700"/>
                    </svg>
                  </div>
                </div>
              </BCard>
            </Reveal>

            {/* MEDIUM: Telegram */}
            <Reveal delay={0.08}>
              <BCard className="h-full">
                <div className="p-6 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4 text-lg">
                    💬
                  </div>
                  <h3 className="text-base font-black text-white mb-2">Telegram Mini App</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Полноценная CRM внутри Telegram. Прорабы отправляют фотоотчёты, согласуют решения (HITL) без установки приложений.
                  </p>
                </div>
              </BCard>
            </Reveal>

            {/* MEDIUM: RLS */}
            <Reveal delay={0.12}>
              <BCard className="h-full">
                <div className="p-6 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4 text-lg">
                    🔒
                  </div>
                  <h3 className="text-base font-black text-white mb-2">Изоляция RLS</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Row-Level Security на Neon PostgreSQL. 100% герметичность данных каждой компании на уровне базы данных.
                  </p>
                </div>
              </BCard>
            </Reveal>

            {/* WIDE: B2B Billing */}
            <Reveal delay={0.06} className="md:col-span-2">
              <BCard className="h-full">
                <div className="p-7 h-full flex flex-col justify-between"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, transparent 60%)' }}>
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-4 text-lg">
                      💳
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">B2B-Биллинг и автогенерация документов</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed max-w-md">
                      Автоматические счета и акты в Docx/PDF, агентская сеть реселлеров, ЭДО через СБИС/Диадок.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    {['Счета Docx/PDF', 'ЭДО СБИС', 'Реселлеры'].map(t => (
                      <span key={t} className="px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-400
                        bg-amber-500/10 border border-amber-500/20">{t}</span>
                    ))}
                  </div>
                </div>
              </BCard>
            </Reveal>

            {/* SMALL: GLONASS */}
            <Reveal delay={0.14}>
              <BCard className="h-full">
                <div className="p-6 h-full flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4 text-lg">
                    📡
                  </div>
                  <h3 className="text-base font-black text-white mb-2">ГЛОНАСС</h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    Мониторинг спецтехники, телеметрия топлива, алерты ТО по моточасам.
                  </p>
                </div>
              </BCard>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            PRICING
        ═══════════════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="py-28 px-6 border-t border-white/[0.04]">
          <div className="max-w-[1100px] mx-auto">
            <Reveal className="mb-16">
              <PillBadge color="orange">Тарифы</PillBadge>
              <h2 className="font-black mt-3 text-white"
                style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', lineHeight: 1.05 }}>
                Простые и честные цены
              </h2>
              <p className="text-zinc-400 text-sm mt-3">Платите только за то, что используете. Без скрытых платежей.</p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end mb-24">
              {/* СТАРТ */}
              <Reveal delay={0}>
                <BCard className="h-full">
                  <div className="p-7 flex flex-col h-full">
                    <div className="mb-5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">СТАРТ</p>
                      <p className="font-black text-white" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-mono)' }}>
                        0 ₽
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">навсегда бесплатно</p>
                    </div>
                    <ul className="space-y-3 mb-7 flex-1">
                      {['До 3 пользователей', 'CRM + Задачи', '3 ИИ-агента бесплатно', '5 RAG-документов', '1 ГБ хранилища'].map((f, i) => (
                        <li key={f} className={`flex items-center gap-2.5 text-xs ${i < 3 ? 'text-zinc-300' : 'text-zinc-600 line-through'}`}>
                          <span className={i < 3 ? 'text-emerald-400' : 'text-zinc-700'}>
                            {i < 3 ? '✔' : '✗'}
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => scrollTo('register')}
                      className="w-full py-3 rounded-xl text-sm font-bold text-zinc-300
                        ring-1 ring-white/10 hover:ring-white/20 hover:text-white
                        bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300">
                      Начать бесплатно
                    </button>
                  </div>
                </BCard>
              </Reveal>

              {/* БИЗНЕС — featured */}
              <Reveal delay={0.08}>
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                      style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 4px 14px rgba(249,87,0,0.45)' }}>
                      Хит продаж
                    </span>
                  </div>
                  <div className="rounded-[2rem] p-[1.5px]"
                    style={{ background: 'linear-gradient(135deg, rgba(249,87,0,0.7), rgba(249,87,0,0.2) 50%, rgba(249,87,0,0.05))', boxShadow: '0 0 40px rgba(249,87,0,0.18)' }}>
                    <div className="rounded-[calc(2rem-1.5px)] bg-zinc-950 p-7 flex flex-col"
                      style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.07)' }}>
                      <div className="mb-5">
                        <p className="text-xs font-bold text-[#F95700] uppercase tracking-widest mb-2">БИЗНЕС</p>
                        <p className="font-black text-white" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-mono)' }}>
                          4 990 ₽
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">в месяц</p>
                      </div>
                      <ul className="space-y-3 mb-7 flex-1">
                        {['До 15 пользователей', 'Финансы + Склад + CRM', '5 ИИ-агентов', '50 RAG-документов', 'Приоритетная поддержка'].map(f => (
                          <li key={f} className="flex items-center gap-2.5 text-xs text-zinc-200">
                            <span className="text-[#F95700]">✔</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => scrollTo('register')}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 4px 18px rgba(249,87,0,0.3)' }}>
                        Подключить сейчас
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* PRO */}
              <Reveal delay={0.14}>
                <BCard className="h-full">
                  <div className="p-7 flex flex-col h-full">
                    <div className="mb-5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">PRO</p>
                      <p className="font-black text-white" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-mono)' }}>
                        9 990 ₽
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">в месяц</p>
                    </div>
                    <ul className="space-y-3 mb-7 flex-1">
                      {['Безлимит пользователей', 'Все отраслевые модули', 'Все ИИ-агенты', 'RAG без ограничений', 'Персональный менеджер'].map((f, i) => (
                        <li key={f} className="flex items-center gap-2.5 text-xs text-zinc-300">
                          <span className={i < 3 ? 'text-[#F95700]' : 'text-emerald-400'}>✔</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => scrollTo('register')}
                      className="w-full py-3 rounded-xl text-sm font-bold text-zinc-300
                        ring-1 ring-white/10 hover:ring-white/20 hover:text-white
                        bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300">
                      Связаться с нами
                    </button>
                  </div>
                </BCard>
              </Reveal>
            </div>

            {/* ── FAQ ── */}
            <Reveal>
              <h3 className="text-xl font-black text-white mb-6">Часто задаваемые вопросы</h3>
            </Reveal>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div
                    className="rounded-2xl ring-1 ring-white/[0.07] bg-white/[0.02] overflow-hidden
                      hover:ring-white/[0.12] transition-all duration-300 cursor-pointer"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div className="flex items-center justify-between px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-200">{faq.q}</p>
                      <motion.span
                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                        transition={springFast}
                        className="text-zinc-500 text-sm shrink-0 ml-4"
                      >▾</motion.span>
                    </div>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={springFast}
                        >
                          <div className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] pt-3">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            FINAL CTA
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="py-28 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <BCard hover={false}>
                <div className="relative p-10 sm:p-14 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 500px 250px at 50% 100%, rgba(249,87,0,0.09) 0%, transparent 60%)' }} />
                  <PillBadge color="orange">Начните сегодня</PillBadge>
                  <h2 className="font-black text-white mt-4 mb-3"
                    style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', lineHeight: 1.05 }}>
                    Готовы автоматизировать бизнес?
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    14 дней всех функций бесплатно. Без карты. Отмена в 1 клик.
                  </p>
                  <button onClick={() => scrollTo('register')}
                    className="flex items-center gap-2 mx-auto px-8 py-4 rounded-full font-bold text-white text-sm
                      transition-all duration-500 active:scale-[0.97] group"
                    style={{ background: 'linear-gradient(135deg,#F95700,#c94400)', boxShadow: '0 0 28px rgba(249,87,0,0.4)' }}>
                    <span>Зарегистрировать компанию по ИНН</span>
                    <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center
                      group-hover:translate-x-0.5 transition-transform duration-300">→</span>
                  </button>
                </div>
              </BCard>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════════ */}
        <footer className="border-t border-white/[0.04] py-16 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
                    style={{ background: 'linear-gradient(135deg,#F95700,#c94400)' }}>С</div>
                  <span className="text-base font-black text-white">СФЕРУМ<span className="text-[#F95700]">.</span></span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-xs">
                  Мультитенантная SaaS-платформа для автоматизации B2B-бизнеса. Строительство, агропром, производство, услуги.
                </p>
                <div className="flex gap-2 mt-5">
                  {['VK', 'TG'].map(s => (
                    <div key={s} className="w-8 h-8 rounded-full ring-1 ring-white/[0.08] bg-white/[0.03]
                      flex items-center justify-center text-[10px] font-bold text-zinc-500
                      hover:text-zinc-300 hover:ring-white/20 cursor-pointer transition-all duration-300">
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {[
                { title: 'Продукт', links: ['Возможности', 'Тарифы', 'ИИ-Агенты', 'Биржа заказов'] },
                { title: 'Компания', links: ['О нас', 'Партнёрская программа', 'Контакты', 'Блог'] },
                { title: 'Правовая информация', links: ['Пользовательское соглашение', 'Политика конфиденциальности', 'Договор-оферта', 'Реквизиты'] },
              ].map(col => (
                <div key={col.title}>
                  <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">{col.title}</p>
                  <ul className="space-y-2.5">
                    {col.links.map(l => (
                      <li key={l}>
                        <button className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors duration-200">{l}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.04] pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
              <p className="text-xs text-zinc-700">© 2026 СФЕРУМ. Все права защищены.</p>
              <p className="text-xs text-zinc-700" style={{ fontFamily: 'var(--font-mono)' }}>v2.0.0 · Neon PostgreSQL · eu-central-1</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};
