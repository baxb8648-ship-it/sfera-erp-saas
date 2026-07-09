import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Activity, Sparkles
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { AIFineTuneSettings } from '../components/AIFineTuneSettings';
import KnowledgeBase from './KnowledgeBase';

// ─── Готовые ИИ-Сотрудники для любого бизнеса (Fallback & Default Catalog) ───
interface DigitalEmployee {
  id: string;
  name: string;
  role: string;
  description: string;
  category: 'construction' | 'sales' | 'finance' | 'legal' | 'supply' | 'support';
  icon: string;
  status: 'active' | 'paused' | 'locked';
  tasksCompleted: number;
  channels: string[];
  priceMonthly: number;
}

const PRESET_EMPLOYEES: DigitalEmployee[] = [
  {
    id: 'legal-bot',
    name: 'ИИ-Юрист «Арбитр»',
    role: 'Проверка договоров и рисков',
    description: 'Анализирует договоры подряда и поставки за 15 секунд. Выявляет скрытые штрафы, невыгодные условия и автоматически составляет протокол разногласий.',
    category: 'legal',
    icon: '⚖️',
    status: 'active',
    tasksCompleted: 142,
    channels: ['CRM Документы', 'Telegram'],
    priceMonthly: 0
  },
  {
    id: 'estimate-bot',
    name: 'ИИ-Сметчик «Прораб-AI»',
    role: 'Контроль смет КС-2 / КС-3',
    description: 'Сверяет фактический расход материалов на объекте с проектной сметой. Мгновенно предупреждает о перерасходе или завышении цен подрядчиками.',
    category: 'construction',
    icon: '🏗️',
    status: 'active',
    tasksCompleted: 318,
    channels: ['Модуль Строительство', 'WhatsApp'],
    priceMonthly: 0
  },
  {
    id: 'sales-bot',
    name: 'ИИ-Менеджер продаж 24/7',
    role: 'Квалификация лидов и ответы в чатах',
    description: 'Отвечает клиентам в Telegram, WhatsApp и на сайте через 3 секунды после обращения. Квалифицирует бюджет, создает сделку в CRM и назначает встречу.',
    category: 'sales',
    icon: '⚡',
    status: 'active',
    tasksCompleted: 840,
    channels: ['Telegram Бот', 'WhatsApp', 'Сайт'],
    priceMonthly: 0
  },
  {
    id: 'finance-bot',
    name: 'ИИ-Аналитик «Казначей»',
    role: 'Прогноз кассовых разрывов',
    description: 'Ежедневно анализирует поступления и счета к оплате. Предупреждает о рисках кассового разрыва за 14 дней и присылает утреннюю сводку руководителю.',
    category: 'finance',
    icon: '💰',
    status: 'paused',
    tasksCompleted: 94,
    channels: ['Telegram Отчеты', 'Дашборд'],
    priceMonthly: 4990
  },
  {
    id: 'supply-bot',
    name: 'ИИ-Снабженец «СпецСнаб»',
    role: 'Поиск лучших цен поставщиков',
    description: 'Автоматически собирает прайсы поставщиков по заявке прораба, сравнивает цены и сроки доставки и формирует готовый счет на согласование.',
    category: 'supply',
    icon: '📦',
    status: 'paused',
    tasksCompleted: 67,
    channels: ['Снабжение', 'Email'],
    priceMonthly: 4990
  },
  {
    id: 'support-bot',
    name: 'ИИ-Служба Заботы 24/7',
    role: 'Техподдержка и сервисные заявки',
    description: 'Принимает заявки от жильцов или клиентов, классифицирует срочность (авария, ремонт, консультация) и назначает ответственного мастера.',
    category: 'support',
    icon: '🛡️',
    status: 'locked',
    tasksCompleted: 0,
    channels: ['Telegram', 'Портал'],
    priceMonthly: 6990
  }
];

// ─── Готовые сценарии автоматизации (Без кода) ───
interface AutomationScenario {
  id: string;
  title: string;
  trigger: string;
  action: string;
  icon: string;
  active: boolean;
  tag: string;
}

