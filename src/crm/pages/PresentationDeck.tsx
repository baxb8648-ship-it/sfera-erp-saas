import React, { useState } from 'react';
import {
  Printer,
  Buildings,
  Truck,
  Armchair,
  Plant,
  Sparkle,
  Cpu,
  Globe,
  Stack,
  Sun,
  Moon,
  CheckCircle,
  RocketLaunch,
  WarningCircle,
  Check
} from '@phosphor-icons/react';

type DeckCategory = 'general' | 'construction' | 'fleet' | 'furniture' | 'agro' | 'beauty';
type DeckVisualTheme = 'auto' | 'light' | 'dark';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  badge?: string;
  content: React.ReactNode;
}

const INDUSTRY_NAMES: Record<DeckCategory, string> = {
  general: 'Общая презентация экосистемы',
  construction: 'Строительство и Подрядчики',
  fleet: 'Аренда Спецтехники и Автопарк',
  furniture: 'Мебельное Производство (2D-Раскрой)',
  agro: 'Агропромышленный Комплекс и Скот',
  beauty: 'Салоны Красоты, Клиники и Услуги'
};

export const PresentationDeck: React.FC = () => {
  const [activeDeck, setActiveDeck] = useState<DeckCategory>('general');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [visualTheme, setVisualTheme] = useState<DeckVisualTheme>('auto');

  const handlePrintPdf = () => {
    window.print();
  };

  const isLight = visualTheme === 'light' || (visualTheme === 'auto' && !document.documentElement.classList.contains('dark'));

  // ==========================================
  // 1. СЛАЙД 1: ПОЗИЦИОНИРОВАНИЕ И ВИЗИТКА
  // ==========================================
  const slideVision: Slide = {
    id: 1,
    title: `СФЕРА ERP SaaS: ${INDUSTRY_NAMES[activeDeck]}`,
    subtitle: 'Автономная Облачная Операционная Система Предприятия с ИИ-Агентами и B2B-Биржей',
    badge: `STRATEGY & VISION — ${activeDeck.toUpperCase()}`,
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
        <div className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm ${
          isLight ? 'bg-gradient-to-b from-gray-50 to-white border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#F95700]/15 border border-[#F95700]/30 flex items-center justify-center text-[#F95700] mb-4">
              <Stack size={26} weight="duotone" />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#F95700] uppercase tracking-widest block mb-1">
              АРХИТЕКТУРА УЧЕТА
            </span>
            <h3 className={`text-xl font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Глубокий отраслевой учёт
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Вместо пустых универсальных таблиц — готовая математика и техкарты специально для направления «{INDUSTRY_NAMES[activeDeck]}».
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono font-bold text-[#F95700]">
            <span>ZERO-SLOP ENGINEERING</span>
            <span className="px-2 py-0.5 rounded bg-[#F95700]/10">100% ТОЧНОСТЬ</span>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden shadow-md ${
          isLight
            ? 'bg-gradient-to-b from-orange-50/70 via-white to-white border-orange-200/80'
            : 'bg-gradient-to-b from-[#201a18] to-[#18181b] border-[#F95700]/40'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/15 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#F95700] flex items-center justify-center text-white shadow-lg shadow-[#F95700]/30 mb-4">
              <Cpu size={26} weight="fill" />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#F95700] uppercase tracking-widest block mb-1">
              АВТОНОМНЫЙ ШТАТ 24/7
            </span>
            <h3 className={`text-xl font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ИИ-Сотрудники в штате
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              4 нейроагента (Юрист, Сметчик, Менеджер, Финконтроллер), работающие внутри ERP, Telegram и WhatsApp без выходных.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono font-bold text-[#10B981]">
            <span>PINECONE RAG + QLORA</span>
            <span className="px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981]">0% ОШИБОК</span>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex flex-col justify-between shadow-sm ${
          isLight ? 'bg-gradient-to-b from-gray-50 to-white border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 mb-4">
              <Globe size={26} weight="duotone" />
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-500 uppercase tracking-widest block mb-1">
              СЕТЕВАЯ СИНЕРГИЯ
            </span>
            <h3 className={`text-xl font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Внутренняя B2B-Биржа
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Закрытая сеть проверенных участников для аренды техники, сбыта стройматериалов и поиска надежного субподряда.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono font-bold text-blue-500">
            <span>SMART B2B MATCHING</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10">ПРОДОЛЖЕНИЕ БИЗНЕСА</span>
          </div>
        </div>
      </div>
    )
  };

  // ==========================================
  // 2. СЛАЙД 2: ПРОБЛЕМАТИКА РЫНКА
  // ==========================================
  const slideMarketPain: Slide = {
    id: 2,
    title: 'Почему 1С, Битрикс24 и amoCRM устарели',
    subtitle: 'Разрыв между CRM-воронкой продаж и реальным производством сжигает до 18% маржи',
    badge: 'MARKET PROBLEM & ARCHITECTURE',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-red-600 dark:text-red-400 font-black uppercase tracking-wider">
                ПРОБЛЕМА 1С
              </span>
              <WarningCircle size={20} className="text-red-500" weight="fill" />
            </div>
            <h4 className={`text-lg font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Армия программистов и 6 месяцев старта
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
              Устаревшая архитектура из 2000-х годов, сложный десктопный интерфейс и огромные затраты на доработку каждого отчета.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <span>⚠️ Высокая скрытая стоимость (TCO)</span>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                ПРОБЛЕМА БИТРИКС / AMO
              </span>
              <WarningCircle size={20} className="text-amber-500" weight="fill" />
            </div>
            <h4 className={`text-lg font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Заканчиваются на этапе «Договор»
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
              CRM ведет сделки, но слепа в производстве: не умеет считать 2D-раскрой плит, телеметрию ГЛОНАСС или акты КС-2.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span>⚠️ Разрыв с цехом и кассовые разрывы</span>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/30 p-6 rounded-3xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                РЕШЕНИЕ СФЕРА ERP SaaS
              </span>
              <Check size={20} className="text-emerald-500" weight="bold" />
            </div>
            <h4 className={`text-lg font-bold mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Сквозной учёт + ИИ + Биржа в облаке
            </h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
              Мгновенный старт за 30 секунд по ИНН, готовая математика отраслей и цифровые сотрудники с 1-го дня.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>✅ Единая сквозная SaaS-система</span>
          </div>
        </div>
      </div>
    )
  };

  // ==========================================
  // 3. СЛАЙД 3: ИИ-ШТАТ СФЕРА
  // ==========================================
  const slideAIEmployees: Slide = {
    id: 3,
    title: 'Единый ИИ-Центр СФЕРА (Цифровой Штат 24/7)',
    subtitle: 'Нейросети, обученные на регламентах вашей компании через Pinecone RAG и QLoRA',
    badge: 'AI ORCHESTRATION 24/7',
    content: (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-auto">
        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#F95700] px-2 py-0.5 rounded bg-[#F95700]/10 inline-block mb-3">
              AI LAWYER
            </span>
            <h4 className={`font-bold text-base mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Юрист и Комплаенс
            </h4>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Проверяет договоры, риски штрафов РКН/ФАС и ОРД маркировку. Автоматически готовит акты и претензии.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800 text-[11px] font-mono font-bold text-[#F95700]">
            0% ЮРИДИЧЕСКИХ РИСКОВ
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10 inline-block mb-3">
              AI ESTIMATOR
            </span>
            <h4 className={`font-bold text-base mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Сметчик и Технолог
            </h4>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Сверяет СНиПы, чертежи, спецификации BOM и подсказывает оптимальные нормы расхода материалов.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800 text-[11px] font-mono font-bold text-[#10B981]">
            ТОЧНОСТЬ СМЕТЫ 99.8%
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <span className="text-[10px] font-mono font-bold text-blue-500 px-2 py-0.5 rounded bg-blue-500/10 inline-block mb-3">
              AI SALES
            </span>
            <h4 className={`font-bold text-base mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Менеджер продаж 24/7
            </h4>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Консультирует лидов в Telegram/WhatsApp, выставляет КП, счета и записывает клиентов на встречи.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800 text-[11px] font-mono font-bold text-blue-500">
            ОТВЕТ ЗА 3 СЕКУНДЫ
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-500 px-2 py-0.5 rounded bg-purple-500/10 inline-block mb-3">
              AI ANALYST
            </span>
            <h4 className={`font-bold text-base mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Финконтроллер
            </h4>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Предсказывает кассовые разрывы (Cash Flow Gap), маржинальность объектов и рентабельность.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800 text-[11px] font-mono font-bold text-purple-500">
            ЗАЩИТА ЛИКВИДНОСТИ
          </div>
        </div>
      </div>
    )
  };

  // ==========================================
  // 4. СЛАЙД 4: ОТРАСЛЕВОЙ МОДУЛЬ
  // ==========================================
  const industryDeepDives: Record<DeckCategory, Slide> = {
    general: {
      id: 4,
      title: '5 Отраслевых Модулей в едином облаке',
      subtitle: 'Готовая математика для ключевых секторов реальной экономики',
      badge: 'INDUSTRY MODULES OVERVIEW',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono text-[#F95700] font-bold uppercase tracking-wider">СТРОИТЕЛЬСТВО</span>
              <h4 className={`font-bold text-lg mt-2 mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Акты КС-2 / КС-3 в 1 клик</h4>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Автоматическая генерация актов сдачи-приемки, учет ЛКМ и биржа субподряда.</p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#F95700]">ГОСТ Р 58110-2018</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono text-[#10B981] font-bold uppercase tracking-wider">АВТОПАРК И АРЕНДА</span>
              <h4 className={`font-bold text-lg mt-2 mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Шахматка аренды + ГЛОНАСС</h4>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Телеметрия 2ГИС, контроль ДУТ и сливов топлива, путевые листы.</p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#10B981]">ЗАГРУЗКА ТЕХНИКИ 100%</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono text-blue-500 font-bold uppercase tracking-wider">МЕБЕЛЬ, АГРО И УСЛУГИ</span>
              <h4 className={`font-bold text-lg mt-2 mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>2D-Раскрой и Карта Полей</h4>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Guillotine Bin-Packing для ЛДСП, кадастровые карты полей и онлайн-запись 24/7.</p>
            </div>
            <div className="mt-4 text-xs font-bold text-blue-500">ТОЧНАЯ СЕБЕСТОИМОСТЬ</div>
          </div>
        </div>
      )
    },
    construction: {
      id: 4,
      title: 'Строительство и Подрядчики',
      subtitle: 'Управление строительными объектами от тендера до сдачи без кассовых разрывов',
      badge: 'DEEP-DIVE: CONSTRUCTION & CONTRACTORS',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#F95700] uppercase tracking-wider">ФИНАНСЫ И ГОСТ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Акты КС-2 и КС-3 в 1 клик</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Автоматическая генерация государственных актов сдачи-приемки на основе выполненных объемов сметы.</p>
            </div>
            <div className="text-xs font-bold text-[#F95700] mt-4">ГОСТ Р 58110-2018</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">МАТЕРИАЛЫ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Журнал расхода ЛКМ/ТМЦ</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Списание стройматериалов со склада напрямую на конкретный объект строительства и контроль остатков.</p>
            </div>
            <div className="text-xs font-bold text-[#10B981] mt-4">ТОЧНЫЙ СКЛАДСКОЙ УЧЕТ</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">B2B БИРЖА</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Срочный поиск субподряда</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Размещайте заявки на монолитные, фасадные или кровельные работы среди проверенных подрядчиков СФЕРЫ.</p>
            </div>
            <div className="text-xs font-bold text-blue-500 mt-4">ЗАКРЫТАЯ СЕТЬ ПАРТНЕРОВ</div>
          </div>
        </div>
      )
    },
    fleet: {
      id: 4,
      title: 'Аренда Спецтехники и Автопарк',
      subtitle: 'Сведите к нулю простои техники и исключите сливы топлива через телеметрию 2ГИС',
      badge: 'DEEP-DIVE: FLEET & RENTAL MANAGEMENT',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#F95700] uppercase tracking-wider">ПЛАНИРОВАНИЕ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Шахматка аренды (Гант)</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Визуальная сетка бронирований техники на 14/30 дней со статусами занятости, ТО и оплаты.</p>
            </div>
            <div className="text-xs font-bold text-[#F95700] mt-4">ЗАГРУЗКА ТЕХНИКИ 100%</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">ТЕЛЕМЕТРИЯ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>ГЛОНАСС и Карта 2ГИС</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Онлайн-контроль координат, скорости, моточасов и уровня топлива (ДУТ) с детектором сливов.</p>
            </div>
            <div className="text-xs font-bold text-[#10B981] mt-4">ЭКОНОМИЯ ТОПЛИВА ДО 25%</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">ДОКУМЕНТЫ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Договор и Паспорт за секунды</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Мгновенная генерация договора аренды спецтехники и путевого листа с реквизитами арендатора.</p>
            </div>
            <div className="text-xs font-bold text-blue-500 mt-4">ЮРИДИЧЕСКАЯ ЧИСТОТА</div>
          </div>
        </div>
      )
    },
    furniture: {
      id: 4,
      title: 'Мебельное Производство (2D-Раскрой)',
      subtitle: 'Оцифровка мебельного цеха от эскиза до сборки без отходов плит',
      badge: 'DEEP-DIVE: FURNITURE & 2D CUTTING',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#F95700] uppercase tracking-wider">РАСКРОЙ ПЛИТ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Guillotine Bin-Packing</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Математический 2D-раскрой плит ЛДСП с учетом направления волокон, реза (kerf) и деловых остатков.</p>
            </div>
            <div className="text-xs font-bold text-[#F95700] mt-4">МИНИМИЗАЦИЯ ОТХОДОВ</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">СПЕЦИФИКАЦИЯ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>BOM и Калькулятор кромки</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Автоматический расчет погонных метров кромления по 4 сторонам деталей и учет фурнитуры по заказу.</p>
            </div>
            <div className="text-xs font-bold text-[#10B981] mt-4">ТОЧНАЯ СЕБЕСТОИМОСТЬ</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">ПРОИЗВОДСТВО</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Канбан Маршрутного листа</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Проведение заказа через Распил → Кромка → Присадка → Сборка с авто-списанием со склада.</p>
            </div>
            <div className="text-xs font-bold text-blue-500 mt-4">ПРОЗРАЧНОСТЬ ЦЕХА</div>
          </div>
        </div>
      )
    },
    agro: {
      id: 4,
      title: 'Агропромышленный Комплекс и Скот',
      subtitle: 'Управление агрохозяйством на языке точных цифр и кадастровых карт',
      badge: 'DEEP-DIVE: AGRO & LIVESTOCK',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#F95700] uppercase tracking-wider">ПОЛЯ И ТЕХНИКА</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Карта Полей 2ГИС</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Кадастровые границы, севооборот, контроль технологических операций и норм расхода топлива (л/га).</p>
            </div>
            <div className="text-xs font-bold text-[#F95700] mt-4">КОНТРОЛЬ ПОСЕВОВ</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">ЖИВОТНОВОДСТВО</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Стадо и Ветжурнал</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Учет КРС, МРС и лошадей по RFID-биркам, регистрация привесов, приплода и актов ветеринарии.</p>
            </div>
            <div className="text-xs font-bold text-[#10B981] mt-4">ПАСПОРТ КАЖДОГО ЖИВОТНОГО</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">1С СТАНДАРТ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Корма и Рационы</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Выдача кормов со склада по стандартам 1С:Сельхозстандарт с автоматической проводкой прихода.</p>
            </div>
            <div className="text-xs font-bold text-blue-500 mt-4">НОРМИРОВАНИЕ РАЦИОНА</div>
          </div>
        </div>
      )
    },
    beauty: {
      id: 4,
      title: 'Салоны Красоты, Клиники и Услуги',
      subtitle: 'Онлайн-запись 24/7 и точное списание расходников по техкартам',
      badge: 'DEEP-DIVE: BEAUTY & SERVICES',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#F95700] uppercase tracking-wider">ОНЛАЙН-ЗАПИСЬ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Шахматка расписания</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Интуитивный календарь визитов к мастерам с разделением по кабинетам и статусам оплаты.</p>
            </div>
            <div className="text-xs font-bold text-[#F95700] mt-4">ЗАГРУЗКА МАСТЕРОВ</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">СКЛАД</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>Списание по Техкартам</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Автоматическое списание граммов препаратов и красителей сразу при закрытии визита в системе.</p>
            </div>
            <div className="text-xs font-bold text-[#10B981] mt-4">ТОЧНОСТЬ ДО 1 ГРАММА</div>
          </div>
          <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
            <div>
              <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">ТЕЛЕГРАМ БОТ</span>
              <h3 className={`text-lg font-bold mt-2 mb-2.5 ${isLight ? 'text-gray-900' : 'text-white'}`}>ИИ-Администратор 24/7</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Бот сам проконсультирует клиента, запишет на процедуру и напомнит о визите без участия персонала.</p>
            </div>
            <div className="text-xs font-bold text-blue-500 mt-4">ЗАПИСЬ БЕЗ АДМИНА</div>
          </div>
        </div>
      )
    }
  };

  // ==========================================
  // 5. СЛАЙД 5: ОНБОРДИНГ И СТАРТ
  // ==========================================
  const slideNextSteps: Slide = {
    id: 5,
    title: 'Быстрый старт за 30 секунд по ИНН',
    subtitle: 'Мгновенное развертывание облачного тенанта СФЕРА ERP SaaS под ваши реквизиты',
    badge: 'ONBOARDING & NEXT STEPS',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#F95700]/15 text-[#F95700] font-black flex items-center justify-center text-sm mb-4">
              01
            </div>
            <h4 className={`text-lg font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Ввод ИНН компании</h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Система автоматически загружает реквизиты из ФНС/ЕГРЮЛ, банковские счета и создает изолированное SaaS-пространство.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-gray-200 dark:border-zinc-800 text-xs font-semibold text-[#F95700] flex items-center gap-1.5">
            <CheckCircle size={16} weight="fill" /> Автозаполнение реквизитов
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#18181b] border-zinc-800'}`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#10B981]/15 text-[#10B981] font-black flex items-center justify-center text-sm mb-4">
              02
            </div>
            <h4 className={`text-lg font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Выбор отраслевого модуля</h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Подключение специализированной математики: Строительство, Автопарк, Мебель, Агро или Услуги.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-gray-200 dark:border-zinc-800 text-xs font-semibold text-[#10B981] flex items-center gap-1.5">
            <CheckCircle size={16} weight="fill" /> Готовые техкарты и шаблоны
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isLight ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#18181b] border-[#F95700]/40'
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#F95700] text-white font-black flex items-center justify-center text-sm mb-4 shadow-lg shadow-[#F95700]/30">
              03
            </div>
            <h4 className={`text-lg font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Активация ИИ-Штата</h4>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              Цифровые сотрудники подключаются к Telegram/WhatsApp и сразу начинают контролировать маржу и продажи.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-orange-500/30 text-xs font-bold text-[#F95700] flex items-center gap-1.5">
            <RocketLaunch size={16} weight="fill" /> Готово к боевой работе
          </div>
        </div>
      </div>
    )
  };

  // ПОЛНАЯ 5-СЛАЙДОВАЯ ВОРОНКА
  const funnelSlides: Slide[] = [
    slideVision,
    slideMarketPain,
    slideAIEmployees,
    industryDeepDives[activeDeck],
    slideNextSteps
  ];

  const currentSlide = funnelSlides[activeSlideIndex] || funnelSlides[0];

  return (
    <div className="w-full space-y-6">
      {/* 
        Стиль изоляции печати: Скрывает весь остальной интерфейс CRM и выводит 
        исключительно 5 альбомных листов A4 из #sphera-pitch-deck-print!
      */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          body, html {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #sphera-pitch-deck-print,
          #sphera-pitch-deck-print * {
            visibility: visible !important;
          }
          #sphera-pitch-deck-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .sphera-print-page {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            box-sizing: border-box !important;
            padding: 14mm 18mm !important;
            background-color: #ffffff !important;
            color: #111827 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      `}</style>

      {/* Панель выбора презентации, переключатель темы и печать */}
      <div className="print:hidden max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setActiveDeck('general'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'general'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Sparkle size={15} /> Общая
          </button>
          <button
            onClick={() => { setActiveDeck('construction'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'construction'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Buildings size={15} /> Строительство
          </button>
          <button
            onClick={() => { setActiveDeck('fleet'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'fleet'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Truck size={15} /> Автопарк
          </button>
          <button
            onClick={() => { setActiveDeck('furniture'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'furniture'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Armchair size={15} /> Мебель
          </button>
          <button
            onClick={() => { setActiveDeck('agro'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'agro'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Plant size={15} /> Агро
          </button>
          <button
            onClick={() => { setActiveDeck('beauty'); setActiveSlideIndex(0); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeDeck === 'beauty'
                ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/30'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Sparkle size={15} /> Услуги
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setVisualTheme(prev => prev === 'light' ? 'dark' : 'light')}
            title="Переключить стиль презентации (Светлый Executive / Тёмный Industrial)"
            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {isLight ? (
              <>
                <Moon size={16} weight="bold" /> Тёмный Industrial
              </>
            ) : (
              <>
                <Sun size={16} weight="bold" /> Светлый Executive
              </>
            )}
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F95700] to-[#ff7a33] hover:from-[#e04e00] hover:to-[#F95700] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#F95700]/25 transition cursor-pointer"
          >
            <Printer size={18} weight="bold" />
            <span>Печать PDF (5 слайдов 16:9)</span>
          </button>
        </div>
      </div>

      {/* ИНТЕРАКТИВНЫЙ РЕЖИМ НА ЭКРАНЕ */}
      <div className={`print:hidden w-full max-w-7xl mx-auto min-h-[600px] aspect-[16/9] border rounded-3xl p-8 sm:p-12 flex flex-col justify-between relative shadow-2xl overflow-hidden transition-all duration-500 ${
        isLight
          ? 'bg-white border-gray-200 text-gray-900 shadow-xl'
          : 'bg-gradient-to-br from-[#121215] via-[#16161a] to-[#0f0f12] border-zinc-800 text-white'
      }`}>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#F95700]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Шапка слайда */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-zinc-800 pb-6 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F95700]/15 text-[#F95700] text-xs font-mono font-bold uppercase tracking-wider border border-[#F95700]/30 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F95700] animate-pulse" />
              {currentSlide.badge || 'SPHERA ERP SAAS DECK'}
            </span>
            <h1 className={`text-2xl sm:text-4xl font-black tracking-tight font-['Montserrat'] ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              {currentSlide.title}
            </h1>
            <p className={`text-xs sm:text-base mt-2 max-w-3xl leading-relaxed ${
              isLight ? 'text-gray-600' : 'text-gray-300'
            }`}>
              {currentSlide.subtitle}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className={`text-3xl font-black font-mono ${isLight ? 'text-gray-900' : 'text-white'}`}>
              0{currentSlide.id} / 05
            </div>
            <div className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              SPHERA ERP v1.5
            </div>
          </div>
        </div>

        {/* Контент слайда */}
        <div className="my-auto py-6 relative z-10">
          {currentSlide.content}
        </div>

        {/* Подвал и навигация */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-zinc-800 pt-5 text-xs text-gray-500 relative z-10">
          <div className="font-semibold tracking-wide">
            © 2026 СФЕРА ERP SaaS — Мультитенантная Облачная Операционная Система
          </div>
          <div className="flex items-center gap-2">
            {funnelSlides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveSlideIndex(idx)}
                title={s.title}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeSlideIndex
                    ? 'w-8 bg-[#F95700] shadow-md shadow-[#F95700]/50'
                    : 'w-2.5 bg-gray-300 dark:bg-[#2a2a2a] hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ИЗОЛИРОВАННЫЙ КОНТЕЙНЕР ДЛЯ ПЕЧАТИ В PDF (#sphera-pitch-deck-print) */}
      {/* Скрывает весь остальной интерфейс CRM и печатает 5 идеальных листов A4 */}
      {/* ============================================================== */}
      <div id="sphera-pitch-deck-print" className="hidden print:block">
        {funnelSlides.map((slide, index) => (
          <div key={slide.id} className="sphera-print-page">
            {/* Шапка слайда для печати */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F95700]/10 text-[#F95700] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#F95700]/20 mb-2">
                  {slide.badge || 'SPHERA ERP SAAS DECK'}
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight font-['Montserrat']">
                  {slide.title}
                </h1>
                <p className="text-gray-600 text-xs mt-1">
                  {slide.subtitle}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-gray-900 font-mono">
                  0{index + 1} / 05
                </div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                  СЛАЙД {index + 1} ИЗ 5
                </div>
              </div>
            </div>

            {/* Контент слайда */}
            <div className="my-auto py-4">
              {slide.content}
            </div>

            {/* Подвал слайда для печати */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-[11px] text-gray-600">
              <div className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F95700]" />
                © 2026 СФЕРА ERP SaaS — Мультитенантная Облачная Операционная Система
              </div>
              <div className="font-mono font-bold text-[#F95700] tracking-wider">
                WWW.СФЕРА-ЕРП.РФ • DEMO ACCESS
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
