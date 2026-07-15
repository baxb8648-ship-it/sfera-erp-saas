import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Activity, Sparkles, Terminal, CheckCircle2, Clock, Cpu, TrendingUp, Search,
  Settings, RefreshCw, X
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { AIFineTuneSettings } from '../components/AIFineTuneSettings';
import KnowledgeBase from './KnowledgeBase';
import { apiClient } from '../../api/client';

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
    id: 'sales-closer-bot',
    name: 'ИИ-Ассистент по продажам «Sales Closer-AI»',
    role: 'Социальная инженерия и нативный контент',
    description: 'Ведет глубокие персонализированные переговоры, подстраивая пол и психологический портрет под клиента (девушка для мужчин, парень для женщин-руководителей). Ведет контент в соцсетях и нативно рекламирует продукцию.',
    category: 'sales',
    icon: '🎭',
    status: 'paused',
    tasksCompleted: 0,
    channels: ['Telegram', 'WhatsApp', 'Email', 'VC.ru'],
    priceMonthly: 5990
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

interface AgentLogEntry {
  id: string;
  timestamp: string;
  agentName: string;
  agentRole: string;
  action: string;
  status: 'success' | 'processing' | 'warning';
  latency: string;
  details: string;
}

const PRESET_LIVE_LOGS: AgentLogEntry[] = [
  { id: 'log-101', timestamp: '10:04:12', agentName: 'ИИ-Юрист «Арбитр»', agentRole: 'legal', action: 'Проверка договора подряда №489/СМР от ООО "ТехноСтрой"', status: 'success', latency: '3.4s', details: 'Выявлен пункт 7.4 с завышенной пеней 0.5% в день. Сформирован протокол разногласий.' },
  { id: 'log-102', timestamp: '10:01:45', agentName: 'ИИ-Сметчик «Прораб-AI»', agentRole: 'construction', action: 'Сверка КС-2 по объекту «ЖК Северный» (Этап 3)', status: 'warning', latency: '4.1s', details: 'Обнаружен перерасход арматуры А500С на +14.2% относительно проектной сметы.' },
  { id: 'log-103', timestamp: '09:58:10', agentName: 'ИИ-Менеджер продаж 24/7', agentRole: 'sales', action: 'Квалификация входящего лида (Telegram @alex_dev)', status: 'success', latency: '1.2s', details: 'Лид квалифицирован (Бюджет: 8.5 млн ₽). Создана сделка #1049, назначена встреча на 14:00.' },
  { id: 'log-104', timestamp: '09:00:02', agentName: 'ИИ-Аналитик «Казначей»', agentRole: 'finance', action: 'Генерация утреннего VIP-отчета директору в Telegram', status: 'success', latency: '2.8s', details: 'Сводка отправлена: Остаток на счетах 42,400,000 ₽, ожидаемые поступления 6,100,000 ₽.' },
  { id: 'log-105', timestamp: '08:45:30', agentName: 'ИИ-Снабженец «СпецСнаб»', agentRole: 'supply', action: 'Сравнение 4 прайс-листов на кабель ВВГнг 3х2.5', status: 'success', latency: '3.9s', details: 'Выбрано предложение ООО "ПромТехСнаб" с экономией 18% и доставкой за 24 часа.' }
];