const PRESET_SCENARIOS: AutomationScenario[] = [
  {
    id: 'sc-1',
    title: 'Мгновенный ответ новому лиду в Telegram',
    trigger: 'Когда клиент написал в Telegram-бота или на сайте',
    action: 'ИИ приветствует клиента, узнает потребность и создает сделку в воронке продаж',
    icon: '💬',
    active: true,
    tag: 'Популярное'
  },
  {
    id: 'sc-2',
    title: 'Утренний VIP-отчет руководителю в 09:00',
    trigger: 'Каждый будний день в 09:00 утра',
    action: 'ИИ собирает баланс счетов, остатки на складе и выручку за вчера в одно сообщение в Telegram',
    icon: '📊',
    active: true,
    tag: 'Для директора'
  },
  {
    id: 'sc-3',
    title: 'Контроль перерасхода по смете КС-2',
    trigger: 'При добавлении акта списания материалов на объекте',
    action: 'ИИ сверяет позиции со сметой договора и отправляет уведомление прорабу при превышении нормы',
    icon: '🚨',
    active: false,
    tag: 'Строительство'
  },
  {
    id: 'sc-4',
    title: 'Автоматическая проверка договора поставки',
    trigger: 'При прикреплении файла договора (.docx / .pdf) к сделке',
    action: 'ИИ проверяет реквизиты, сроки оплаты и пени и выделяет риски красным цветом',
    icon: '📑',
    active: true,
    tag: 'Юрист'
  }
];

