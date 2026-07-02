// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, ArrowRight, Bot, Smartphone, Lock, Check, 
  FileSpreadsheet, BookOpen, CalendarClock, Server, ShieldCheck,
  Zap, Database, Search, FileCheck, XCircle, UserPlus,
  Fingerprint, GripHorizontal, ChevronRight, CheckCircle2,
  Tractor, Factory, Truck, HardHat, ChevronDown, BarChart, LineChart, Activity,
  LayoutDashboard, Users, Target, Bell, Paperclip, CheckSquare, Settings,
  ShoppingCart, Scale, Megaphone, Calculator, ShieldAlert, Ruler, Mic, Network, GanttChartSquare, FileText, Wrench, Wallet,
  Menu, X, Loader2, Copy, CopyCheck, Phone
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

// --- Typewriter Component for Terminal ---
const TypewriterText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setStarted(false);
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [text, delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20 + Math.random() * 30); // Random typing speed
    return () => clearInterval(interval);
  }, [text, started]);

  return <span>{displayedText}</span>;
};

// --- Tilt Card Component (3D Hover) ---
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
    >
      <div style={{ transform: "translateZ(30px)" }} className="h-full w-full">
        {children}
      </div>
    </motion.div>
  );
};

// --- Magnetic Button Component ---
const MagneticButton = ({ children, onClick, className }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };
  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
};


const niches = [
  {
    id: 'build',
    name: 'СТРОЙКА И ПМК',
    icon: HardHat,
    cards: [
      { span: 'md:col-span-2', title: 'Блокнот прораба', desc: 'Договоренности остаются на стикерах. Потеряли блокнот = минус маржа объекта.', icon: BookOpen },
      { span: 'md:col-span-1', title: 'Excel-анархия', desc: '15 версий одной сметы. Никто не знает актуальную.', icon: FileSpreadsheet },
      { span: 'md:col-span-1 md:row-span-2', title: 'Пятничный паралич', desc: 'Сбор отчета превращается в детективное расследование по перепискам WhatsApp.', icon: CalendarClock },
      { span: 'md:col-span-2', title: 'Утечка МТР', desc: 'Списание задним числом. Реальные остатки неизвестны.', icon: Database },
    ]
  },
  {
    id: 'agro',
    name: 'АГРОКОМПЛЕКСЫ',
    icon: Tractor,
    cards: [
      { span: 'md:col-span-2', title: 'Слепой севооборот', desc: 'Планирование на основе интуиции, а не реальной аналитики урожайности.', icon: BookOpen },
      { span: 'md:col-span-1', title: 'Слив ГСМ', desc: 'Нормы расхода не бьются с фактическими заправками.', icon: Zap },
      { span: 'md:col-span-1 md:row-span-2', title: 'Поломка в поле', desc: 'Простой техники из-за несвоевременного ТО и забытых запчастей.', icon: Factory },
      { span: 'md:col-span-2', title: 'Хаос на весовой', desc: 'Ручной ввод накладных порождает ошибки и хищения.', icon: Search },
    ]
  },
  {
    id: 'prod',
    name: 'ПРОИЗВОДСТВО',
    icon: Factory,
    cards: [
      { span: 'md:col-span-2', title: 'Простой станков', desc: 'Заказы простаивают из-за отсутствия копеечной детали на складе.', icon: Factory },
      { span: 'md:col-span-1', title: 'Брак и потери', desc: 'Отсутствие сквозного контроля качества на этапах передела.', icon: Search },
      { span: 'md:col-span-1 md:row-span-2', title: 'Срыв сроков', desc: 'Менеджеры обещают сроки, не зная реальной загрузки цеха.', icon: CalendarClock },
      { span: 'md:col-span-2', title: 'Слепая себестоимость', desc: 'Никто не знает, сколько реально стоит произвести единицу продукции.', icon: Database },
    ]
  }
];

const faqs = [
  { q: 'Есть ли интеграция с 1С?', a: 'Да. СФЕРА поддерживает двусторонний обмен с 1С (УТ, Бухгалтерия, ERP) по API. Вы можете продолжать сдавать отчетность в 1С, а операционную работу вести в СФЕРЕ.' },
  { q: 'Где физически хранятся наши данные?', a: 'Мы используем выделенные кластеры серверов уровня Tier-III в РФ (соответствие 152-ФЗ). Ваша база данных физически изолирована от других клиентов через архитектуру RLS (Row-Level Security). Прораб никогда не увидит финансовые потоки компании.' },
  { q: 'А если у нас уже зоопарк систем?', a: 'СФЕРА не заставляет ломать текущие процессы. Наш AI работает как "невидимый клей", объединяя данные из ваших текущих таблиц, 1С и мессенджеров в единый контрольный пульт.' },
  { q: 'Сколько длится процесс внедрения?', a: 'Разворачивается без привлечения ваших программистов. Базовая настройка контура — 3 дня. Полное внедрение — от 2 недель.' },
];

const aiAgents = [
  {
    id: 'supply',
    icon: ShoppingCart,
    title: 'Снабженец',
    desc: 'Авто-поиск лучшей цены на МТР, проверка поставщика и генерация счета на оплату.',
    logs: [
      { sender: 'user', text: 'Найди арматуру А500С 12мм, 10 тонн. Срочно на объект "Северный".', time: '10:02' },
      { sender: 'ai', text: 'Анализирую 40+ прайсов поставщиков в радиусе 50 км...', time: '10:02' },
      { sender: 'ai', text: 'Нашел у "МеталлСервис" по 72,000 ₽/т. Экономия 12% от сметы. Бронирую?', time: '10:03' },
      { sender: 'user', text: 'Да, выставляй счет.', time: '10:04' },
      { sender: 'ai', text: 'Счет сформирован, отправлен в 1С. Машина будет на объекте завтра в 14:00.', time: '10:04' }
    ]
  },
  {
    id: 'lawyer',
    icon: Scale,
    title: 'Юрист',
    desc: 'Анализ входящих договоров на 152-ФЗ и скрытые штрафы, автоматический протокол разногласий.',
    logs: [
      { sender: 'user', text: 'Проверь договор подряда от ООО "Вектор".', time: '11:30' },
      { sender: 'ai', text: 'Сканирую 42 страницы документа...', time: '11:30' },
      { sender: 'ai', text: '⚠️ Нашел скрытый штраф: пеня 0.5% за день просрочки (стандарт 0.1%).', time: '11:31' },
      { sender: 'user', text: 'Подготовь протокол разногласий.', time: '11:32' },
      { sender: 'ai', text: 'Готово. Протокол прикреплен.', time: '11:32' }
    ]
  },
  {
    id: 'sales',
    icon: Megaphone,
    title: 'Продавец',
    desc: 'Генерация КП по запросу клиента, авто-фоллоуап в WhatsApp.',
    logs: [
      { sender: 'user', text: 'Новый лид с сайта, завод 200 чел.', time: '15:10' },
      { sender: 'ai', text: 'Обогащаю данные по ИНН... Завод "СтальПром".', time: '15:10' },
      { sender: 'ai', text: 'Сгенерировал КП под производство. Отправить?', time: '15:11' },
      { sender: 'user', text: 'Отправь в WhatsApp.', time: '15:15' },
      { sender: 'ai', text: 'Отправлено. Поставил задачу на фоллоу-ап завтра.', time: '15:15' }
    ]
  },
  {
    id: 'accountant',
    icon: Calculator,
    title: 'Бухгалтер',
    desc: 'Распознавание актов и УПД по фото с телефона, сверка с бюджетом.',
    logs: [
      { sender: 'user', text: 'Проведи УПД за бензин, фото прикрепил.', time: '09:00' },
      { sender: 'ai', text: 'Распознаю данные из фото УПД №124...', time: '09:01' },
      { sender: 'ai', text: 'Данные корректны. Провожу по статье "ГСМ".', time: '09:02' }
    ]
  },
  {
    id: 'risk',
    icon: ShieldAlert,
    title: 'Риск-менеджер',
    desc: 'Уведомления о кассовых разрывах за месяц до их наступления.',
    logs: [
      { sender: 'ai', text: '⚠️ Внимание: прогнозирую кассовый разрыв 1.2M ₽ через 12 дней.', time: '08:30' },
      { sender: 'user', text: 'Почему?', time: '08:35' },
      { sender: 'ai', text: 'Задержка оплаты от заказчика + плановый платеж по налогам.', time: '08:35' }
    ]
  },
  {
    id: 'estimator',
    icon: Ruler,
    title: 'Сметчик',
    desc: 'Парсинг PDF-чертежей (AutoCAD) и перевод в смету по ГЭСН/ФЕР.',
    logs: [
      { sender: 'user', text: 'Сделай смету по чертежу Фундамента.', time: '14:20' },
      { sender: 'ai', text: 'Извлекаю объемы из PDF...', time: '14:22' },
      { sender: 'ai', text: 'Смета готова по базе ФЕР-2020. Итого: 4.5M ₽', time: '14:25' }
    ]
  }
];