export const AIAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<'employees' | 'scenarios' | 'livelog' | 'finetune' | 'knowledge'>('employees');
  const [employees, setEmployees] = useState<DigitalEmployee[]>(PRESET_EMPLOYEES);
  const [scenarios, setScenarios] = useState<AutomationScenario[]>(PRESET_SCENARIOS);
  const [liveLogs] = useState<AgentLogEntry[]>(PRESET_LIVE_LOGS);
  const [logSearch, setLogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<DigitalEmployee | null>(null);
  const [connectedBots, setConnectedBots] = useState<any[]>([]);
  const [botTokenInput, setBotTokenInput] = useState('');
  const [botNameInput, setBotNameInput] = useState('');
  const [isConnectingBot, setIsConnectingBot] = useState(false);

  // States for closer bot customization
  const [closerSocialEngineering, setCloserSocialEngineering] = useState(true);
  const [closerArchetype, setCloserArchetype] = useState('negotiator');
  const [closerRigidness, setCloserRigidness] = useState(50);
  const [closerEmojis, setCloserEmojis] = useState(30);
  const [closerPostingChannels, setCloserPostingChannels] = useState<string[]>(['Telegram']);
  const [closerPostingFreq, setCloserPostingFreq] = useState('3_times_week');

  const fetchConnectedBots = async () => {
    try {
      const res = await apiClient.get<any[]>('/telegram-bots');
      if (res) {
        setConnectedBots(res);
      }
    } catch (err) {
      console.error('Failed to fetch telegram bots:', err);
    }
  };

  useEffect(() => {
    fetchConnectedBots();
  }, []);

  const mapEmpIdToRole = (id: string): string => {
    switch (id) {
      case 'sales-bot': return 'external_sales';
      case 'sales-closer-bot': return 'external_sales';
      case 'support-bot': return 'external_support';
      case 'estimate-bot': return 'internal_pto';
      case 'supply-bot': return 'internal_supply';
      case 'finance-bot': return 'internal_finance';
      case 'legal-bot': return 'internal_legal';
      default: return 'internal_copilot';
    }
  };

  const handleConnectBot = async () => {
    if (!selectedEmployee) return;
    if (!botTokenInput.trim()) {
      toast?.showToast('Введите токен Telegram-бота', 'error');
      return;
    }
    if (!botNameInput.trim()) {
      toast?.showToast('Введите название или юзернейм бота', 'error');
      return;
    }

    setIsConnectingBot(true);
    try {
      const role = mapEmpIdToRole(selectedEmployee.id);
      await apiClient.post('/telegram-bots', {
        bot_token: botTokenInput.trim(),
        bot_name: botNameInput.trim(),
        role: role
      });
      toast?.showToast(`Бот для «${selectedEmployee.name}» успешно подключен!`, 'success');
      setBotTokenInput('');
      setBotNameInput('');
      fetchConnectedBots();
      setIsBotModalOpen(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Не удалось подключить бота';
      toast?.showToast(`Ошибка: ${detail}`, 'error');
    } finally {
      setIsConnectingBot(false);
    }
  };

  const handleDisconnectBot = async (botId: number) => {
    if (!window.confirm('Вы уверены, что хотите отключить и удалить этого Telegram-бота?')) return;
    try {
      await apiClient.delete(`/telegram-bots/${botId}`);
      toast?.showToast('Бот успешно отключен', 'success');
      fetchConnectedBots();
      setIsBotModalOpen(false);
    } catch (err: any) {
      toast?.showToast('Ошибка отключения бота', 'error');
    }
  };

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
            { key: 'livelog', label: '🔴 Live-лог и Счётчики', badge: liveLogs.length },
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
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
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
                    {!isLocked && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsBotModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-[#F95700] transition cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Настроить Telegram-бота</span>
                        </button>
                      </div>
                    )}
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

      {/* ══════════════ Вкладка 3: LIVE-ЛОГ И СЧЁТЧИКИ ВЫПОЛНЕНИЯ ══════════════ */}
      {activeTab === 'livelog' && (
        <div className="space-y-6">
          {/* Счётчики выполнения агентов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-zinc-400 uppercase">ИИ-Юрист «Арбитр»</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-zinc-900 dark:text-white">142 договора</div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Экономия: ~42.6 ч работы</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-zinc-400 uppercase">ИИ-Сметчик «Прораб-AI»</span>
                <Cpu className="w-5 h-5 text-[#F95700]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-zinc-900 dark:text-white">318 смет КС-2</div>
                <p className="text-xs text-[#F95700] font-semibold mt-0.5">Предотвращено: 1,420,000 ₽</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-zinc-400 uppercase">ИИ-Менеджер продаж</span>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-zinc-900 dark:text-white">840 диалогов</div>
                <p className="text-xs text-blue-500 font-semibold mt-0.5">Ср. время ответа: 1.8 сек</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-zinc-400 uppercase">ИИ-Аналитик «Казначей»</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-zinc-900 dark:text-white">94 отчета</div>
                <p className="text-xs text-amber-500 font-semibold mt-0.5">Точность прогноза: 98.4%</p>
              </div>
            </div>
          </div>

          {/* Терминал Live-лога */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-[#F95700]" />
                <h3 className="font-bold text-sm text-white">
                  Live-лог выполнения операций ИИ-агентами в реальном времени
                </h3>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Поиск по логам..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-700 outline-none focus:border-[#F95700]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-2.5 font-mono text-xs max-h-[480px] overflow-y-auto">
              {liveLogs
                .filter(l => l.agentName.toLowerCase().includes(logSearch.toLowerCase()) || l.action.toLowerCase().includes(logSearch.toLowerCase()) || l.details.toLowerCase().includes(logSearch.toLowerCase()))
                .map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">[{log.timestamp}]</span>
                        <span className="font-bold text-[#F95700]">{log.agentName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : log.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-[11px]">{log.latency}</span>
                    </div>
                    <div className="text-zinc-200 font-semibold">{log.action}</div>
                    <div className="text-zinc-400 text-[11px]">{log.details}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ Вкладка 4: ОБУЧЕНИЕ И FINE-TUNING ИИ ══════════════ */}
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

      {/* ── Модальное окно настройки Telegram-бота ───────────────────────── */}
      {isBotModalOpen && selectedEmployee && (() => {
        const role = mapEmpIdToRole(selectedEmployee.id);
        const existingBot = connectedBots.find(b => b.role === role);
        const isCloser = selectedEmployee.id === 'sales-closer-bot';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className={`relative w-full ${isCloser ? 'max-w-4xl' : 'max-w-lg'} rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl transition-all max-h-[90vh] overflow-y-auto`}>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5.5 h-5.5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl p-2.5 rounded-2xl bg-orange-50/60 dark:bg-zinc-800/80 border border-orange-500/15">
                  {selectedEmployee.icon}
                </span>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    Настройка ИИ-Сотрудника
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                    и Telegram-бота для: {selectedEmployee.name}
                  </p>
                </div>
              </div>

              <div className={`grid grid-cols-1 ${isCloser ? 'md:grid-cols-2' : ''} gap-6`}>
                <div className="space-y-5">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
                    🤖 Связь с Telegram API
                  </h4>

              {existingBot ? (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div>
                      Бот успешно подключен и активен. Сообщения обрабатываются ИИ-Сотрудником в режиме реального времени.
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-bold">Имя бота:</span>
                      <span className="text-zinc-900 dark:text-white font-extrabold">{existingBot.bot_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-bold">Токен:</span>
                      <span className="font-mono text-zinc-400 dark:text-zinc-500">{existingBot.bot_token}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-bold">Роль в системе:</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">{existingBot.role}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsBotModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Закрыть
                    </button>
                    <button
                      onClick={() => handleDisconnectBot(existingBot.id)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition cursor-pointer"
                    >
                      Отключить бота
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed p-4 rounded-2xl bg-orange-50/40 dark:bg-zinc-900 border border-orange-500/10">
                    <span className="font-extrabold text-[#F95700]">Инструкция:</span>
                    <ol className="list-decimal list-inside space-y-1.5 mt-2">
                      <li>Перейдите в Telegram к боту <b>@BotFather</b>.</li>
                      <li>Отправьте команду <code>/newbot</code> и задайте имя бота.</li>
                      <li>Скопируйте полученный <b>HTTP API Token</b> и введите ниже.</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-zinc-700 dark:text-zinc-300">Название / Юзернейм бота</label>
                      <input
                        type="text"
                        placeholder="Например, @MyCompanySalesBot"
                        value={botNameInput}
                        onChange={(e) => setBotNameInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-zinc-700 dark:text-zinc-300">API Token Telegram-бота</label>
                      <input
                        type="text"
                        placeholder="Вставьте токен от @BotFather"
                        value={botTokenInput}
                        onChange={(e) => setBotTokenInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsBotModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      disabled={isConnectingBot}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleConnectBot}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#F95700] to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/45 hover:scale-[1.01] transition duration-200 cursor-pointer flex items-center gap-2"
                      disabled={isConnectingBot}
                    >
                      {isConnectingBot ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Подключение...</span>
                        </>
                      ) : (
                        <span>Подключить бота</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
              </div>

              {/* Правая колонка: Кастомизация личности (только для Closer-AI) */}
              {isCloser && (
                <div className="border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800/80 pt-6 md:pt-0 md:pl-6 space-y-5">
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                      🧬 Личность & Социальная Инженерия
                    </h4>
                    <div className="space-y-4">
                      {/* Адаптивный пол */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                        <div className="pr-4">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">Адаптивный пол бота</span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">Девушка для мужчин / Парень для женщин-руководителей</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={closerSocialEngineering}
                          onChange={(e) => setCloserSocialEngineering(e.target.checked)}
                          className="rounded text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                        />
                      </div>

                      {/* Архетип общения */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">Психологический архетип</label>
                        <select
                          value={closerArchetype}
                          onChange={(e) => setCloserArchetype(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                        >
                          <option value="negotiator">🎭 Харизматичный переговорщик (Дожим и закрытие)</option>
                          <option value="expert">🤵 Строгий деловой эксперт (B2B сегмент)</option>
                          <option value="friend">🤝 Дружелюбный консультант (Выстраивание отношений)</option>
                        </select>
                      </div>

                      {/* ToV Ползунки */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                            <span>Деловая строгость</span>
                            <span>{closerRigidness}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={closerRigidness}
                            onChange={(e) => setCloserRigidness(Number(e.target.value))}
                            className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                            <span>Смайлы и эмоции</span>
                            <span>{closerEmojis}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={closerEmojis}
                            onChange={(e) => setCloserEmojis(Number(e.target.value))}
                            className="w-full accent-orange-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
                      ✍️ Автопостинг & Реклама в соцсетях
                    </h4>
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">Каналы ведения контента</label>
                        <div className="flex gap-2 flex-wrap">
                          {['Telegram-канал', 'VKонтакте', 'VC.ru'].map(ch => {
                            const selected = closerPostingChannels.includes(ch);
                            return (
                              <button
                                type="button"
                                key={ch}
                                onClick={() => {
                                  if (selected) {
                                    setCloserPostingChannels(prev => prev.filter(c => c !== ch));
                                  } else {
                                    setCloserPostingChannels(prev => [...prev, ch]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer select-none ${
                                  selected
                                    ? 'bg-orange-500/10 border-orange-500/30 text-[#F95700]'
                                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400'
                                }`}
                              >
                                {ch}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">Периодичность публикаций</label>
                        <select
                          value={closerPostingFreq}
                          onChange={(e) => setCloserPostingFreq(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                        >
                          <option value="daily">🔥 Каждый день (Активные продажи и нативная реклама)</option>
                          <option value="3_times_week">📅 3 раза в неделю (Полезные кейсы и статьи)</option>
                          <option value="1_time_week">📰 1 раз в неделю (Итоговые дайджесты)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 text-zinc-800 dark:text-zinc-200 space-y-1.5">
                    <div className="text-xs font-black text-[#F95700] uppercase tracking-wider flex items-center gap-1.5">
                      👑 VIP-Внедрение «Под ключ»
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                      Наши ИИ-инженеры создадут уникальный характер агента, проработают Tone of Voice, напишут системный промпт (до 50 страниц правил) и обучат RAG на вашей базе кейсов.
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-black text-zinc-900 dark:text-white">49 900 ₽ разово</span>
                      <button
                        type="button"
                        onClick={() => toast?.showToast('Заявка на VIP-внедрение отправлена. Менеджер свяжется с вами.', 'success')}
                        className="px-3 py-1.5 bg-[#F95700] hover:bg-orange-600 text-white text-[10px] font-black rounded-lg transition cursor-pointer select-none"
                      >
                        Заказать ➔
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