export const AIAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<'employees' | 'scenarios' | 'finetune' | 'knowledge'>('employees');
  const [employees, setEmployees] = useState<DigitalEmployee[]>(PRESET_EMPLOYEES);
  const [scenarios, setScenarios] = useState<AutomationScenario[]>(PRESET_SCENARIOS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleEmployeeStatus = (id: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      if (emp.status === 'locked') {
        navigate('/crm/admin');
        return emp;
      }
      const nextStatus = emp.status === 'active' ? 'paused' : 'active';
      toast?.showToast(
        nextStatus === 'active' 
          ? `🤖 ИИ-сотрудник «${emp.name}» включен и готов к работе`
          : `⏸️ Работа ИИ-сотрудника «${emp.name}» приостановлена`,
        'success'
      );
      return { ...emp, status: nextStatus };
    }));
  };

  const toggleScenario = (id: string) => {
    setScenarios(prev => prev.map(sc => {
      if (sc.id !== id) return sc;
      const nextActive = !sc.active;
      toast?.showToast(
        nextActive ? `⚡ Сценарий «${sc.title}» активирован` : `⏸️ Сценарий отключен`,
        'info'
      );
      return { ...sc, active: nextActive };
    }));
  };

  const filteredEmployees = employees.filter(e =>
    selectedCategory === 'all' || e.category === selectedCategory
  );

  return (
    <div className="space-y-8 p-1 sm:p-2 w-full max-w-7xl mx-auto shrink-0 animate-fadeIn">
      {/* ── Главная шапка: Единый Центр ИИ-Сотрудников ──────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border border-orange-500/25 dark:border-orange-500/30 p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-gradient-to-br from-amber-500/15 to-[#F95700]/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 text-[#F95700] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Единый центр ИИ-Сотрудников и Ботов СФЕРА</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Montserrat'] tracking-tight text-zinc-900 dark:text-white leading-tight">
              Ваш цифровой штат 24/7 без программирования
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              Вам не нужно разбираться в коде или терминалах. Включайте готовых ИИ-юристов, сметчиков и Telegram-ботов в 1 клик. Они работают в CRM, мессенджерах и документах, экономя до 80% рутины.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-white/90 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-700/80 text-center min-w-[130px] shadow-sm">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase">Активных ИИ</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                <span>{employees.filter(e => e.status === 'active').length}</span>
                <span className="text-xs text-zinc-400 font-normal">из {employees.length}</span>
              </div>
            </div>
            <div className="bg-white/90 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-700/80 text-center min-w-[150px] shadow-sm">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase">Выполнено задач</div>
              <div className="text-2xl font-black text-[#F95700] mt-1 flex items-center justify-center gap-1">
                <Activity className="w-5 h-5" />
                <span>1,461</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Навигационные табы центра ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-zinc-100/90 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-1.5 rounded-2xl w-full sm:w-auto shadow-sm">
          {[
            { key: 'employees', label: '🤖 Штат ИИ-Сотрудников', badge: employees.length },
            { key: 'scenarios', label: '⚡ Готовые сценарии и Боты', badge: scenarios.length },
            { key: 'finetune', label: '🧠 Обучение моделей (Fine-Tune)', badge: 'QLoRA' },
            { key: 'knowledge', label: '📚 База Знаний ИИ (RAG)', badge: 'RAG' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[#F95700] to-orange-500 text-white shadow-lg shadow-[#F95700]/25 scale-[1.02]'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
              }`}>
                {tab.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ Вкладка 1: ШТАТ ИИ-СОТРУДНИКОВ ══════════════ */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* Фильтры по ролям */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Все отделы' },
              { id: 'construction', label: '🏗️ Строительство и сметы' },
              { id: 'sales', label: '💼 Продажи и Telegram' },
              { id: 'finance', label: '💰 Финансы' },
              { id: 'legal', label: '⚖️ Юридический' },
              { id: 'supply', label: '📦 Снабжение' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-zinc-800 text-[#F95700] border border-orange-500/40 shadow-sm'
                    : 'bg-zinc-100/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Сетка сотрудников */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.map(emp => {
              const isActive = emp.status === 'active';
              const isLocked = emp.status === 'locked';

              return (
                <div
                  key={emp.id}
                  className={`relative rounded-2xl border transition-all p-6 flex flex-col justify-between gap-5 ${
                    isActive
                      ? 'bg-white dark:bg-gradient-to-br dark:from-zinc-900/90 dark:to-zinc-900/60 border-orange-500/30 shadow-lg shadow-orange-500/5'
                      : 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 opacity-90'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2.5 rounded-2xl bg-orange-50/60 dark:bg-zinc-800/80 border border-orange-500/15 dark:border-zinc-700/60">
                          {emp.icon}
                        </span>
                        <div>
                          <h3 className="text-base font-black text-zinc-900 dark:text-white">{emp.name}</h3>
                          <p className="text-xs text-[#F95700] font-bold mt-0.5">{emp.role}</p>
                        </div>
                      </div>

                      {/* Тумблер ВКЛ / ВЫКЛ */}
                      <button
                        onClick={() => toggleEmployeeStatus(emp.id)}
                        className="cursor-pointer transition-transform active:scale-95 shrink-0"
                        title={isActive ? 'Выключить сотрудника' : 'Включить сотрудника'}
                      >
                        {isLocked ? (
                          <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Pro
                          </span>
                        ) : isActive ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Включен</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-bold">
                            <span>Пауза</span>
                          </div>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {emp.description}
                    </p>
                  </div>

                  {/* Каналы связи и статистика */}
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {emp.channels.map((ch, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      {emp.tasksCompleted > 0 ? `${emp.tasksCompleted} задач за месяц` : 'Готов к работе'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ Вкладка 2: ГОТОВЫЕ СЦЕНАРИИ И БОТЫ ══════════════ */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white mb-1">
              Автоматические сценарии без программирования
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Включите ползунком нужные правила: ИИ сам принимает сообщения в Telegram/WhatsApp, проверяет документы и шлёт отчёты.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scenarios.map(sc => (
              <div
                key={sc.id}
                className={`rounded-2xl border p-6 transition-all flex flex-col justify-between gap-4 ${
                  sc.active
                    ? 'bg-white dark:bg-zinc-900/90 border-orange-500/30 shadow-md'
                    : 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{sc.icon}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-[#F95700] text-[10px] font-black">
                          {sc.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white">{sc.title}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleScenario(sc.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold cursor-pointer transition-all shrink-0 ${
                      sc.active
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {sc.active ? 'Активен' : 'Включить'}
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-zinc-500 font-bold shrink-0">Когда:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{sc.trigger}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#F95700] font-bold shrink-0">Действие ИИ:</span>
                    <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{sc.action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ Вкладка 3: ОБУЧЕНИЕ И FINE-TUNING ИИ ══════════════ */}
      {activeTab === 'finetune' && (
        <div className="space-y-6">
          <AIFineTuneSettings />
        </div>
      )}

      {/* ══════════════ Вкладка 4: БАЗА ЗНАНИЙ ИИ (RAG) ══════════════ */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <KnowledgeBase isTab={true} />
        </div>
      )}
    </div>
  );
}

