import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Calendar, ShieldCheck, 
  Search, RefreshCw, CheckCircle2, Lock, Unlock, 
  Sparkles, AlertTriangle, Layers, Crown
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface TenantItem {
  id: number;
  name: string;
  full_name?: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: string;
  director?: string;
  sphere: string;
  is_active: boolean;
  subscription_ends_at?: string;
  created_at: string;
  users_count: number;
}

export const SuperAdmin: React.FC = () => {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSphere, setSelectedSphere] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/tenants/all`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      } else {
        showNotify('Ошибка загрузки списка компаний (требуются права SuperAdmin)', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      showNotify('Сбой соединения с сервером API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotify = (text: string, type: 'success' | 'error') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleToggleStatus = async (tenant: TenantItem) => {
    try {
      const res = await fetch(`${baseUrl}/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !tenant.is_active })
      });
      if (res.ok) {
        const updated = await res.json();
        setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
        showNotify(`Статус компании "${tenant.name}" изменён на ${updated.is_active ? 'Активна' : 'Заблокирована'}`, 'success');
      } else {
        showNotify('Не удалось изменить статус компании', 'error');
      }
    } catch (err) {
      showNotify('Ошибка выполнения запроса', 'error');
    }
  };

  const handleExtendSubscription = async (tenantId: number, months: number) => {
    try {
      const res = await fetch(`${baseUrl}/tenants/${tenantId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months_to_add: months })
      });
      if (res.ok) {
        const updated = await res.json();
        setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
        showNotify(`Подписка продлена на ${months} мес.`, 'success');
      } else {
        showNotify('Не удалось продлить подписку', 'error');
      }
    } catch (err) {
      showNotify('Ошибка выполнения запроса', 'error');
    }
  };

  const handleInitSuperadmin = async () => {
    try {
      const res = await fetch(`${baseUrl}/tenants/create-superadmin-init`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showNotify(data.msg || 'Супер-админ инициализирован', 'success');
        fetchTenants();
      }
    } catch (err) {
      showNotify('Ошибка инициализации', 'error');
    }
  };

  const getSphereBadge = (sphere: string) => {
    switch (sphere) {
      case 'construction':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Building2 size={12} /> Строительство и АКЗ</span>;
      case 'service':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Layers size={12} /> Услуги и Сервис</span>;
      case 'agri':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Sparkles size={12} /> Агропромышленность</span>;
      case 'booking':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Calendar size={12} /> Бронирование и Аренда</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{sphere}</span>;
    }
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.inn.includes(searchQuery) ||
                          (t.full_name && t.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSphere = selectedSphere === 'all' || t.sphere === selectedSphere;
    return matchesSearch && matchesSphere;
  });

  // Stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.is_active).length;
  const totalUsers = tenants.reduce((acc, t) => acc + t.users_count, 0);
  const expiringCount = tenants.filter(t => {
    if (!t.subscription_ends_at) return false;
    const diffDays = (new Date(t.subscription_ends_at).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 14;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <Helmet>
        <title>Супер-Админ Панель | СФЕРА ERP SaaS</title>
      </Helmet>

      {/* Action Notification */}
      {actionMessage && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl border flex items-center gap-3 shadow-2xl transition-all duration-300 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-2 uppercase tracking-wider">
            <Crown size={14} className="animate-pulse" /> SFERA Platform Super-Admin
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Управление Экосистемой SaaS
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Контроль тенантов, управление подписками, блокировка и аудит безопасности платформы
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleInitSuperadmin}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
            title="Создать базовый аккаунт superadmin, если он отсутствует"
          >
            <ShieldCheck size={16} className="text-amber-400" />
            Инициализация SuperAdmin
          </button>
          <button
            onClick={fetchTenants}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Обновить данные
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Всего компаний</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalTenants}</div>
          <div className="text-xs text-slate-400">Зарегистрировано в SaaS</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Активные тенанты</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{activeTenants}</div>
          <div className="text-xs text-emerald-400 font-medium">
            {totalTenants > 0 ? `${Math.round((activeTenants / totalTenants) * 100)}% от общего числа` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Пользователи</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{totalUsers}</div>
          <div className="text-xs text-slate-400">В среднем {(totalUsers / (totalTenants || 1)).toFixed(1)} на компанию</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Истекает подписка</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{expiringCount}</div>
          <div className="text-xs text-amber-400/90 font-medium">Требуют продления в ближайшие 14 дней</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск по названию, ИНН компании..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'Все сферы' },
            { id: 'construction', label: 'Строительство' },
            { id: 'service', label: 'Услуги' },
            { id: 'agri', label: 'Агро' },
            { id: 'booking', label: 'Аренда' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedSphere(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSphere === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/50 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">Компания / ИНН</th>
                <th className="py-4 px-4">Сфера</th>
                <th className="py-4 px-4 text-center">Пользователи</th>
                <th className="py-4 px-4">Статус</th>
                <th className="py-4 px-4">Подписка до</th>
                <th className="py-4 px-6 text-right">Управление подпиской</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={28} className="animate-spin text-amber-500" />
                      <span>Загрузка данных тенантов...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Компании по заданным критериям не найдены.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                        {t.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        ИНН: {t.inn} {t.kpp ? `• КПП: ${t.kpp}` : ''}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {getSphereBadge(t.sphere)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-800 font-bold text-slate-200 text-xs">
                        {t.users_count} чел.
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          t.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                        title="Нажмите, чтобы изменить статус (заблокировать/разблокировать)"
                      >
                        {t.is_active ? <Unlock size={14} /> : <Lock size={14} />}
                        {t.is_active ? 'Активна' : 'Заблокирована'}
                      </button>
                    </td>

                    <td className="py-4 px-4">
                      {t.subscription_ends_at ? (
                        <div className="text-xs font-medium">
                          <div className="text-slate-200">
                            {new Date(t.subscription_ends_at).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Осталось: {Math.max(0, Math.round((new Date(t.subscription_ends_at).getTime() - Date.now()) / (1000 * 3600 * 24)))} дн.
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Бессрочно / Trial</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-slate-500 mr-1">Продлить:</span>
                        {[
                          { m: 1, label: '+1м' },
                          { m: 3, label: '+3м' },
                          { m: 6, label: '+6м' },
                          { m: 12, label: '+1 год' },
                        ].map(btn => (
                          <button
                            key={btn.m}
                            onClick={() => handleExtendSubscription(t.id, btn.m)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-semibold border border-slate-700/80 transition-all"
                            title={`Продлить подписку на ${btn.m} месяцев`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