export const SaaSLanding: React.FC = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [innInput, setInnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeNiche, setActiveNiche] = useState(niches[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [legalConsent, setLegalConsent] = useState(false);
  const [activeAgent, setActiveAgent] = useState(aiAgents[0].id);
  const [isValidInn, setIsValidInn] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  
  const activeAgentData = aiAgents.find(a => a.id === activeAgent) || aiAgents[0];

  // Easter Egg State
  const [isGodMode, setIsGodMode] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    full_name: string;
    address: string;
    director: string;
  } | null>(null);
  const [searchError, setSearchError] = useState('');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Format INN automatically & trigger God Mode
  const handleInnChange = (val: string) => {
    if (val.toLowerCase() === 'godmode') {
      setIsGodMode(true);
      setInnInput(val);
      return;
    }
    setIsGodMode(false);
    // Only numbers
    const clean = val.replace(/\D/g, '');
    setInnInput(clean);
  };

  // INN Validation
  useEffect(() => {
    if (innInput.toLowerCase() === 'godmode') return;

    if (innInput.length === 10 || innInput.length === 12) {
      setIsValidInn(true);
      const fetchFns = async () => {
        setIsSearching(true);
        setSearchError('');
        try {
          const response = await fetch(`${baseUrl}/tenants/suggest/${innInput}`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.name) {
              setCompanyInfo(data);
            } else {
              setCompanyInfo(null);
              setSearchError('Компания не найдена в ЕГРЮЛ');
              setIsValidInn(false);
            }
          } else {
            setCompanyInfo(null);
            setSearchError('Не удалось проверить ИНН. Сервер недоступен.');
            setIsValidInn(false);
          }
        } catch (err) {
          setSearchError('Ошибка связи с сервером');
          setIsValidInn(false);
        } finally {
          setIsSearching(false);
        }
      };
      const timer = setTimeout(fetchFns, 800);
      return () => clearTimeout(timer);
    } else {
      setCompanyInfo(null);
      setSearchError('');
      setIsValidInn(null);
    }
  }, [innInput, baseUrl]);
  
  const handleStartRegistration = () => {
    if (isGodMode) {
      alert("MATRIX INITIATED. WELCOME NEO.");
      return;
    }
    if (!legalConsent) {
      setSearchError('Подтвердите согласие на обработку персональных данных');
      return;
    }
    if (innInput && (innInput.length === 10 || innInput.length === 12)) {
      navigate(`/crm/login?tab=register&inn=${innInput}`);
    } else {
      navigate('/crm/login?tab=register');
    }
  };

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollTo = (id: string) => {
    setIsMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    if (id === 'onboarding') {
      setTimeout(() => document.getElementById('inn-input')?.focus(), 800);
    }
  };

  const activeNicheData = niches.find(n => n.id === activeNiche) || niches[0];

  // Spotlight mouse tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleGlobalMouseMove}
      className={`min-h-screen text-zinc-900 font-['Inter'] overflow-x-hidden w-full max-w-full relative transition-colors duration-500
      ${isGodMode ? 'bg-[#000000] text-[#00FF41] selection:bg-[#00FF41]/30 matrix-mode' : 'bg-zinc-50 dark:bg-[#0A0D14] dark:text-zinc-300 selection:bg-blue-500/30'}
    `}>
      
      {/* SPOTLIGHT */}
      {!isGodMode && (
        <div className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300" 
             style={{ background: 'radial-gradient(circle 600px at var(--mouse-x, 0) var(--mouse-y, 0), rgba(59, 130, 246, 0.05), transparent 80%)' }} />
      )}
      {isGodMode && (
        <div className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300" 
             style={{ background: 'radial-gradient(circle 400px at var(--mouse-x, 0) var(--mouse-y, 0), rgba(0, 255, 65, 0.15), transparent 80%)' }} />
      )}

      {/* GLOBAL GRAIN NOISE TEXTURE */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png")' }}></div>

      {/* PROGRESS BAR */}
      <motion.div 
        className={`fixed top-0 left-0 right-0 h-1 origin-left z-[60] ${isGodMode ? 'bg-[#00FF41]' : 'bg-gradient-to-r from-blue-600 to-emerald-500'}`}
        style={{ scaleX: scrollYProgress }} 
      />

      {/* BACKGROUND BLUEPRINTS */}
      {!isGodMode && (
        <>
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-0 transition-opacity duration-300" style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
          <div className="fixed inset-0 pointer-events-none z-0 opacity-0 dark:opacity-20 transition-opacity duration-300" style={{ backgroundImage: `linear-gradient(rgba(45, 55, 72, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(45, 55, 72, 0.5) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        </>
      )}

      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 h-20 backdrop-blur-lg border-b z-50 transition-colors ${isGodMode ? 'bg-black/80 border-[#00FF41]/30' : 'bg-white/80 dark:bg-[#0A0D14]/80 border-zinc-200 dark:border-zinc-800/50'}`}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isGodMode ? 'bg-[#00FF41] text-black' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}>
              <span className="font-black font-['Montserrat'] text-sm">С</span>
            </div>
            <span className={`font-black font-['Montserrat'] text-xl tracking-tight hidden sm:block ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>
              СФЕРА ERP
            </span>
          </div>
          
          <nav className={`hidden lg:flex items-center gap-8 text-sm font-bold ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>
            <button onClick={() => scrollTo('modules')} className={`transition-colors ${isGodMode ? 'hover:text-[#00FF41]' : 'hover:text-zinc-900 dark:hover:text-white'}`}>Модули</button>
            <button onClick={() => scrollTo('agents')} className={`transition-colors ${isGodMode ? 'hover:text-[#00FF41]' : 'hover:text-zinc-900 dark:hover:text-white'}`}>AI-Агенты</button>
            <button onClick={() => scrollTo('ecosystem')} className={`transition-colors ${isGodMode ? 'hover:text-[#00FF41]' : 'hover:text-zinc-900 dark:hover:text-white'}`}>Экосистема</button>
            <button onClick={() => scrollTo('pricing')} className={`transition-colors ${isGodMode ? 'hover:text-[#00FF41]' : 'hover:text-zinc-900 dark:hover:text-white'}`}>Тарифы</button>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/crm/login')} className={`hidden sm:block text-sm font-bold transition-colors ${isGodMode ? 'text-[#00FF41]/70 hover:text-[#00FF41]' : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}`}>
              Войти
            </button>
            <MagneticButton onClick={() => scrollTo('onboarding')} className={`px-5 py-2.5 text-xs font-bold font-mono tracking-widest uppercase transition-colors shadow-lg ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`}>
              Опробовать
            </MagneticButton>
            <button className="lg:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* ================= 1. HERO ================= */}
      <section className={`relative pt-40 pb-24 px-6 md:px-12 max-w-7xl mx-auto z-10 border-b transition-colors duration-300 overflow-visible ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
        {!isGodMode && <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className={`inline-flex items-center gap-2 px-3 py-1 border text-[10px] font-mono tracking-widest uppercase mb-6 backdrop-blur-md transition-colors ${isGodMode ? 'bg-black border-[#00FF41]/50 text-[#00FF41]' : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'}`}
            >
              <span className={`w-1.5 h-1.5 animate-pulse ${isGodMode ? 'bg-[#00FF41]' : 'bg-emerald-500'}`} />
              <span>Экономит до 40 часов управленческого времени в неделю</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className={`text-4xl sm:text-5xl lg:text-7xl font-black font-['Montserrat'] tracking-tight max-w-2xl leading-[1.05] mb-6 transition-colors ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}
            >
              ERP-СИСТЕМА НОВОГО ПОКОЛЕНИЯ С AI
            </motion.h1>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className={`text-xl sm:text-2xl font-bold font-['Montserrat'] mb-8 ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              Освободите свой мозг. Система сама раскидывает задачи, ищет тендеры и считает сметы.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className={`space-y-4 mb-10 text-lg ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-600 dark:text-zinc-400'}`}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-6 h-6 shrink-0 mt-0.5 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
                <p><strong>AI-Снабженец:</strong> Находит МТР и торгуется с поставщиками напрямую с завода.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-6 h-6 shrink-0 mt-0.5 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
                <p><strong>Мгновенная реакция:</strong> Скорость ответа AI-агента — 12 миллисекунд.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`w-6 h-6 shrink-0 mt-0.5 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
                <p><strong>Управление из Telegram:</strong> Контроль бизнеса без ноутбука, прямо из мессенджера.</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <MagneticButton
                onClick={() => scrollTo('onboarding')}
                className={`w-full sm:w-auto px-8 py-5 font-mono font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 cursor-pointer group shadow-xl hover:-translate-y-1 ${isGodMode ? 'bg-[#00FF41] text-black hover:shadow-[0_10px_40px_rgba(0,255,65,0.4)]' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-[0_10px_40px_rgba(37,99,235,0.4)]'}`}
              >
                [ ПОЛУЧИТЬ ПРОСТРАНСТВО ]
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            
              {/* HER0 METRICS BAR */}
              <div className={`mt-10 md:mt-16 pt-10 border-t flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-black font-['Montserrat'] ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>+30%</span>
                  <span className={`text-xs font-mono tracking-widest uppercase mt-1 ${isGodMode ? 'text-[#00FF41]/60' : 'text-zinc-500'}`}>Рост маржи</span>
                </div>
                <div className="hidden md:block w-px h-10 bg-zinc-200 dark:bg-zinc-800"></div>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-black font-['Montserrat'] ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>0</span>
                  <span className={`text-xs font-mono tracking-widest uppercase mt-1 ${isGodMode ? 'text-[#00FF41]/60' : 'text-zinc-500'}`}>Ошибок ИИ</span>
                </div>
                <div className="hidden md:block w-px h-10 bg-zinc-200 dark:bg-zinc-800"></div>
                <div className="flex flex-col items-center">
                  <span className={`text-3xl font-black font-['Montserrat'] ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>24/7</span>
                  <span className={`text-xs font-mono tracking-widest uppercase mt-1 ${isGodMode ? 'text-[#00FF41]/60' : 'text-zinc-500'}`}>Полный контроль</span>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block relative z-20 w-full perspective-[1000px]"
          >
            <TiltCard className={`w-full h-[500px] border shadow-2xl backdrop-blur-xl rounded-xl overflow-hidden flex flex-col relative transition-colors duration-300 ${isGodMode ? 'bg-black/90 border-[#00FF41]/50 shadow-[#00FF41]/20' : 'bg-white/90 dark:bg-[#0A0D14]/90 border-zinc-200 dark:border-zinc-800'}`}>
              <div className={`h-10 border-b flex items-center px-4 gap-2 transition-colors ${isGodMode ? 'border-[#00FF41]/30 bg-black' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0F131A]'}`}>
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                <div className={`mx-auto text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-400'}`}>
                  <Lock className="w-3 h-3" /> SPHERA ERP WORKSPACE
                </div>
              </div>
              <div className="flex flex-1 overflow-hidden rounded-b-xl">
                <div className={`w-16 border-r flex flex-col items-center py-4 gap-6 transition-colors ${isGodMode ? 'border-[#00FF41]/30 bg-black/50' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0A0D14]'}`}>
                  <BarChart className={`w-5 h-5 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`} />
                  <Database className={`w-5 h-5 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
                  <Smartphone className={`w-5 h-5 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`} />
                </div>
                <div className="flex-1 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <div className={`text-xs font-mono mb-1 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`}>МАРЖИНАЛЬНОСТЬ (Q3)</div>
                      <div className={`text-3xl font-bold font-mono transition-colors ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>₽ 14,200,500</div>
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-mono px-2 py-1 rounded ${isGodMode ? 'text-black bg-[#00FF41]' : 'text-emerald-500 bg-emerald-500/10'}`}>
                      +18.4%
                    </div>
                  </div>
                  <div className={`h-32 border-b flex items-end gap-2 pb-2 transition-colors ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
                    {[40, 60, 45, 80, 50, 90, 70].map((h, i) => (
                      <div key={i} className={`flex-1 transition-colors relative group rounded-t-sm ${isGodMode ? 'bg-[#00FF41]/30 hover:bg-[#00FF41]' : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-500'}`} style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                  <div className={`mt-auto border p-3 flex items-start gap-3 shadow-inner rounded-md transition-colors ${isGodMode ? 'bg-[#00FF41]/10 border-[#00FF41]/30' : 'bg-white dark:bg-zinc-900/50 border-blue-500/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isGodMode ? 'bg-[#00FF41]/20' : 'bg-blue-500/20'}`}>
                      <Bot className={`w-4 h-4 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
                    </div>
                    <div>
                      <div className={`text-[11px] font-bold transition-colors ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>AI-Оркестратор</div>
                      <div className={`text-[10px] mt-1 ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Найден новый тендер (44-ФЗ). Маржинальность: 22%. Смета сгенерирована.</div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ================= 2. SOCIAL PROOF ================= */}
      <section className={`py-10 border-b overflow-hidden ${isGodMode ? 'border-[#00FF41]/30 bg-black' : 'border-zinc-200 dark:border-zinc-800/50 bg-white/50 dark:bg-black/20'}`}>
        <div className={`text-center text-xs font-mono mb-6 uppercase tracking-widest ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`}>Нам доверяют лидеры индустрии</div>
        <div className={`flex gap-16 animate-[scrollX_30s_linear_infinite] whitespace-nowrap items-center ${isGodMode ? 'opacity-50 text-[#00FF41]' : 'opacity-50 dark:opacity-30 grayscale'}`}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <React.Fragment key={i}>
              <span className="text-2xl font-black font-['Montserrat']">ГАЗПРОМ НЕФТЬ</span>
              <span className="text-2xl font-black font-['Montserrat']">ПИК</span>
              <span className="text-2xl font-black font-['Montserrat']">САМОЛЕТ</span>
              <span className="text-2xl font-black font-['Montserrat']">ТЕХНОНИКОЛЬ</span>
            </React.Fragment>
          ))}
        </div>
        <style>{`@keyframes scrollX { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ================= 3. SCENARIOS (HOVER REVEAL) ================= */}
      <section className={`py-32 px-6 max-w-7xl mx-auto z-10 relative border-b ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
        <div className="mb-16">
          <div className={`text-xs font-mono mb-2 uppercase tracking-wider flex items-center ${isGodMode ? 'text-[#00FF41]' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse mr-2 ${isGodMode ? 'bg-[#00FF41]' : 'bg-red-500'}`}></span>
            Human Error Prevention
          </div>
          <h2 className={`text-4xl lg:text-5xl font-black font-['Montserrat'] tracking-tight mb-4 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}>КАТАСТРОФЫ, КОТОРЫХ НЕ СЛУЧИЛОСЬ</h2>
          <p className={`text-xl max-w-2xl ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Наведите на карточку, чтобы увидеть, как СФЕРА купирует риски человеческого фактора в реальном времени.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* Scenario 1: Accountant */}
          <div className={`group relative overflow-hidden h-[340px] rounded-3xl border-2 transition-all duration-500 ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30 hover:border-[#00FF41]' : 'bg-white dark:bg-[#0A0D14] border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50'} shadow-lg cursor-crosshair`}>
            {/* Pain State */}
            <div className="absolute inset-0 p-8 transition-opacity duration-500 group-hover:opacity-0 flex flex-col justify-center">
              <div className={`font-mono text-[10px] mb-4 px-2 py-1 inline-block w-max rounded uppercase tracking-widest ${isGodMode ? 'text-[#00FF41] bg-[#00FF41]/10' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'}`}>ERR: HUMAN_ABSENCE</div>
              <h3 className={`text-3xl font-bold mb-4 font-['Montserrat'] ${isGodMode ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>Бухгалтер ушел на больничный 20-го числа</h3>
              <p className={`text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Счета не выставлены, акты для подрядчиков не готовы. Оплаты сдвигаются на неделю. Компанию ждет кассовый разрыв.</p>
            </div>
            {/* Solution State (Hover) */}
            <div className={`absolute inset-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-1000 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-between ${isGodMode ? 'bg-black text-[#00FF41]' : 'bg-zinc-900 dark:bg-zinc-950 text-white'}`}>
              <div>
                <div className={`font-mono text-xs mb-4 flex items-center ${isGodMode ? 'text-[#00FF41]' : 'text-blue-400'}`}><CheckCircle2 className="w-4 h-4 mr-2" /> AI_ACCOUNTANT: ACTIVE</div>
                <h3 className="text-2xl font-bold mb-3 font-['Montserrat']">Автоматический биллинг</h3>
                <p className={`text-base leading-relaxed ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-300'}`}>СФЕРА сама видит, что этап работ закрыт. Генерирует УПД, акт и счет, подписывает ЭЦП и отправляет клиенту в Telegram/ЭДО без участия человека.</p>
              </div>
              <button onClick={() => scrollTo('onboarding')} className={`w-full font-bold py-4 rounded-xl transition-colors font-mono uppercase tracking-widest text-sm ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>Внедрить авто-биллинг</button>
            </div>
          </div>

          {/* Scenario 2: Estimator */}
          <div className={`group relative overflow-hidden h-[340px] rounded-3xl border-2 transition-all duration-500 ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30 hover:border-[#00FF41]' : 'bg-white dark:bg-[#0A0D14] border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50'} shadow-lg cursor-crosshair`}>
            {/* Pain State */}
            <div className="absolute inset-0 p-8 transition-opacity duration-500 group-hover:opacity-0 flex flex-col justify-center">
              <div className={`font-mono text-[10px] mb-4 px-2 py-1 inline-block w-max rounded uppercase tracking-widest ${isGodMode ? 'text-[#00FF41] bg-[#00FF41]/10' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'}`}>ERR: FORMULA_BROKEN</div>
              <h3 className={`text-3xl font-bold mb-4 font-['Montserrat'] ${isGodMode ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>Сметчик ошибся на 1.5 млн ₽</h3>
              <p className={`text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Поплыла формула в Excel. Забыли заложить логистику негабарита. Объект закрывается в минус, виноватых нет.</p>
            </div>
            {/* Solution State (Hover) */}
            <div className={`absolute inset-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-1000 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-between ${isGodMode ? 'bg-black text-[#00FF41]' : 'bg-zinc-900 dark:bg-zinc-950 text-white'}`}>
              <div>
                <div className={`font-mono text-xs mb-4 flex items-center ${isGodMode ? 'text-[#00FF41]' : 'text-blue-400'}`}><CheckCircle2 className="w-4 h-4 mr-2" /> AI_ESTIMATOR: ACTIVE</div>
                <h3 className="text-2xl font-bold mb-3 font-['Montserrat']">Кросс-чек смет (Парсинг)</h3>
                <p className={`text-base leading-relaxed ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-300'}`}>Бот парсит любую смету, математически пересчитывает её, сверяет с актуальными прайсами поставщиков по API и жестко подсвечивает расхождения до подписания.</p>
              </div>
              <button onClick={() => scrollTo('onboarding')} className={`w-full font-bold py-4 rounded-xl transition-colors font-mono uppercase tracking-widest text-sm ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>Запустить аудит</button>
            </div>
          </div>

          {/* Scenario 3: Broken Phone */}
          <div className={`group relative overflow-hidden h-[340px] rounded-3xl border-2 transition-all duration-500 ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30 hover:border-[#00FF41]' : 'bg-white dark:bg-[#0A0D14] border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50'} shadow-lg cursor-crosshair`}>
            {/* Pain State */}
            <div className="absolute inset-0 p-8 transition-opacity duration-500 group-hover:opacity-0 flex flex-col justify-center">
              <div className={`font-mono text-[10px] mb-4 px-2 py-1 inline-block w-max rounded uppercase tracking-widest ${isGodMode ? 'text-[#00FF41] bg-[#00FF41]/10' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'}`}>ERR: DATA_CORRUPTION</div>
              <h3 className={`text-3xl font-bold mb-4 font-['Montserrat'] ${isGodMode ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>Эффект испорченного телефона</h3>
              <p className={`text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Менеджер пообещал одно, прораб понял другое, а на заводе произвели третье. Переделки за ваш счет.</p>
            </div>
            {/* Solution State (Hover) */}
            <div className={`absolute inset-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-1000 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-between ${isGodMode ? 'bg-black text-[#00FF41]' : 'bg-zinc-900 dark:bg-zinc-950 text-white'}`}>
              <div>
                <div className={`font-mono text-xs mb-4 flex items-center ${isGodMode ? 'text-[#00FF41]' : 'text-blue-400'}`}><CheckCircle2 className="w-4 h-4 mr-2" /> SINGLE_SOURCE_OF_TRUTH</div>
                <h3 className="text-2xl font-bold mb-3 font-['Montserrat']">Бесшовная маршрутизация</h3>
                <p className={`text-base leading-relaxed ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-300'}`}>Договор — это единственный источник правды. ИИ сам нарезает его на спецификации для цеха и чек-листы для прораба без права на интерпретацию.</p>
              </div>
            </div>
          </div>

          {/* Scenario 4: Context Loss */}
          <div className={`group relative overflow-hidden h-[340px] rounded-3xl border-2 transition-all duration-500 ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30 hover:border-[#00FF41]' : 'bg-white dark:bg-[#0A0D14] border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50'} shadow-lg cursor-crosshair`}>
            {/* Pain State */}
            <div className="absolute inset-0 p-8 transition-opacity duration-500 group-hover:opacity-0 flex flex-col justify-center">
              <div className={`font-mono text-[10px] mb-4 px-2 py-1 inline-block w-max rounded uppercase tracking-widest ${isGodMode ? 'text-[#00FF41] bg-[#00FF41]/10' : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'}`}>ERR: CONTEXT_LOST</div>
              <h3 className={`text-3xl font-bold mb-4 font-['Montserrat'] ${isGodMode ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>Уволился ключевой инженер</h3>
              <p className={`text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Вся история договоренностей с субподрядчиками и неофициальные скидки остались в его личном WhatsApp.</p>
            </div>
            {/* Solution State (Hover) */}
            <div className={`absolute inset-0 p-8 translate-y-full group-hover:translate-y-0 transition-transform duration-1000 delay-75 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-between ${isGodMode ? 'bg-black text-[#00FF41]' : 'bg-zinc-900 dark:bg-zinc-950 text-white'}`}>
              <div>
                <div className={`font-mono text-xs mb-4 flex items-center ${isGodMode ? 'text-[#00FF41]' : 'text-blue-400'}`}><CheckCircle2 className="w-4 h-4 mr-2" /> RLS_MEMORY_VAULT</div>
                <h3 className="text-2xl font-bold mb-3 font-['Montserrat']">Корпоративная память</h3>
                <p className={`text-base leading-relaxed ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-300'}`}>Система логирует каждый шаг. Задачи и чаты ведутся строго внутри карточки объекта. Заменили человека — новый сотрудник сразу видит весь контекст.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= 4. BENTO GRID ================= */}
      <section id="modules" className={`py-32 px-6 max-w-7xl mx-auto z-10 relative border-b transition-colors duration-300 ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
        <div className="text-center mb-16">
          <h2 className={`text-4xl lg:text-5xl font-black font-['Montserrat'] mb-6 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}>
            ВСЕ ИНСТРУМЕНТЫ В ОДНОЙ КОРОБКЕ
          </h2>
          <p className={`max-w-3xl mx-auto text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>Сфера — это не просто таблица тендеров. Это полноценная бизнес-операционная система.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 grid-flow-dense gap-4 min-h-[800px]">
          
          <TiltCard className={`md:col-span-2 md:row-span-2 border rounded-2xl p-8 relative overflow-hidden group ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30 hover:border-[#00FF41]' : 'bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-colors'}`}>
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 flex-col h-full">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 shadow-lg ${isGodMode ? 'bg-[#00FF41] shadow-[#00FF41]/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
                <Mic className={`w-6 h-6 ${isGodMode ? 'text-black' : 'text-white'}`} />
              </div>
              <h3 className={`text-2xl font-bold font-['Montserrat'] mb-2 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Голосовое управление</h3>
              <p className={`mb-8 max-w-sm ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>За рулем или на объекте? Просто скажите приложению, что нужно сделать. AI всё поймет.</p>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-1 h-6">
                    <motion.div animate={{ height: ["4px", "20px", "4px"] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.0 }} className={`w-1 rounded-full ${isGodMode ? 'bg-[#00FF41]' : 'bg-blue-500'}`} />
                    <motion.div animate={{ height: ["8px", "24px", "8px"] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className={`w-1 rounded-full ${isGodMode ? 'bg-[#00FF41]' : 'bg-blue-500'}`} />
                    <motion.div animate={{ height: ["12px", "16px", "12px"] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className={`w-1 rounded-full ${isGodMode ? 'bg-[#00FF41]' : 'bg-emerald-500'}`} />
                    <motion.div animate={{ height: ["6px", "22px", "6px"] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.1 }} className={`w-1 rounded-full ${isGodMode ? 'bg-[#00FF41]' : 'bg-amber-500'}`} />
                    <motion.div animate={{ height: ["16px", "8px", "16px"] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }} className={`w-1 rounded-full ${isGodMode ? 'bg-[#00FF41]' : 'bg-blue-500'}`} />
                  </div>
                  <div className={`text-sm font-mono italic ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-600 dark:text-zinc-300'}`}>"Выставь счет на 200т арматуры"</div>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-3 ${isGodMode ? 'bg-black border-[#00FF41]/50' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'}`}>
                  <CheckCircle2 className={`w-6 h-6 ${isGodMode ? 'text-[#00FF41]' : 'text-emerald-500'}`} />
                  <div>
                    <div className={`text-xs font-bold ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Счет #1042 сформирован</div>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>

          <TiltCard className={`md:col-span-2 md:row-span-1 border rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-[#0A0D14] border-zinc-800'}`}>
            <h3 className={`text-xl font-bold font-['Montserrat'] mb-2 relative z-10 ${isGodMode ? 'text-[#00FF41]' : 'text-white'}`}>База знаний (Граф)</h3>
            <p className={`text-sm relative z-10 max-w-sm ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-400'}`}>Вся документация, ГОСТы и договоры связаны как нейронная сеть.</p>
            
            <div className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 overflow-hidden opacity-80 mix-blend-screen">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-20"></div>
              <svg className="w-full h-full">
                {/* Node connections */}
                <motion.line x1="20%" y1="30%" x2="60%" y2="40%" stroke={isGodMode ? "#00FF41" : "#3b82f6"} strokeWidth="2" strokeOpacity="0.4" animate={{ strokeOpacity: [0.2, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 3 }} />
                <motion.line x1="60%" y1="40%" x2="40%" y2="70%" stroke={isGodMode ? "#00AA00" : "#8b5cf6"} strokeWidth="1.5" strokeOpacity="0.5" />
                <motion.line x1="60%" y1="40%" x2="80%" y2="60%" stroke={isGodMode ? "#00FF41" : "#06b6d4"} strokeWidth="1" strokeOpacity="0.3" />
                <motion.line x1="40%" y1="70%" x2="20%" y2="80%" stroke={isGodMode ? "#005500" : "#4b5563"} strokeWidth="1" />
                <motion.line x1="80%" y1="60%" x2="90%" y2="30%" stroke={isGodMode ? "#00FF41" : "#3b82f6"} strokeWidth="1.5" strokeOpacity="0.6" animate={{ strokeDasharray: ["0, 10", "10, 0"] }} transition={{ repeat: Infinity, duration: 4 }} />
                
                {/* Nodes */}
                <motion.circle cx="20%" cy="30%" r="5" fill={isGodMode ? "#00FF41" : "#fff"} className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
                <circle cx="60%" cy="40%" r="8" fill={isGodMode ? "#00FF41" : "#3b82f6"} className="drop-shadow-[0_0_12px_rgba(59,130,246,1)]" />
                <circle cx="40%" cy="70%" r="6" fill={isGodMode ? "#00FF41" : "#8b5cf6"} />
                <circle cx="80%" cy="60%" r="4" fill={isGodMode ? "#00FF41" : "#06b6d4"} />
                <circle cx="20%" cy="80%" r="3" fill={isGodMode ? "#005500" : "#4b5563"} />
                <motion.circle cx="90%" cy="30%" r="5" fill={isGodMode ? "#00FF41" : "#3b82f6"} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2.5, delay: 1 }} />
              </svg>

              {/* Floating Tags */}
              <div className="absolute top-[20%] left-[25%] px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">#ГОСТ_12.1.004</div>
              <div className="absolute top-[45%] left-[65%] px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">#Смета_ЖК</div>
            </div>
          </TiltCard>

          <TiltCard className={`md:col-span-1 md:row-span-1 border rounded-2xl p-6 relative flex flex-col justify-between overflow-hidden ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'}`}>
            <div className="flex justify-between items-start mb-6">
              <GanttChartSquare className={`w-8 h-8 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />
              <div className={`px-2 py-1 rounded text-[10px] font-bold ${isGodMode ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'bg-red-500/10 text-red-500'}`}>12 ДНЕЙ ДО СДАЧИ</div>
            </div>
            <div>
              <h3 className={`text-lg font-bold font-['Montserrat'] mb-1 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Проекты</h3>
              <p className={`text-[11px] mb-4 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-500'}`}>ЖК "Лесной" • Фасадные работы</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold">ИИ</div>
                  <div className={`flex-1 h-2 rounded ${isGodMode ? 'bg-[#002200]' : 'bg-zinc-100 dark:bg-zinc-800'}`}><div className={`w-[40%] h-full rounded ${isGodMode ? 'bg-[#00FF41]' : 'bg-blue-500'}`}></div></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">АС</div>
                  <div className={`flex-1 h-2 rounded ${isGodMode ? 'bg-[#002200]' : 'bg-zinc-100 dark:bg-zinc-800'}`}><div className={`w-[85%] h-full rounded ml-6 ${isGodMode ? 'bg-[#00AA22]' : 'bg-emerald-500'}`}></div></div>
                </div>
              </div>
            </div>
          </TiltCard>

          <TiltCard className={`md:col-span-1 md:row-span-1 border rounded-2xl p-6 relative flex flex-col justify-between ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'}`}>
            <div className="flex justify-between items-start">
              <Wallet className={`w-8 h-8 ${isGodMode ? 'text-[#00FF41]' : 'text-emerald-500'}`} />
              <div className={`text-right ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>
                <div className="text-xl font-bold font-mono">+1.2M ₽</div>
                <div className="text-[10px] text-emerald-500 flex items-center justify-end"><ArrowRight className="w-3 h-3 -rotate-45 mr-1" /> 14% к маю</div>
              </div>
            </div>
            <div className="mt-6">
              <h3 className={`text-lg font-bold font-['Montserrat'] mb-2 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Финансы</h3>
              <div className="flex items-end gap-[2px] mt-4 h-12">
                {[30, 50, 40, 70, 60, 90, 80, 100].map((h, i) => (
                  <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} className={`flex-1 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity ${isGodMode ? 'bg-[#00FF41]' : 'bg-emerald-500'}`}></motion.div>
                ))}
              </div>
            </div>
          </TiltCard>

          <TiltCard className={`md:col-span-2 md:row-span-1 border rounded-2xl p-6 flex items-center justify-between overflow-hidden relative ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'}`}>
            <div className="relative z-10">
              <Database className={`w-8 h-8 mb-4 ${isGodMode ? 'text-[#00FF41]' : 'text-amber-500'}`} />
              <h3 className={`text-lg font-bold font-['Montserrat'] mb-1 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Склад и МТР</h3>
              <p className={`text-xs ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500'}`}>Штрихкодирование и контроль.</p>
            </div>
            <div className="text-right relative z-10 flex flex-col items-end">
              <div className={`text-4xl font-mono font-bold tracking-tight ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>1,402</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 mt-1">Товарных позиций</div>
              <div className="flex items-center gap-2 mt-3 w-32">
                <span className="text-[10px] text-zinc-500">Заполнено</span>
                <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-[84%] h-full bg-amber-500 rounded-full"></div>
                </div>
                <span className="text-[10px] font-bold text-amber-500">84%</span>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute right-0 top-0 opacity-5 w-48 h-48 translate-x-1/2 -translate-y-1/4">
              <Database className="w-full h-full text-amber-500" />
            </div>
          </TiltCard>

          <TiltCard className={`md:col-span-2 md:row-span-1 border rounded-2xl p-6 flex items-center justify-between overflow-hidden relative ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'}`}>
            <div className="relative z-10">
              <Wrench className={`w-8 h-8 mb-4 ${isGodMode ? 'text-[#00FF41]' : 'text-purple-500'}`} />
              <h3 className={`text-lg font-bold font-['Montserrat'] mb-1 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Техника и ТО</h3>
              <p className={`text-xs ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500'}`}>Расход ГСМ и путевые листы.</p>
            </div>
            <div className="text-right relative z-10 flex flex-col items-end">
              <div className={`text-4xl font-mono font-bold tracking-tight ${isGodMode ? 'text-[#00FF41]' : 'text-emerald-500'}`}>100%</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 mt-1">Исправность парка</div>
              <div className="flex gap-1 mt-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
                <span className="text-[10px] ml-1 text-zinc-500">3 авто в рейсе</span>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute right-0 top-0 opacity-5 w-48 h-48 translate-x-1/2 -translate-y-1/4">
              <Truck className="w-full h-full text-purple-500" />
            </div>
          </TiltCard>

        </div>
      </section>

      {/* ================= 5. AI EMPLOYEES ROSTER ================= */}
      <section id="agents" className={`py-32 px-6 max-w-7xl mx-auto z-10 relative border-b overflow-hidden ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
        <div className="text-center mb-16">
          <h2 className={`text-4xl lg:text-5xl font-black font-['Montserrat'] mb-6 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}>
            ВАШ НОВЫЙ ШТАТ СОТРУДНИКОВ
          </h2>
          <p className={`max-w-3xl mx-auto text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>Они не ходят в отпуск и работают 24/7. Выберите агента, чтобы посмотреть на его работу.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 flex flex-col gap-3 z-10">
            {aiAgents.map((agent) => {
              const Icon = agent.icon;
              return (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`flex items-start gap-4 p-5 rounded-xl text-left transition-all ${
                    activeAgent === agent.id 
                      ? (isGodMode ? 'bg-[#00FF41] text-black shadow-[0_0_20px_#00FF41] lg:translate-x-2' : 'bg-blue-600 text-white shadow-xl lg:translate-x-2')
                      : (isGodMode ? 'bg-[#001100] border border-[#00FF41]/30 text-[#00FF41]/70 hover:bg-[#002200]' : 'bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/80')
                  }`}
                >
                  <Icon className={`w-6 h-6 shrink-0 mt-1 ${activeAgent === agent.id ? (isGodMode ? 'text-black' : 'text-white') : (isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400')}`} />
                  <div>
                    <div className={`font-bold font-['Montserrat'] mb-1 ${activeAgent === agent.id ? (isGodMode ? 'text-black' : 'text-white') : (isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white')}`}>
                      {agent.title}
                    </div>
                    <div className={`text-xs leading-relaxed ${activeAgent === agent.id ? (isGodMode ? 'text-black/80' : 'text-white/80') : (isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-500')}`}>
                      {agent.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`col-span-1 lg:col-span-2 h-[600px] flex justify-center items-center relative z-10`}>
             <div className={`w-[320px] md:w-[380px] h-full rounded-[3rem] border-[8px] shadow-2xl relative overflow-hidden flex flex-col ${isGodMode ? 'bg-[#000000] border-[#111111] shadow-[#00FF41]/20' : 'bg-white dark:bg-[#0A0D14] border-zinc-900'}`}>
                {/* Smartphone Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                  <div className={`w-32 h-6 rounded-b-2xl ${isGodMode ? 'bg-[#111111]' : 'bg-zinc-900'}`}></div>
                </div>
                
                {/* Telegram Header */}
                <div className={`h-24 border-b flex items-end pb-3 px-4 z-10 pt-8 shadow-sm ${isGodMode ? 'bg-[#001100] border-[#00FF41]/30' : 'bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                   <div className="flex items-center gap-3 w-full">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isGodMode ? 'bg-[#00FF41] text-black' : 'bg-blue-500 text-white'}`}>
                        {React.createElement(activeAgentData.icon, { className: "w-5 h-5" })}
                     </div>
                     <div className="flex-1">
                       <div className={`font-bold text-sm ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>{activeAgentData.title} ИИ</div>
                       <div className={`text-[10px] ${isGodMode ? 'text-[#00FF41]/70' : 'text-blue-500'}`}>online</div>
                     </div>
                     <Phone className={`w-5 h-5 ${isGodMode ? 'text-[#00FF41]/50' : 'text-blue-500'}`} />
                   </div>
                </div>
                
                {/* Chat Body */}
                <div className={`flex-1 bg-cover bg-center p-4 overflow-y-auto flex flex-col gap-3 relative ${isGodMode ? 'bg-black' : 'bg-[url("https://web.telegram.org/a/chat-bg-pattern-dark.png")] dark:bg-zinc-950/80'}`}>
                   {isGodMode && <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>}
                   <AnimatePresence mode="wait">
                     <motion.div key={activeAgent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3 relative z-10">
                       {activeAgentData.logs.map((log, i) => (
                          <motion.div 
                            initial={{opacity:0, y:20, scale:0.9}} 
                            animate={{opacity:1, y:0, scale:1}} 
                            transition={{ delay: i * 0.4, type: "spring", stiffness: 200, damping: 20 }}
                            key={i} 
                            className={`max-w-[85%] p-3 rounded-2xl text-[13px] shadow-sm leading-relaxed
                              ${log.sender === 'user' 
                                ? (isGodMode ? 'bg-[#003300] text-[#00FF41] self-end rounded-tr-sm border border-[#00FF41]/30' : 'bg-blue-500 text-white self-end rounded-tr-sm') 
                                : log.sender === 'system' 
                                  ? 'bg-red-500 text-white self-center text-center text-xs' 
                                  : (isGodMode ? 'bg-[#000000] text-[#00FF41] self-start rounded-tl-sm border border-[#00FF41]/50' : 'bg-white dark:bg-zinc-800 dark:text-zinc-100 text-zinc-800 self-start rounded-tl-sm border border-zinc-200 dark:border-zinc-700')
                              }`}
                          >
                             {log.text}
                             <div className={`text-[9px] text-right mt-1.5 opacity-60 font-mono tracking-wider`}>{log.time}</div>
                          </motion.div>
                       ))}
                     </motion.div>
                   </AnimatePresence>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ================= LEAD MAGNET PDF ================= */}
      <section className={`py-24 px-6 relative z-10 ${isGodMode ? '' : 'bg-white dark:bg-[#080B10]'}`}>
        <div className="max-w-6xl mx-auto">
          <TiltCard className={`w-full rounded-[2.5rem] p-2 relative shadow-2xl ${isGodMode ? 'bg-[#001100] ring-1 ring-[#00FF41]/50' : 'bg-gradient-to-r from-blue-900 to-blue-950 ring-1 ring-blue-800'}`}>
            <div className={`rounded-[calc(2.5rem-0.5rem)] p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 ${isGodMode ? 'bg-black shadow-[inset_0_1px_1px_rgba(0,255,65,0.2)]' : 'bg-blue-950/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'}`}>
              
              {/* Blur orbs */}
              <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3 ${isGodMode ? 'bg-[#00FF41]/20' : 'bg-blue-500/30'}`} />
              <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none transform -translate-x-1/3 translate-y-1/3 ${isGodMode ? 'bg-[#00FF41]/10' : 'bg-purple-500/20'}`} />
              
              <div className="relative z-10 flex-1">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest mb-6 ${isGodMode ? 'bg-[#00FF41]/10 text-[#00FF41]' : 'bg-white/10 text-blue-200'}`}>
                  <FileText className="w-3 h-3" /> Бесплатный материал
                </div>
                <h3 className={`text-4xl md:text-5xl font-black font-['Montserrat'] mb-6 leading-tight ${isGodMode ? 'text-[#00FF41]' : 'text-white'}`}>
                  Техпаспорт цифровизации
                </h3>
                <p className={`text-lg max-w-xl ${isGodMode ? 'text-[#00FF41]/70' : 'text-blue-100/80'}`}>
                  Скачайте PDF-руководство: "7 скрытых точек потери денег между отделом продаж и производством". Плюс чек-лист готовности к внедрению ИИ.
                </p>
              </div>

              <div className="relative z-10 w-full md:w-[400px] shrink-0">
                <div className={`p-2 rounded-2xl flex flex-col gap-3 ${isGodMode ? 'bg-[#002200]/50 border border-[#00FF41]/30 backdrop-blur-md' : 'bg-white/5 border border-white/10 backdrop-blur-md'}`}>
                  <input 
                    type="email" 
                    placeholder="Ваш Email для отправки..." 
                    className={`w-full bg-transparent outline-none px-5 py-4 rounded-xl font-mono text-sm transition-colors ${isGodMode ? 'text-[#00FF41] placeholder:text-[#00FF41]/40 focus:bg-[#00FF41]/10' : 'text-white placeholder:text-white/40 focus:bg-white/10'}`}
                  />
                  <button className={`w-full py-4 rounded-xl font-bold font-mono tracking-widest uppercase text-sm flex items-center justify-center gap-2 transition-colors ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-white text-blue-900 hover:bg-gray-100'}`}>
                    <Copy className="w-4 h-4" /> Скачать (2.4 МБ)
                  </button>
                </div>
                <p className={`text-center mt-4 text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-1 ${isGodMode ? 'text-[#00FF41]/40' : 'text-blue-200/50'}`}>
                  <Lock className="w-3 h-3" /> Без спама. Формат PDF.
                </p>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ================= 6. PRICING ================= */}
      <section id="pricing" className={`py-32 px-6 max-w-7xl mx-auto z-10 relative border-b ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
        <div className="text-center mb-20">
          <h2 className={`text-4xl font-bold font-['Montserrat'] mb-6 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}>ИНВЕСТИЦИИ В ИНФРАСТРУКТУРУ</h2>
          <p className={`max-w-2xl mx-auto text-lg ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>Система окупает себя в первый месяц за счет контроля МТР.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <TiltCard className={`border p-12 relative shadow-2xl rounded-2xl ${isGodMode ? 'bg-[#001100] border-[#00FF41]' : 'bg-white dark:bg-zinc-900/80 border-blue-600'}`}>
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 text-[10px] px-6 py-2 uppercase font-mono tracking-widest font-bold rounded-b-lg ${isGodMode ? 'bg-[#00FF41] text-black' : 'bg-blue-600 text-white'}`}>Выбор РБК-500</div>
            <h3 className={`text-3xl font-bold mb-2 font-['Montserrat'] mt-4 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>AI-КОМАНДА</h3>
            <div className={`text-5xl font-black font-mono mb-4 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>
              <span className={`text-2xl line-through mr-2 opacity-50 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-400'}`}>18 990</span>
              14 990 ₽ <span className={`text-xl font-normal ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-400'}`}>/ мес</span>
            </div>
            <p className={`text-base mb-10 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-500'}`}>Идеально для компаний до 50 сотрудников</p>
            
            <ul className={`space-y-5 mb-12 text-lg ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-700 dark:text-zinc-300'}`}>
              <li className="flex items-start gap-4"><Check className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-600'}`} /> <span>Полный доступ ко всем модулям</span></li>
              <li className="flex items-start gap-4"><Check className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-600'}`} /> <span>Штат из 6 AI-Сотрудников</span></li>
              <li className="flex items-start gap-4"><Check className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]' : 'text-blue-600'}`} /> <span>Сотрудники получают наряды прямо в Telegram</span></li>
            </ul>
            <button onClick={() => scrollTo('onboarding')} className={`w-full py-5 font-mono font-bold text-sm uppercase tracking-widest rounded-xl transition-colors shadow-xl ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              Начать Trial
            </button>
          </TiltCard>

          <TiltCard className={`border p-12 relative rounded-2xl ${isGodMode ? 'bg-black border-[#00FF41]/30' : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800'}`}>
            <h3 className={`text-3xl font-bold mb-2 font-['Montserrat'] mt-4 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>CORPORATE CORE</h3>
            <div className={`text-4xl font-bold font-mono mb-4 ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>Индивидуально</div>
            <p className={`text-base mb-10 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-500'}`}>Для корпораций (on-premise или 1С)</p>
            
            <ul className={`space-y-5 mb-12 text-lg ${isGodMode ? 'text-[#00FF41]/80' : 'text-zinc-600 dark:text-zinc-400'}`}>
              <li className="flex items-start gap-4"><Server className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`} /> <span>Выделенный кластер БД</span></li>
              <li className="flex items-start gap-4"><Database className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`} /> <span>Двусторонний шлюз с вашей 1С:ERP</span></li>
              <li className="flex items-start gap-4"><UserPlus className={`w-6 h-6 shrink-0 mt-1 ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-400'}`} /> <span>Персональный менеджер</span></li>
            </ul>
            <button className={`w-full py-5 border font-mono font-bold text-sm uppercase tracking-widest rounded-xl transition-colors ${isGodMode ? 'bg-black border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41]/10' : 'bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 text-zinc-900 dark:text-white'}`}>
              Наназначить встречу
            </button>
          </TiltCard>
        </div>
      </section>

      {/* ================= 7. ONBOARDING (CTA) ================= */}
      <section id="onboarding" className="py-40 px-6 max-w-3xl mx-auto text-center z-10 relative">
        <h2 className={`text-5xl font-bold font-['Montserrat'] mb-8 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-950 dark:text-white'}`}>ПОЛУЧИТЕ ПРЕДОСТУП</h2>
        <p className={`text-xl mb-12 ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-600 dark:text-zinc-400'}`}>Введите ИНН вашей компании для подготовки индивидуального стенда.</p>
        
        <div className="relative flex flex-col gap-6 mt-12 text-left">
          <div className="flex items-center justify-between">
            <label className="flex items-start gap-3 cursor-pointer group px-1">
              <div className="relative flex items-center justify-center pt-1">
                <input type="checkbox" className="sr-only" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} />
                <div className={`w-5 h-5 border transition-colors flex items-center justify-center rounded ${legalConsent ? (isGodMode ? 'bg-[#00FF41] border-[#00FF41]' : 'bg-blue-600 border-blue-600') : (isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-300 dark:border-zinc-700')}`}>
                  {legalConsent && <CheckCircle2 className={`w-4 h-4 ${isGodMode ? 'text-black' : 'text-white'}`} />}
                </div>
              </div>
              <span className={`text-xs leading-relaxed font-mono ${isGodMode ? 'text-[#00FF41]/50' : 'text-zinc-500'}`}>
                Согласие на обработку ПД (152-ФЗ).
              </span>
            </label>
            <div className={`text-xs font-mono font-bold ${isGodMode ? 'text-[#00FF41]' : 'text-emerald-500'}`}>Уже 1200+ компаний в системе</div>
          </div>

          <div className="w-full relative z-20">
            <label className={`block text-sm font-mono font-bold mb-4 uppercase tracking-widest ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500'}`}>
              ИНН Компании (попробуйте godmode)
            </label>
            <div className="relative w-full flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Building2 className={`absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors ${isGodMode ? 'text-[#00FF41] group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-blue-600'}`} />
                <input
                  id="inn-input"
                  type="text" maxLength={12} value={innInput} onChange={(e) => handleInnChange(e.target.value)}
                  placeholder="ИНН (10 цифр) или godmode"
                  className={`w-full pl-16 pr-12 py-6 border-2 focus:outline-none transition-all rounded-xl text-2xl font-mono ${isGodMode ? 'bg-black border-[#00FF41] text-[#00FF41] placeholder:text-[#00FF41]/30 focus:border-white focus:shadow-[0_0_20px_#00FF41]' : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-700 focus:border-blue-600 dark:focus:border-blue-600 text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 shadow-lg focus:shadow-blue-500/20'}`}
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center">
                  {isSearching && <Loader2 className={`w-6 h-6 animate-spin ${isGodMode ? 'text-[#00FF41]' : 'text-blue-500'}`} />}
                  {isValidInn && !isSearching && <CheckCircle2 className={`w-6 h-6 ${isGodMode ? 'text-white' : 'text-emerald-500'}`} />}
                </div>
              </div>
              <button
                onClick={handleStartRegistration}
                className={`w-full sm:w-auto px-12 py-6 font-mono font-bold text-lg tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-2xl ${isGodMode ? 'bg-[#00FF41] text-black hover:bg-[#00CC33]' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isSearching ? 'ПОИСК...' : 'ЗАПРОСИТЬ'}
              </button>
            </div>
          </div>
        </div>
        
        {searchError && (
          <div className={`mt-6 text-sm font-mono py-4 border text-left px-8 rounded-xl ${isGodMode ? 'bg-red-900/30 border-red-500/50 text-red-500' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40'}`}>
            {'>'} ОШИБКА: {searchError}
          </div>
        )}
      </section>

      {/* ================= 8. FOOTER ================= */}
      <footer className={`border-t pt-24 pb-12 px-6 font-mono text-xs z-10 relative ${isGodMode ? 'border-[#00FF41]/30 bg-black text-[#00FF41]/50' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#05070A] text-zinc-500'}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1 md:col-span-2">
            <h3 className={`text-3xl font-black font-['Montserrat'] mb-6 ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>СФЕРА ERP</h3>
            <p className={`max-w-sm leading-relaxed mb-8 text-sm ${isGodMode ? 'text-[#00FF41]/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
              ООО "СФЕРА ПРОМЫШЛЕННАЯ ГРУППА"<br/>
              ИНН: 5610248560 | ОГРН: 1235600000000<br/><br/>
              📞 +7 (800) 555-00-00<br/>
              ✉️ hello@sphera.group
            </p>
          </div>
          <div>
            <h4 className={`font-bold mb-6 uppercase tracking-widest ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Продукт</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => scrollTo('modules')} className={isGodMode ? 'hover:text-white' : 'hover:text-blue-500'}>Модули</button></li>
              <li><button onClick={() => scrollTo('pricing')} className={isGodMode ? 'hover:text-white' : 'hover:text-blue-500'}>Тарифы</button></li>
            </ul>
          </div>
          <div>
            <h4 className={`font-bold mb-6 uppercase tracking-widest ${isGodMode ? 'text-[#00FF41]' : 'text-zinc-900 dark:text-white'}`}>Правовая информация</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="/docs/terms" className={isGodMode ? 'hover:text-white' : 'hover:text-blue-500'}>Оферта</a></li>
              <li><a href="/docs/privacy" className={isGodMode ? 'hover:text-white' : 'hover:text-blue-500'}>Политика конфиденциальности</a></li>
            </ul>
          </div>
        </div>
        <div className={`max-w-7xl mx-auto border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] uppercase tracking-widest ${isGodMode ? 'border-[#00FF41]/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
          <div>© {new Date().getFullYear()} СФЕРА ERP. Все права защищены.</div>
          <div>152-ФЗ Compliant.</div>
        </div>
      </footer>

    </div>
  );
};
