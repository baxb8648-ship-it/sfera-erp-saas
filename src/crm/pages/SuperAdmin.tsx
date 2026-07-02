import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Calendar, ShieldCheck, 
  Search, RefreshCw, CheckCircle2, Lock, Unlock, 
  Sparkles, AlertTriangle, Layers, Crown, ArrowLeft,
  TrendingUp, Download, Filter, ChevronRight,
  Database, Clock, X, Server, Activity, DollarSign
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSphere, setSelectedSphere] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'expiring'>('all');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedTenantId, setExpandedTenantId] = useState<number | null>(null);

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
        showNotify(`Подписка успешно продлена на ${months} мес.`, 'success');
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

  const exportToCSV = () => {
    if (tenants.length === 0) {
      showNotify('Нет данных для экспорта', 'error');
      return;
    }
    const headers = ['ID', 'Название', 'ИНН', 'КПП', 'Сфера', 'Статус', 'Пользователей', 'Подписка до'];
    const rows = tenants.map(t => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      t.inn,
      t.kpp || '',
      t.sphere,
      t.is_active ? 'Активна' : 'Заблокирована',
      t.users_count,
      t.subscription_ends_at ? new Date(t.subscription_ends_at).toLocaleDateString('ru-RU') : 'Бессрочно'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sfera_saas_tenants_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotify('Экспорт в CSV выполнен', 'success');
  };

  const getSphereBadge = (sphere: string) => {
    switch (sphere) {
      case 'construction':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
            <Building2 size={12} className="text-blue-400 shrink-0" />
            <span>Строительство</span>
          </span>
        );
      case 'service':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm">
            <Layers size={12} className="text-purple-400 shrink-0" />
            <span>Услуги</span>
          </span>
        );
      case 'agri':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <Sparkles size={12} className="text-emerald-400 shrink-0" />
            <span>Агро</span>
          </span>
        );
      case 'booking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
            <Calendar size={12} className="text-amber-400 shrink-0" />
            <span>Аренда</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            {sphere}
          </span>
        );
    }
  };

  // Filtered tenants computation
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.inn.includes(searchQuery) ||
        (t.full_name && t.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.director && t.director.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSphere = selectedSphere === 'all' || t.sphere === selectedSphere;
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = t.is_active;
      if (statusFilter === 'blocked') matchesStatus = !t.is_active;
      if (statusFilter === 'expiring') {
        if (!t.subscription_ends_at) matchesStatus = false;
        else {
          const diffDays = (new Date(t.subscription_ends_at).getTime() - Date.now()) / (1000 * 3600 * 24);
          matchesStatus = diffDays > 0 && diffDays <= 14;
        }
      }

      return matchesSearch && matchesSphere && matchesStatus;
    });
  }, [tenants, searchQuery, selectedSphere, statusFilter]);

  // Executive Stats
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.is_active).length;
  const blockedTenants = totalTenants - activeTenants;
  const totalUsers = tenants.reduce((acc, t) => acc + t.users_count, 0);
  
  const expiringCount = useMemo(() => {
    return tenants.filter(t => {
      if (!t.subscription_ends_at) return false;
      const diffDays = (new Date(t.subscription_ends_at).getTime() - Date.now()) / (1000 * 3600 * 24);
      return diffDays > 0 && diffDays <= 14;
    }).length;
  }, [tenants]);

  // Simulated MRR calculation based on active tenants (e.g., ~15,000 ₽ avg subscription per tenant)
  const estimatedMRR = activeTenants * 15000;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E2E1EB] font-sans pb-24 select-none">
      <Helmet>
        <title>SaaS Command Center | СФЕРА ERP Platform</title>
      </Helmet>

      {/* Top Banner Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#F95700] via-amber-500 to-emerald-500" />

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-900/30' 
            : 'bg-rose-950/90 border-rose-500/40 text-rose-300 shadow-rose-900/30'
        }`}>
          <div className={`p-2 rounded-xl ${actionMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <span className="text-sm font-semibold tracking-wide">{actionMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation & Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800/80 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/crm')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Вернуться в CRM</span>
              </button>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#F95700]/15 to-amber-500/15 border border-[#F95700]/30 text-[#F95700] text-xs font-mono font-bold uppercase tracking-wider">
                <Crown size={14} className="animate-pulse shrink-0" />
                <span>Platform Owner Console</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-['Montserrat'] text-white tracking-tight flex items-center gap-3">
              Управление Экосистемой <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F95700] to-amber-400">SaaS</span>
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl font-normal leading-relaxed">
              Архитектурный мониторинг кластера, контроль мульти-тенантов, управление биллингом и аудит безопасности базы данных Neon PostgreSQL.
            </p>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              title="Выгрузить реестр компаний в CSV"
            >
              <Download size={15} className="text-zinc-400" />
              <span>Экспорт CSV</span>
            </button>
            <button
              onClick={handleInitSuperadmin}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              title="Инициализировать аккаунт superadmin, если он не создан"
            >
              <ShieldCheck size={15} className="text-amber-400" />
              <span>Инициализация</span>
            </button>
            <button
              onClick={fetchTenants}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-600 hover:from-orange-600 hover:to-[#F95700] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#F95700]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
              <span>Обновить данные</span>
            </button>
          </div>
        </div>

        {/* Executive Bento Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          
          {/* Card 1: MRR & Revenue Est */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/5 rounded-full blur-3xl group-hover:bg-[#F95700]/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Estimated SaaS MRR</span>
              <div className="p-2.5 rounded-xl bg-[#F95700]/10 text-[#F95700] border border-[#F95700]/20">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-white mb-1.5 tracking-tight">
              {new Intl.NumberFormat('ru-RU').format(estimatedMRR)} <span className="text-sm font-normal text-zinc-400">₽/мес</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Средний чек ~15 000 ₽ / тенант</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F95700] to-amber-400 w-[75%]" />
            </div>
          </div>

          {/* Card 2: Active vs Blocked */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Статус компаний</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="text-3xl font-black font-mono text-white tracking-tight">{activeTenants}</span>
              <span className="text-sm font-mono text-emerald-400 font-semibold">активных</span>
              {blockedTenants > 0 && (
                <span className="text-sm font-mono text-rose-400 font-semibold">/ {blockedTenants} блок</span>
              )}
            </div>
            <div className="text-xs text-zinc-400">
              Всего в кластере: <strong className="text-zinc-200 font-mono">{totalTenants}</strong> тенантов
            </div>
            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0}%` }} 
              />
              <div 
                className="h-full bg-rose-500 transition-all duration-500" 
                style={{ width: `${totalTenants > 0 ? (blockedTenants / totalTenants) * 100 : 0}%` }} 
              />
            </div>
          </div>

          {/* Card 3: Total Users */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Пользователи SaaS</span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-white mb-1.5 tracking-tight">
              {totalUsers} <span className="text-sm font-normal text-zinc-400">аккаунтов</span>
            </div>
            <div className="text-xs text-zinc-400">
              Среднее: <strong className="text-purple-300 font-mono">{(totalUsers / (totalTenants || 1)).toFixed(1)}</strong> на одну компанию
            </div>
            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[60%]" />
            </div>
          </div>

          {/* Card 4: Expiring Subscriptions */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Истекают (14 дней)</span>
              <div className={`p-2.5 rounded-xl border ${expiringCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                <Clock size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-white mb-1.5 tracking-tight flex items-center gap-2">
              <span>{expiringCount}</span>
              {expiringCount > 0 && <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">Требуют внимания</span>}
            </div>
            <div className="text-xs text-zinc-400">
              {expiringCount > 0 ? 'Рекомендуется связаться с клиентами' : 'Все подписки стабильны'}
            </div>
            <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${totalTenants > 0 ? (expiringCount / totalTenants) * 100 : 0}%` }} />
            </div>
          </div>

        </div>

        {/* Bento Command & Filter Bar */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 mb-8 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск по ИНН, названию компании, директору..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-[#F95700]/60 rounded-xl pl-11 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner font-mono"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-md"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Status Quick Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs font-mono text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
                <Filter size={13} /> Статус:
              </span>
              {[
                { id: 'all', label: 'Все' },
                { id: 'active', label: 'Активные' },
                { id: 'blocked', label: 'Заблокированные' },
                { id: 'expiring', label: 'Истекающие скоро' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md'
                      : 'bg-zinc-950/80 text-zinc-400 hover:text-white border border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spheres Tabs */}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-mono text-zinc-500 mr-2 shrink-0">Отрасль:</span>
            {[
              { id: 'all', label: 'Все отрасли' },
              { id: 'construction', label: '🏗 Строительство и АКЗ' },
              { id: 'service', label: '⚙️ Услуги и Сервис' },
              { id: 'agri', label: '🌾 Агропромышленность' },
              { id: 'booking', label: '🚜 Бронирование и Аренда' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSphere(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedSphere === tab.id
                    ? 'bg-[#F95700] text-white font-bold shadow-md shadow-[#F95700]/20'
                    : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tenants Table Matrix */}
        <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Компания / ИНН / КПП</th>
                  <th className="py-4 px-4">Отрасль</th>
                  <th className="py-4 px-4 text-center">Лицензии (Юзеры)</th>
                  <th className="py-4 px-4">Статус SaaS</th>
                  <th className="py-4 px-4">Срок действия подписки</th>
                  <th className="py-4 px-6 text-right">Быстрое продление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-2 border-[#F95700] border-t-transparent rounded-full animate-spin" />
                        <span className="text-zinc-400 font-mono text-xs">Анализ кластера PostgreSQL и загрузка тенантов...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono">
                        <Server size={32} className="text-zinc-600 mb-2" />
                        <span className="text-base font-bold text-zinc-400">Компании не найдены</span>
                        <span className="text-xs">Попробуйте изменить поисковый запрос или сбросить фильтры</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map(t => {
                    const isExpanded = expandedTenantId === t.id;
                    return (
                      <React.Fragment key={t.id}>
                        <tr className="hover:bg-zinc-800/40 transition-colors group">
                          
                          {/* Col 1: Company Identity */}
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => setExpandedTenantId(isExpanded ? null : t.id)}
                                className="mt-1 p-1 rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                title="Показать реквизиты и аудит"
                              >
                                <ChevronRight size={14} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <div>
                                <div className="font-bold font-['Montserrat'] text-white text-base group-hover:text-[#F95700] transition-colors flex items-center gap-2">
                                  <span>{t.name}</span>
                                </div>
                                <div className="text-xs text-zinc-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                                  <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                                    ИНН: <strong>{t.inn}</strong>
                                  </span>
                                  {t.kpp && (
                                    <span className="text-zinc-500">
                                      КПП: {t.kpp}
                                    </span>
                                  )}
                                </div>
                                {t.director && (
                                  <div className="text-[11px] text-zinc-500 mt-1 truncate max-w-xs">
                                    Директор: {t.director}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Sphere */}
                          <td className="py-4 px-4">
                            {getSphereBadge(t.sphere)}
                          </td>

                          {/* Col 3: Users count */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-zinc-950 font-mono font-bold text-zinc-200 text-xs border border-zinc-800">
                              <Users size={12} className="mr-1.5 text-purple-400" />
                              {t.users_count}
                            </span>
                          </td>

                          {/* Col 4: Status Toggle */}
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleStatus(t)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                                t.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 animate-pulse'
                              }`}
                              title="Нажмите, чтобы заблокировать или разблокировать компанию"
                            >
                              {t.is_active ? <Unlock size={14} className="shrink-0" /> : <Lock size={14} className="shrink-0" />}
                              <span>{t.is_active ? 'Активна (200 OK)' : 'БЛОКИРОВАНА'}</span>
                            </button>
                          </td>

                          {/* Col 5: Subscription end date */}
                          <td className="py-4 px-4">
                            {t.subscription_ends_at ? (
                              <div className="text-xs font-mono">
                                <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
                                  <Calendar size={13} className="text-zinc-500" />
                                  <span>{new Date(t.subscription_ends_at).toLocaleDateString('ru-RU')}</span>
                                </div>
                                {(() => {
                                  const diffDays = Math.round((new Date(t.subscription_ends_at!).getTime() - Date.now()) / (1000 * 3600 * 24));
                                  if (diffDays < 0) {
                                    return <div className="text-rose-400 font-bold text-[11px] mt-0.5">Истекла ({Math.abs(diffDays)} дн. назад)</div>;
                                  } else if (diffDays <= 14) {
                                    return <div className="text-amber-400 font-bold text-[11px] mt-0.5">Осталось: {diffDays} дн. (Внимание!)</div>;
                                  } else {
                                    return <div className="text-zinc-500 text-[11px] mt-0.5">Осталось: {diffDays} дн.</div>;
                                  }
                                })()}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-mono">
                                <Sparkles size={11} className="text-amber-400" />
                                <span>Бессрочно / Trial</span>
                              </span>
                            )}
                          </td>

                          {/* Col 6: Quick Subscription Extend */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[11px] font-mono text-zinc-500 mr-1 hidden xl:inline">Продлить:</span>
                              {[
                                { m: 1, label: '+1м', title: 'Продлить на 1 месяц' },
                                { m: 3, label: '+3м', title: 'Продлить на квартал (3 месяца)' },
                                { m: 6, label: '+6м', title: 'Продлить на полугодие' },
                                { m: 12, label: '+1г', title: 'Продлить на 1 год' },
                              ].map(btn => (
                                <button
                                  key={btn.m}
                                  onClick={() => handleExtendSubscription(t.id, btn.m)}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-[#F95700] hover:text-white text-zinc-300 text-xs font-mono font-semibold border border-zinc-800 hover:border-[#F95700] transition-all cursor-pointer active:scale-95 shadow-sm"
                                  title={btn.title}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </td>

                        </tr>

                        {/* Expanded Tenant Details Row */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/90 border-b border-zinc-800 font-mono text-xs">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/80">
                                <div className="space-y-2">
                                  <div className="text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Building2 size={13} className="text-[#F95700]" /> Юридические реквизиты
                                  </div>
                                  <div className="text-zinc-300">Полное наименование: <strong className="text-white font-sans">{t.full_name || t.name}</strong></div>
                                  <div className="text-zinc-300">ОГРН: <strong className="text-white">{t.ogrn || 'Не указан'}</strong></div>
                                  <div className="text-zinc-300">Адрес: <span className="text-zinc-400 font-sans">{t.address || 'Не указан'}</span></div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Activity size={13} className="text-emerald-400" /> Системный статус
                                  </div>
                                  <div className="text-zinc-300">ID в базе данных: <strong className="text-white">#{t.id}</strong></div>
                                  <div className="text-zinc-300">Дата регистрации: <strong className="text-white">{new Date(t.created_at).toLocaleString('ru-RU')}</strong></div>
                                  <div className="text-zinc-300">База данных: <strong className="text-emerald-400">Neon PostgreSQL (RLS Active)</strong></div>
                                </div>

                                <div className="space-y-3 flex flex-col justify-between">
                                  <div>
                                    <div className="text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                      <ShieldCheck size={13} className="text-amber-400" /> Быстрые действия админа
                                    </div>
                                    <p className="text-zinc-400 text-[11px] mt-1">Ручное управление жизненным циклом тенанта в обход стандартного биллинга.</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleExtendSubscription(t.id, 24)}
                                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      +2 года (VIP)
                                    </button>
                                    <button
                                      onClick={() => handleToggleStatus(t)}
                                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      {t.is_active ? 'Принудительная блокировка' : 'Снять блокировку'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-500 px-2 gap-4">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-emerald-500 animate-pulse" />
            <span>SFERA SaaS Cluster • Neon Serverless PostgreSQL 18.4 • Tenant Isolation via RLS</span>
          </div>
          <div>
            Обновлено: {new Date().toLocaleTimeString('ru-RU')}
          </div>
        </div>

      </div>
    </div>
  );
};
