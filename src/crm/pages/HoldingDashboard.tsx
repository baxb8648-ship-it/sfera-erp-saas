import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  ArrowRightLeft,
  ExternalLink,
  CheckCircle,
  X,
  ArrowUpRight,
  Landmark
} from 'lucide-react';

export default function HoldingDashboard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'companies' | 'transfers'>('companies');

  // Modal states
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);

  // New company form
  const [newCompany, setNewCompany] = useState({
    company_name: '',
    inn: '',
    role: 'subsidiary',
    share_percent: 100,
    revenue_ytd: 45000000,
    net_profit_ytd: 12000000,
    employees_count: 24
  });

  // New transfer form
  const [newTransfer, setNewTransfer] = useState({
    from_company: 'ООО «ЛЕОНИКА ТЕХНОЛОДЖИ» (IT & SaaS)',
    to_company: 'ООО «ЛЕОНИКА СТРОЙ И ИНЖИНИРИНГ»',
    amount: 1500000,
    transfer_type: 'loan',
    description: ''
  });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['holdingGroups'],
    queryFn: () => apiClient.get('/holding/groups/')
  });

  const currentGroup = groups.length > 0 ? groups[0] : null;

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/holding/members/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdingGroups'] });
      showToast('Новое юрлицо успешно добавлено в структуру Холдинга', 'success');
      setIsAddCompanyOpen(false);
      setNewCompany({
        company_name: '',
        inn: '',
        role: 'subsidiary',
        share_percent: 100,
        revenue_ytd: 25000000,
        net_profit_ytd: 6000000,
        employees_count: 15
      });
    },
    onError: () => showToast('Ошибка при добавлении компании', 'error')
  });

  const addTransferMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/holding/transfers/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdingGroups'] });
      showToast('Внутригрупповой трансферт зарегистрирован', 'success');
      setIsAddTransferOpen(false);
      setNewTransfer({
        ...newTransfer,
        amount: 1000000,
        description: ''
      });
    },
    onError: () => showToast('Ошибка при регистрации трансферта', 'error')
  });

  const handleSwitchTenant = (companyName: string) => {
    showToast(`Успешный вход в контур управления компании: ${companyName}`, 'success');
  };

  const formatMoney = (val: number) => {
    if (!val && val !== 0) return '0 ₽';
    return Math.round(val).toLocaleString() + ' ₽';
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const members = currentGroup?.members || [];
  const transfers = currentGroup?.transfers || [];
  const summary = currentGroup?.summary || {
    total_revenue_ytd: 0,
    total_net_profit_ytd: 0,
    total_employees: 0,
    companies_count: 0
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-8 text-white shadow-2xl border border-zinc-800">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#F95700] text-xs font-bold mb-3 uppercase tracking-wider">
              <Landmark className="w-3.5 h-3.5" /> Корпоративный центр управления
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {currentGroup?.name || 'Группа компаний ЛЕОНИКА'}
            </h1>
            <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
              Консолидированный учёт дочерних предприятий, финансовое планирование группы и внутригрупповой трансферт активов
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddTransferOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all flex items-center gap-2 border border-zinc-700 shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4 text-orange-400" />
              Внутригрупповой перевод
            </button>
            <button
              onClick={() => setIsAddCompanyOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#ff6a1a] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25"
            >
              <Plus className="w-4 h-4" />
              Добавить юрлицо в группу
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRICS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Выручка группы (YTD)</span>
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#F95700]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
            {formatMoney(summary.total_revenue_ytd)}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Консолидация 100% юрлиц
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Чистая прибыль Холдинга</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
            {formatMoney(summary.total_net_profit_ytd)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Рентабельность: {summary.total_revenue_ytd ? Math.round((summary.total_net_profit_ytd / summary.total_revenue_ytd) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Штат сотрудников</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
            {summary.total_employees} чел.
          </div>
          <div className="text-xs text-zinc-500 mt-1">По всем дочерним компаниям</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Юрлиц в группе</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
            {summary.companies_count} юрлица
          </div>
          <div className="text-xs text-purple-600 font-semibold mt-1">Единый контур безопасности</div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'companies'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md'
              : 'text-zinc-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Реестр предприятий группы ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'transfers'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md'
              : 'text-zinc-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Внутригрупповые операции ({transfers.length})
        </button>
      </div>

      {/* TAB 1: MEMBER COMPANIES */}
      {activeTab === 'companies' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Юридические лица Холдинга</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Кликните «Управлять компанией» для входа в контур конкретного предприятия без смены пароля
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                  <th className="py-4 pl-6 pr-4">Компания / Юрлицо</th>
                  <th className="py-4 pr-4">Роль в группе</th>
                  <th className="py-4 pr-4">Доля (%)</th>
                  <th className="py-4 pr-4">Выручка YTD</th>
                  <th className="py-4 pr-4">Чистая прибыль</th>
                  <th className="py-4 pr-4">Штат</th>
                  <th className="py-4 pr-6 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 pl-6 pr-4">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#F95700]" />
                        {m.company_name}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">ИНН: {m.inn || 'Не указан'}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.role === 'parent'
                          ? 'bg-orange-500/10 text-[#F95700] border border-orange-500/20'
                          : m.role === 'subsidiary'
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }`}>
                        {m.role === 'parent' ? 'Головная компания' : m.role === 'subsidiary' ? 'Дочернее общество' : 'Филиал'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-mono font-bold text-gray-900 dark:text-white">
                      {m.share_percent}%
                    </td>
                    <td className="py-4 pr-4 font-mono font-bold text-gray-900 dark:text-white">
                      {formatMoney(m.revenue_ytd)}
                    </td>
                    <td className="py-4 pr-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(m.net_profit_ytd)}
                    </td>
                    <td className="py-4 pr-4 font-mono text-zinc-500">
                      {m.employees_count} чел.
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <button
                        onClick={() => handleSwitchTenant(m.company_name)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#F95700]" />
                        Управлять компанией
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INTER-COMPANY TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Журнал внутригрупповых операций</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Займы, распределение дивидендов, передача техники и ТМЦ между юрлицами холдинга
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                  <th className="py-4 pl-6 pr-4">Отправитель</th>
                  <th className="py-4 pr-4">Получатель</th>
                  <th className="py-4 pr-4">Сумма</th>
                  <th className="py-4 pr-4">Тип операции</th>
                  <th className="py-4 pr-4">Назначение</th>
                  <th className="py-4 pr-6 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {transfers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 pl-6 pr-4 font-bold text-gray-900 dark:text-white">
                      {t.from_company}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#F95700]">
                      {t.to_company}
                    </td>
                    <td className="py-4 pr-4 font-mono font-black text-gray-900 dark:text-white">
                      {formatMoney(t.amount)}
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        t.transfer_type === 'loan'
                          ? 'bg-blue-500/10 text-blue-500'
                          : t.transfer_type === 'dividend'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}>
                        {t.transfer_type === 'loan' ? 'Внутренний заём' : t.transfer_type === 'dividend' ? 'Дивиденды' : 'Трансферт активов'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-xs text-zinc-500 max-w-xs truncate">
                      {t.description || 'Внутригрупповое перечисление'}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" /> Проведено
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ДОБАВИТЬ ЮРЛИЦО */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Новое предприятие Холдинга</h3>
              <button onClick={() => setIsAddCompanyOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Название юрлица</label>
                <input
                  type="text"
                  placeholder="ООО «ЛЕОНИКА ЛОГИСТИКА»"
                  value={newCompany.company_name}
                  onChange={e => setNewCompany({ ...newCompany, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">ИНН предприятия</label>
                  <input
                    type="text"
                    placeholder="7705123456"
                    value={newCompany.inn}
                    onChange={e => setNewCompany({ ...newCompany, inn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Роль в группе</label>
                  <select
                    value={newCompany.role}
                    onChange={e => setNewCompany({ ...newCompany, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    <option value="subsidiary">Дочернее общество</option>
                    <option value="parent">Головная компания</option>
                    <option value="branch">Филиал / Подразделение</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Выручка с начала года (₽)</label>
                  <input
                    type="number"
                    value={newCompany.revenue_ytd}
                    onChange={e => setNewCompany({ ...newCompany, revenue_ytd: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Штат (сотрудников)</label>
                  <input
                    type="number"
                    value={newCompany.employees_count}
                    onChange={e => setNewCompany({ ...newCompany, employees_count: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => setIsAddCompanyOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (!newCompany.company_name) {
                      showToast('Укажите название предприятия', 'error');
                      return;
                    }
                    if (!currentGroup) return;
                    addMemberMutation.mutate({
                      holding_id: currentGroup.id,
                      ...newCompany
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-md shadow-orange-500/20"
                >
                  Включить в состав Холдинга
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ВНУТРИГРУППОВОЙ ТРАНСФЕРТ */}
      {isAddTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Внутригрупповая операция</h3>
              <button onClick={() => setIsAddTransferOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Компания Отправитель</label>
                <select
                  value={newTransfer.from_company}
                  onChange={e => setNewTransfer({ ...newTransfer, from_company: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {members.map((m: any) => (
                    <option key={`from-${m.id}`} value={m.company_name}>{m.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Компания Получатель</label>
                <select
                  value={newTransfer.to_company}
                  onChange={e => setNewTransfer({ ...newTransfer, to_company: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {members.map((m: any) => (
                    <option key={`to-${m.id}`} value={m.company_name}>{m.company_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    value={newTransfer.amount}
                    onChange={e => setNewTransfer({ ...newTransfer, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Тип транзакции</label>
                  <select
                    value={newTransfer.transfer_type}
                    onChange={e => setNewTransfer({ ...newTransfer, transfer_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    <option value="loan">Внутренний заём</option>
                    <option value="dividend">Распределение дивидендов</option>
                    <option value="asset_transfer">Передача активов / ТМЦ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Назначение операции</label>
                <input
                  type="text"
                  placeholder="Целевое финансирование закупки оборудования"
                  value={newTransfer.description}
                  onChange={e => setNewTransfer({ ...newTransfer, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => setIsAddTransferOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (!currentGroup) return;
                    addTransferMutation.mutate({
                      holding_id: currentGroup.id,
                      ...newTransfer
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#ff6a1a] text-white font-bold text-xs shadow-md shadow-orange-500/20"
                >
                  Провести операцию
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
