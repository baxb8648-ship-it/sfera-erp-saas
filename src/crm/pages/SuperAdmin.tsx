import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Users, Calendar, ShieldCheck, 
  Search, RefreshCw, CheckCircle2, Lock, Unlock, 
  Sparkles, AlertTriangle, Layers, Crown, ArrowLeft,
  TrendingUp, Download, Filter, ChevronRight,
  Database, Clock, X, Server, Activity, DollarSign,
  Handshake, UserPlus, Copy, Award, Wallet, CreditCard,
  FileText, ExternalLink, Briefcase, FileCheck, FileSpreadsheet,
  Send, Check
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { SaaSTenantModal } from '../components/SaaSTenantModal';
import { SaaSPartnerModal } from '../components/SaaSPartnerModal';

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

interface PartnerItem {
  id: number;
  name: string;
  type: string;
  promoCode: string;
  commissionRate: number;
  clientsCount: number;
  paidClientsCount: number;
  totalEarned: number;
  currentBalance: number;
  contactInfo: string;
  status: 'active' | 'onboarding' | 'suspended';
}

interface VendorDocItem {
  id: string;
  docNumber: string;
  tenantName: string;
  tenantInn: string;
  docType: 'SaaS Лицензия (Счет)' | 'Акт сдачи-приемки ЭДО' | 'Лицензионный договор оферты';
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  period: string;
}

export const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tenants' | 'partners' | 'accounting'>('tenants');
  const [partners, setPartners] = useState<PartnerItem[]>([
    {
      id: 1,
      name: 'Александр Смирнов',
      type: 'VIP Интегратор',
      promoCode: 'SMIRNOV_PRO',
      commissionRate: 40,
      clientsCount: 14,
      paidClientsCount: 8,
      totalEarned: 480000,
      currentBalance: 64000,
      contactInfo: '@smirnov_erp',
      status: 'active'
    },
    {
      id: 2,
      name: 'ООО «Цифровые Решения»',
      type: 'Реселлер',
      promoCode: 'DIGITAL56',
      commissionRate: 35,
      clientsCount: 6,
      paidClientsCount: 5,
      totalEarned: 210000,
      currentBalance: 0,
      contactInfo: 'info@digitalsolutions.ru',
      status: 'active'
    },
    {
      id: 3,
      name: 'Игорь Власов',
      type: 'Менеджер продаж',
      promoCode: 'VLASOV10',
      commissionRate: 30,
      clientsCount: 3,
      paidClientsCount: 1,
      totalEarned: 45000,
      currentBalance: 15000,
      contactInfo: '@vlasov_sales',
      status: 'active'
    },
    {
      id: 4,
      name: 'Агентство «Бизнес-Рост»',
      type: 'Эксклюзивный дилер',
      promoCode: 'ROST2026',
      commissionRate: 50,
      clientsCount: 22,
      paidClientsCount: 18,
      totalEarned: 920000,
      currentBalance: 145000,
      contactInfo: 'partners@bizrost.ru',
      status: 'active'
    }
  ]);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: '',
    type: 'VIP Интегратор',
    promoCode: '',
    commissionRate: 35,
    contactInfo: ''
  });
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);

  const handlePayPartner = (id: number, name: string, amount: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, currentBalance: 0 } : p));
    setActionMessage({
      text: `Выплата ${new Intl.NumberFormat('ru-RU').format(amount)} ₽ партнеру "${name}" подтверждена! Акт сгенерирован.`,
      type: 'success'
    });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerForm.name || !newPartnerForm.promoCode) return;
    const newP: PartnerItem = {
      id: Date.now(),
      name: newPartnerForm.name,
      type: newPartnerForm.type,
      promoCode: newPartnerForm.promoCode.toUpperCase(),
      commissionRate: Number(newPartnerForm.commissionRate) || 30,
      clientsCount: 0,
      paidClientsCount: 0,
      totalEarned: 0,
      currentBalance: 0,
      contactInfo: newPartnerForm.contactInfo || '@new_partner',
      status: 'active'
    };
    setPartners(prev => [newP, ...prev]);
    setIsAddPartnerModalOpen(false);
    setNewPartnerForm({ name: '', type: 'VIP Интегратор', promoCode: '', commissionRate: 35, contactInfo: '' });
    setActionMessage({
      text: `Партнер "${newP.name}" с промокодом ${newP.promoCode} успешно добавлен в сеть!`,
      type: 'success'
    });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSphere, setSelectedSphere] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'expiring'>('all');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedTenantId, setExpandedTenantId] = useState<number | null>(null);
  const [selectedTenantModal, setSelectedTenantModal] = useState<TenantItem | null>(null);
  const [expandedPartnerId, setExpandedPartnerId] = useState<number | null>(null);
  const [selectedPartnerModal, setSelectedPartnerModal] = useState<PartnerItem | null>(null);

  const [vendorDocs, setVendorDocs] = useState<VendorDocItem[]>([
    {
      id: 'inv-001',
      docNumber: 'СФ-1-0701',
      tenantName: 'ООО «Газпром Оренбург Нефтехим»',
      tenantInn: '5610012345',
      docType: 'SaaS Лицензия (Счет)',
      amount: 432000,
      date: '01.07.2026',
      status: 'paid',
      period: '12 месяцев (PRO)'
    },
    {
      id: 'inv-002',
      docNumber: 'СФ-2-0702',
      tenantName: 'ООО «УралСтройМонтаж»',
      tenantInn: '5611098765',
      docType: 'SaaS Лицензия (Счет)',
      amount: 72000,
      date: '02.07.2026',
      status: 'pending',
      period: '6 месяцев (PRO)'
    },
    {
      id: 'act-001',
      docNumber: 'АКТ-1-0630',
      tenantName: 'ООО «Газпром Оренбург Нефтехим»',
      tenantInn: '5610012345',
      docType: 'Акт сдачи-приемки ЭДО',
      amount: 432000,
      date: '30.06.2026',
      status: 'paid',
      period: 'Июнь 2026'
    },
    {
      id: 'inv-003',
      docNumber: 'СФ-3-0628',
      tenantName: 'АО «АгроХолдинг Степной»',
      tenantInn: '5612345678',
      docType: 'SaaS Лицензия (Счет)',
      amount: 15000,
      date: '28.06.2026',
      status: 'overdue',
      period: '1 месяц (Стандарт)'
    },
    {
      id: 'cnt-001',
      docNumber: 'ДОГ-1-2026',
      tenantName: 'ООО «Газпром Оренбург Нефтехим»',
      tenantInn: '5610012345',
      docType: 'Лицензионный договор оферты',
      amount: 432000,
      date: '15.01.2026',
      status: 'paid',
      period: 'Бессрочно'
    }
  ]);
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [docStatusFilter, setDocStatusFilter] = useState<string>('all');

  const handleConfirmDocPayment = (docId: string, tenantName: string) => {
    setVendorDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'paid' } : d));
    setActionMessage({
      text: `💰 Оплата подтверждена! Подписка "${tenantName}" продлена, статус в ЭДО изменен на "Оплачен".`,
      type: 'success'
    });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleRegisterDoc = (docNumber: string, amount: number, period: string, docType: string) => {
    if (!selectedTenantModal) return;
    const newDoc: VendorDocItem = {
      id: `inv-${Date.now()}`,
      docNumber: docNumber,
      tenantName: selectedTenantModal.full_name || selectedTenantModal.name,
      tenantInn: selectedTenantModal.inn || '5610000000',
      docType: docType as any,
      amount: amount,
      date: new Date().toLocaleDateString('ru-RU'),
      status: 'pending',
      period: period
    };
    setVendorDocs(prev => [newDoc, ...prev]);
    setActionMessage({
      text: `📑 Документ № ${docNumber} успешно внесен во внутренний реестр бухгалтерии Вендора!`,
      type: 'success'
    });
    setTimeout(() => setActionMessage(null), 5000);
  };

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
            <Building2 size={12} className="text-blue-500 dark:text-blue-400 shrink-0" />
            <span>Строительство</span>
          </span>
        );
      case 'service':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
            <Layers size={12} className="text-purple-500 dark:text-purple-400 shrink-0" />
            <span>Услуги</span>
          </span>
        );
      case 'agri':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
            <Sparkles size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>Агро</span>
          </span>
        );
      case 'booking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
            <Calendar size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Аренда</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
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

  // Режим «Вездесущего Ока» (Impersonation Mode)
  const handleImpersonateTenant = (tenant: TenantItem) => {
    localStorage.setItem('impersonated_tenant', JSON.stringify({
      id: tenant.id,
      name: tenant.name,
      inn: tenant.inn
    }));
    window.dispatchEvent(new CustomEvent('tenant_impersonated', { detail: tenant }));
    navigate('/crm');
  };

  return (
    <div className="min-h-screen bg-transparent text-[#1a1a1a] dark:text-[#E2E1EB] font-sans pb-24 select-none transition-colors duration-300">
      <Helmet>
        <title>SaaS Command Center | СФЕРУМ Platform</title>
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
      <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8 pt-6">
        
        {/* Navigation & Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-200 dark:border-zinc-800/80 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/crm')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900/80 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-[#1a1a1a] dark:hover:text-white text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <ArrowLeft size={14} />
                <span>Вернуться в CRM</span>
              </button>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#F95700]/15 to-amber-500/15 border border-[#F95700]/30 text-[#F95700] text-xs font-mono font-bold uppercase tracking-wider">
                <Crown size={14} className="animate-pulse shrink-0" />
                <span>Platform Owner Console</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-['Montserrat'] text-[#1a1a1a] dark:text-white tracking-tight flex items-center gap-3">
              Управление Экосистемой <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F95700] to-amber-500">SaaS</span>
            </h1>
            <p className="text-gray-600 dark:text-zinc-400 text-sm max-w-2xl font-normal leading-relaxed">
              Архитектурный мониторинг кластера, контроль мульти-тенантов, управление биллингом и аудит безопасности базы данных Neon PostgreSQL.
            </p>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center flex-wrap gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              title="Выгрузить реестр компаний в CSV"
            >
              <Download size={15} className="text-gray-500 dark:text-zinc-400" />
              <span>Экспорт CSV</span>
            </button>
            <button
              onClick={handleInitSuperadmin}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              title="Инициализировать аккаунт superadmin, если он не создан"
            >
              <ShieldCheck size={15} className="text-amber-500" />
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
          <div className="bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/5 rounded-full blur-3xl group-hover:bg-[#F95700]/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Estimated SaaS MRR</span>
              <div className="p-2.5 rounded-xl bg-[#F95700]/10 text-[#F95700] border border-[#F95700]/20">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-[#1a1a1a] dark:text-white mb-1.5 tracking-tight">
              {new Intl.NumberFormat('ru-RU').format(estimatedMRR)} <span className="text-sm font-normal text-gray-500 dark:text-zinc-400">₽/мес</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
              <TrendingUp size={14} className="text-emerald-500 dark:text-emerald-400" />
              <span>Средний чек ~15 000 ₽ / тенант</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F95700] to-amber-500 w-[75%]" />
            </div>
          </div>

          {/* Card 2: Active vs Blocked */}
          <div className="bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Статус компаний</span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="text-3xl font-black font-mono text-[#1a1a1a] dark:text-white tracking-tight">{activeTenants}</span>
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-semibold">активных</span>
              {blockedTenants > 0 && (
                <span className="text-sm font-mono text-rose-500 dark:text-rose-400 font-semibold">/ {blockedTenants} блок</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              Всего в кластере: <strong className="text-gray-800 dark:text-zinc-200 font-mono">{totalTenants}</strong> тенантов
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
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
          <div className="bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Пользователи SaaS</span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Users size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-[#1a1a1a] dark:text-white mb-1.5 tracking-tight">
              {totalUsers} <span className="text-sm font-normal text-gray-500 dark:text-zinc-400">аккаунтов</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              Среднее: <strong className="text-purple-600 dark:text-purple-300 font-mono">{(totalUsers / (totalTenants || 1)).toFixed(1)}</strong> на одну компанию
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[60%]" />
            </div>
          </div>

          {/* Card 4: Expiring Subscriptions */}
          <div className="bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700/80 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-semibold uppercase tracking-wider">Истекают (14 дней)</span>
              <div className={`p-2.5 rounded-xl border ${expiringCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'}`}>
                <Clock size={18} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-[#1a1a1a] dark:text-white mb-1.5 tracking-tight flex items-center gap-2">
              <span>{expiringCount}</span>
              {expiringCount > 0 && <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">Требуют внимания</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              {expiringCount > 0 ? 'Рекомендуется связаться с клиентами' : 'Все подписки стабильны'}
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${totalTenants > 0 ? (expiringCount / totalTenants) * 100 : 0}%` }} />
            </div>
          </div>

        </div>

        {/* Top-Level Console Navigation Tabs */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-6 py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-[#F95700] text-white shadow-lg shadow-[#F95700]/25 scale-[1.02]'
                : 'bg-white dark:bg-zinc-900/60 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800/80'
            }`}
          >
            <Building2 size={16} />
            <span>Компании и Тенанты ({totalTenants})</span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-6 py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
              activeTab === 'partners'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'bg-white dark:bg-zinc-900/60 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800/80'
            }`}
          >
            <Handshake size={16} className={activeTab === 'partners' ? 'text-white' : 'text-emerald-500 dark:text-emerald-400'} />
            <span>🤝 Сеть Партнеров и Агентов ({partners.length})</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">Reseller</span>
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            className={`px-6 py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2.5 shrink-0 cursor-pointer ${
              activeTab === 'accounting'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
                : 'bg-white dark:bg-zinc-900/60 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800/80'
            }`}
          >
            <FileSpreadsheet size={16} className={activeTab === 'accounting' ? 'text-white' : 'text-purple-500 dark:text-purple-400'} />
            <span>📑 Реестр бухгалтерии Вендора ({vendorDocs.length})</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">ЭДО</span>
          </button>
        </div>

        {/* Tab 1: Tenants List & Management */}
        {activeTab === 'tenants' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Bento Command & Filter Bar */}
          <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800/90 rounded-2xl p-5 shadow-sm dark:shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск по ИНН, названию компании, директору..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800/80 focus:border-[#F95700]/60 rounded-xl pl-11 pr-10 py-3 text-sm text-[#1a1a1a] dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none transition-all shadow-inner font-mono"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white p-1 rounded-md"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Status Quick Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs font-mono text-gray-500 dark:text-zinc-500 mr-1 flex items-center gap-1 shrink-0">
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
                      ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold shadow-md'
                      : 'bg-gray-50 dark:bg-zinc-950/80 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spheres Tabs */}
          <div className="pt-3 border-t border-gray-200 dark:border-zinc-800/60 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-mono text-gray-500 dark:text-zinc-500 mr-2 shrink-0">Отрасль:</span>
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
                    : 'bg-gray-50 dark:bg-zinc-950/60 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-200 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tenants Table Matrix */}
        <div className="bg-white dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800/90 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/80 text-gray-500 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">Компания / ИНН / КПП</th>
                  <th className="py-4 px-4">Отрасль</th>
                  <th className="py-4 px-4 text-center">Лицензии (Юзеры)</th>
                  <th className="py-4 px-4">Статус SaaS</th>
                  <th className="py-4 px-4">Срок действия подписки</th>
                  <th className="py-4 px-6 text-right">Быстрое продление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-2 border-[#F95700] border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-zinc-400 font-mono text-xs">Анализ кластера PostgreSQL и загрузка тенантов...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-zinc-500 font-mono">
                        <Server size={32} className="text-gray-400 dark:text-zinc-600 mb-2" />
                        <span className="text-base font-bold text-gray-600 dark:text-zinc-400">Компании не найдены</span>
                        <span className="text-xs">Попробуйте изменить поисковый запрос или сбросить фильтры</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map(t => {
                    const isExpanded = expandedTenantId === t.id;
                    return (
                      <React.Fragment key={t.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group">
                          
                          {/* Col 1: Company Identity */}
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => setExpandedTenantId(isExpanded ? null : t.id)}
                                className="mt-1 p-1 rounded-md bg-gray-100 dark:bg-zinc-800/60 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                                title="Показать реквизиты и аудит"
                              >
                                <ChevronRight size={14} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <div>
                                <div 
                                  onClick={() => setSelectedTenantModal(t)}
                                  className="font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-white text-base group-hover:text-[#F95700] transition-colors flex items-center gap-2 cursor-pointer hover:underline"
                                  title="Нажмите, чтобы открыть SaaS Кабинет и Документооборот (счета, акты)"
                                >
                                  <span>{t.name}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                                  <span className="bg-gray-100 dark:bg-zinc-950 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-300">
                                    ИНН: <strong>{t.inn}</strong>
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleImpersonateTenant(t);
                                    }}
                                    className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold tracking-tight transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-sm"
                                    title="Войти в кабинет клиента в режиме Вездесущего Ока (Аудит и техподдержка)"
                                  >
                                    👉 Войти под видом
                                  </button>
                                  {t.kpp && (
                                    <span className="text-gray-500 dark:text-zinc-500">
                                      КПП: {t.kpp}
                                    </span>
                                  )}
                                </div>
                                {t.director && (
                                  <div className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1 truncate max-w-xs">
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
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-gray-100 dark:bg-zinc-950 font-mono font-bold text-gray-800 dark:text-zinc-200 text-xs border border-gray-200 dark:border-zinc-800">
                              <Users size={12} className="mr-1.5 text-purple-600 dark:text-purple-400" />
                              {t.users_count}
                            </span>
                          </td>

                          {/* Col 4: Status Toggle */}
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleStatus(t)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                                t.is_active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 animate-pulse'
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
                                <div className="text-gray-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5">
                                  <Calendar size={13} className="text-gray-400 dark:text-zinc-500" />
                                  <span>{new Date(t.subscription_ends_at).toLocaleDateString('ru-RU')}</span>
                                </div>
                                {(() => {
                                  const diffDays = Math.round((new Date(t.subscription_ends_at!).getTime() - Date.now()) / (1000 * 3600 * 24));
                                  if (diffDays < 0) {
                                    return <div className="text-rose-500 dark:text-rose-400 font-bold text-[11px] mt-0.5">Истекла ({Math.abs(diffDays)} дн. назад)</div>;
                                  } else if (diffDays <= 14) {
                                    return <div className="text-amber-600 dark:text-amber-400 font-bold text-[11px] mt-0.5">Осталось: {diffDays} дн. (Внимание!)</div>;
                                  } else {
                                    return <div className="text-gray-500 dark:text-zinc-500 text-[11px] mt-0.5">Осталось: {diffDays} дн.</div>;
                                  }
                                })()}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-xs font-mono">
                                <Sparkles size={11} className="text-amber-500 dark:text-amber-400" />
                                <span>Бессрочно / Trial</span>
                              </span>
                            )}
                          </td>

                          {/* Col 6: Quick Subscription Extend */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-500 mr-1 hidden xl:inline">Продлить:</span>
                              {[
                                { m: 1, label: '+1м', title: 'Продлить на 1 месяц' },
                                { m: 3, label: '+3м', title: 'Продлить на квартал (3 месяца)' },
                                { m: 6, label: '+6м', title: 'Продлить на полугодие' },
                                { m: 12, label: '+1г', title: 'Продлить на 1 год' },
                              ].map(btn => (
                                <button
                                  key={btn.m}
                                  onClick={() => handleExtendSubscription(t.id, btn.m)}
                                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-950 hover:bg-[#F95700] dark:hover:bg-[#F95700] hover:text-white dark:hover:text-white text-gray-700 dark:text-zinc-300 text-xs font-mono font-semibold border border-gray-200 dark:border-zinc-800 hover:border-[#F95700] transition-all cursor-pointer active:scale-95 shadow-sm"
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
                          <tr className="bg-gray-50/90 dark:bg-zinc-950/90 border-b border-gray-200 dark:border-zinc-800 font-mono text-xs">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 shadow-sm">
                                <div className="space-y-2">
                                  <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Building2 size={13} className="text-[#F95700]" /> Юридические реквизиты
                                  </div>
                                  <div className="text-gray-600 dark:text-zinc-300">Полное наименование: <strong className="text-gray-900 dark:text-white font-sans">{t.full_name || t.name}</strong></div>
                                  <div className="text-gray-600 dark:text-zinc-300">ОГРН: <strong className="text-gray-900 dark:text-white">{t.ogrn || 'Не указан'}</strong></div>
                                  <div className="text-gray-600 dark:text-zinc-300">Адрес: <span className="text-gray-500 dark:text-zinc-400 font-sans">{t.address || 'Не указан'}</span></div>
                                </div>

                                <div className="space-y-2">
                                  <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <Activity size={13} className="text-emerald-500 dark:text-emerald-400" /> Системный статус
                                  </div>
                                  <div className="text-gray-600 dark:text-zinc-300">ID в базе данных: <strong className="text-gray-900 dark:text-white">#{t.id}</strong></div>
                                  <div className="text-gray-600 dark:text-zinc-300">Дата регистрации: <strong className="text-gray-900 dark:text-white">{new Date(t.created_at).toLocaleString('ru-RU')}</strong></div>
                                  <div className="text-gray-600 dark:text-zinc-300">База данных: <strong className="text-emerald-600 dark:text-emerald-400">Neon PostgreSQL (RLS Active)</strong></div>
                                </div>

                                <div className="space-y-3 flex flex-col justify-between">
                                  <div>
                                    <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                      <ShieldCheck size={13} className="text-amber-500 dark:text-amber-400" /> Быстрые действия админа
                                    </div>
                                    <p className="text-gray-500 dark:text-zinc-400 text-[11px] mt-1">Ручное управление жизненным циклом тенанта в обход стандартного биллинга.</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => setSelectedTenantModal(t)}
                                      className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                      📄 SaaS Кабинет и Документы
                                    </button>
                                    <button
                                      onClick={() => handleImpersonateTenant(t)}
                                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-rose-500/15 hover:from-amber-500/25 hover:to-rose-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                                      title="Войти в кабинет клиента в режиме технической поддержки"
                                    >
                                      👉 Войти под видом Тенанта
                                    </button>
                                    <button
                                      onClick={() => handleExtendSubscription(t.id, 24)}
                                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      +2 года (VIP)
                                    </button>
                                    <button
                                      onClick={() => handleToggleStatus(t)}
                                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
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
        </div>
        )}

        {/* Tab 2: Reseller Network & Sales Managers */}
        {activeTab === 'partners' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900/80 via-teal-900/80 to-zinc-900 border border-emerald-500/30 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono uppercase font-bold tracking-wider">
                    <Handshake size={14} className="text-amber-400" /> Affiliate & Reseller Network
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight">
                    Сеть продающих менеджеров и IT-интеграторов
                  </h2>
                  <p className="text-sm text-emerald-100/80 leading-relaxed">
                    Управление агентскими договорами, именными промокодами, процентными ставками и выплатами рекуррентных вознаграждений за привлечение клиентов в СФЕРУМ.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddPartnerModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl bg-white text-emerald-950 font-mono font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-xl shrink-0 cursor-pointer active:scale-95"
                >
                  <UserPlus size={16} className="text-emerald-600" />
                  <span>+ Добавить Партнера / Агента</span>
                </button>
              </div>
            </div>

            {/* Reseller KPI Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black font-mono text-gray-900 dark:text-white">{partners.length} агента</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">В активной партнерской сетке</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat('ru-RU').format(partners.reduce((acc, p) => acc + p.totalEarned, 0))} ₽
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Привлечено выручки (ARR партнёров)</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {new Intl.NumberFormat('ru-RU').format(partners.reduce((acc, p) => acc + p.currentBalance, 0))} ₽
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">К выплате комиссионных</div>
                </div>
              </div>
            </div>

            {/* Reseller Table */}
            <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-500" /> Реестр продающих партнеров и комиссионных ставок
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-950/80 text-gray-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-4 px-5">Партнер / Менеджер</th>
                      <th className="py-4 px-5">Промокод & UTM-ссылка</th>
                      <th className="py-4 px-5">Ставка комиссии</th>
                      <th className="py-4 px-5">Приведено клиентов</th>
                      <th className="py-4 px-5">Заработано всего</th>
                      <th className="py-4 px-5 text-right">Текущий баланс</th>
                      <th className="py-4 px-5 text-right">Выплата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-gray-700 dark:text-zinc-300">
                    {partners.map(p => {
                      const isExpandedPartner = expandedPartnerId === p.id;
                      return (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                            <td className="py-4 px-5">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => setExpandedPartnerId(isExpandedPartner ? null : p.id)}
                                  className="mt-1 p-1 rounded-md bg-gray-100 dark:bg-zinc-800/60 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                                  title="Раскрыть договоры, акты и реферальных клиентов"
                                >
                                  <ChevronRight size={14} className={`transform transition-transform ${isExpandedPartner ? 'rotate-90' : ''}`} />
                                </button>
                                <div>
                                  <div 
                                    onClick={() => setSelectedPartnerModal(p)}
                                    className="font-bold font-['Montserrat'] text-gray-900 dark:text-white text-base group-hover:text-emerald-500 transition-colors flex items-center gap-2 cursor-pointer hover:underline"
                                    title="Нажмите, чтобы открыть карточку партнера, договоры (ЭДО) и акты"
                                  >
                                    <span>{p.name}</span>
                                    <ExternalLink size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">{p.type}</span>
                                    <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{p.contactInfo}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20">
                                  {p.promoCode}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`https://sferum.space/register?agent=${p.promoCode}`);
                                    setCopiedPromo(p.promoCode);
                                    setTimeout(() => setCopiedPromo(null), 3000);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                                  title="Скопировать UTM-ссылку"
                                >
                                  {copiedPromo === p.promoCode ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Copy size={15} />}
                                </button>
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 truncate max-w-[200px]">
                                sferum.space/register?agent={p.promoCode}
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="font-mono font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1">
                                <span>{p.commissionRate}%</span>
                                <span className="text-[11px] font-normal text-gray-500">LTV</span>
                              </div>
                              <div className="text-[10px] text-gray-400">С каждого платежа</div>
                            </td>
                            <td className="py-4 px-5 font-mono">
                              <div className="font-bold text-gray-900 dark:text-white">{p.clientsCount} компаний</div>
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">🟢 Оплатили: {p.paidClientsCount}</div>
                            </td>
                            <td className="py-4 px-5 font-mono font-bold text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('ru-RU').format(p.totalEarned)} ₽
                            </td>
                            <td className="py-4 px-5 font-mono font-extrabold text-right">
                              {p.currentBalance > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                  {new Intl.NumberFormat('ru-RU').format(p.currentBalance)} ₽
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-zinc-600">0 ₽</span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right">
                              {p.currentBalance > 0 ? (
                                <button
                                  onClick={() => handlePayPartner(p.id, p.name, p.currentBalance)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 ml-auto cursor-pointer active:scale-95"
                                >
                                  <CreditCard size={14} />
                                  <span>Выплатить</span>
                                </button>
                              ) : (
                                <span className="text-xs font-mono text-gray-400 dark:text-zinc-500 inline-flex items-center gap-1">
                                  <CheckCircle2 size={14} className="text-emerald-500" /> Выплачено
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Partner Details Row */}
                          {isExpandedPartner && (
                            <tr className="bg-gray-50/90 dark:bg-zinc-950/90 border-b border-gray-200 dark:border-zinc-800 font-mono text-xs">
                              <td colSpan={7} className="p-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-200 dark:border-zinc-800/80 shadow-sm">
                                  
                                  {/* Block 1: Договор и статус */}
                                  <div className="space-y-3">
                                    <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                      <FileText size={14} className="text-emerald-500" /> Агентский договор (ЭДО)
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                                      <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                        <span>Договор № AG-{p.id}/2026</span>
                                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">
                                          ПЭП Подписан
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                                        Лицензионно-агентский договор на {p.commissionRate}% LTV
                                      </div>
                                      <div className="pt-2 flex items-center gap-2 border-t border-emerald-500/10">
                                        <button 
                                          onClick={() => setSelectedPartnerModal(p)}
                                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                        >
                                          <FileText size={13} /> Открыть договор и акты
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Block 2: Реестр актов и выплат */}
                                  <div className="space-y-3">
                                    <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                      <FileCheck size={14} className="text-amber-500" /> Акты выполненных работ
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 space-y-2">
                                      <div className="flex items-center justify-between text-gray-700 dark:text-zinc-300 font-bold">
                                        <span>Акт № 06/2026</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-extrabold">{new Intl.NumberFormat('ru-RU').format(Math.round(p.totalEarned * 0.45))} ₽</span>
                                      </div>
                                      <div className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                                        <CheckCircle2 size={12} className="text-emerald-500" /> Выплачено по агентскому счету
                                      </div>
                                      <div className="pt-2 flex items-center justify-between border-t border-gray-200 dark:border-zinc-800/80">
                                        <span className="text-[10px] text-gray-400">Сформировано: 3 шт.</span>
                                        <button 
                                          onClick={() => setSelectedPartnerModal(p)}
                                          className="text-[#F95700] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>Все акты</span> <ExternalLink size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Block 3: Привлеченные клиенты */}
                                  <div className="space-y-3">
                                    <div className="text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider font-bold flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Briefcase size={14} className="text-blue-500" /> Сетка клиентов ({p.clientsCount})
                                      </span>
                                      <button
                                        onClick={() => setSelectedPartnerModal(p)}
                                        className="text-[#F95700] hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                                      >
                                        <span>Подробнее</span> <ExternalLink size={11} />
                                      </button>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 space-y-2">
                                      <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                        <span>ООО «ПромТехИнтеграция»</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">PRO • Оплачен</span>
                                      </div>
                                      <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                        <span>АО «Завод Машиностроения»</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">Enterprise</span>
                                      </div>
                                      {p.clientsCount > 2 && (
                                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 pt-1 border-t border-gray-200 dark:border-zinc-800 text-center font-medium">
                                          + еще {p.clientsCount - 2} компаний в сетке
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Vendor Accounting & Billing Registry */}
        {activeTab === 'accounting' && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase">
                  <span>Общий оборот реестра</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                  {new Intl.NumberFormat('ru-RU').format(vendorDocs.reduce((sum, d) => sum + d.amount, 0))} ₽
                </div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500">По всем выставленным счетам и актам</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase">
                  <span>Оплачено (Поступления)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {new Intl.NumberFormat('ru-RU').format(vendorDocs.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0))} ₽
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-500/80 font-semibold">
                  {vendorDocs.filter(d => d.status === 'paid').length} документов исполнено
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase">
                  <span>Ожидает оплаты / В работе</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {new Intl.NumberFormat('ru-RU').format(vendorDocs.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0))} ₽
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-500/80 font-semibold">
                  {vendorDocs.filter(d => d.status === 'pending').length} выставленных счетов
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase">
                  <span>Статус интеграции ЭДО</span>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono pt-0.5">
                  СБИС / Диадок 200 OK
                </div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500">Авто-регистрация в реестре ПО №12345</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase mr-1">Тип документа:</span>
                {[
                  { id: 'all', label: 'Все документы' },
                  { id: 'SaaS Лицензия (Счет)', label: '💳 Счета на оплату' },
                  { id: 'Акт сдачи-приемки ЭДО', label: '📑 Закрывающие Акты' },
                  { id: 'Лицензионный договор оферты', label: '📜 Договоры SaaS' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDocTypeFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                      docTypeFilter === tab.id
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-gray-50 dark:bg-zinc-950 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 font-bold uppercase mr-1">Статус:</span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'paid', label: 'Оплачены' },
                  { id: 'pending', label: 'Ожидают' },
                  { id: 'overdue', label: 'Просрочены' }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setDocStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      docStatusFilter === st.id
                        ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-md'
                        : 'bg-gray-50 dark:bg-zinc-950 text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accounting Registry Table */}
            <div className="bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50 dark:bg-zinc-950/80 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="font-mono text-xs font-bold uppercase text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                  <span>Внутренний реестр бухгалтерии ООО «СФЕРУМ ТЕХНОЛОГИИ» (Вендор)</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">Хранилище: /backend/data/invoices/</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-gray-500 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-6">№ Документа / Дата</th>
                      <th className="py-3.5 px-4">Компани-Подписчик (ИНН)</th>
                      <th className="py-3.5 px-4">Тип / Период подписки</th>
                      <th className="py-3.5 px-4 text-right">Сумма (без НДС)</th>
                      <th className="py-3.5 px-4 text-center">Статус ЭДО</th>
                      <th className="py-3.5 px-6 text-right">Действия в реестре</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/60 font-mono text-xs">
                    {vendorDocs
                      .filter(d => docTypeFilter === 'all' || d.docType === docTypeFilter)
                      .filter(d => docStatusFilter === 'all' || d.status === docStatusFilter)
                      .map(doc => (
                        <tr key={doc.id} className="hover:bg-purple-500/5 dark:hover:bg-purple-500/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600 dark:text-purple-400">{doc.docNumber}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-500">SaaS</span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-normal mt-0.5">{doc.date} г.</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-800 dark:text-zinc-200 font-sans text-sm">{doc.tenantName}</div>
                            <div className="text-[11px] text-gray-400">ИНН: {doc.tenantInn}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-gray-700 dark:text-zinc-300 block font-sans">{doc.docType}</span>
                            <span className="text-[11px] text-gray-400">{doc.period}</span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-sm text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('ru-RU').format(doc.amount)} ₽
                          </td>
                          <td className="py-4 px-4 text-center">
                            {doc.status === 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 size={12} /> Оплачен
                              </span>
                            )}
                            {doc.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock size={12} /> Ожидает оплаты
                              </span>
                            )}
                            {doc.status === 'overdue' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <AlertTriangle size={12} /> Просрочен
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setActionMessage({ text: `Формирование и скачивание файла ${doc.docNumber}.docx...`, type: 'success' });
                                  setTimeout(() => setActionMessage(null), 3500);
                                }}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer"
                                title="Скачать в Docx / PDF"
                              >
                                <Download size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setActionMessage({ text: `Документ ${doc.docNumber} успешно отправлен по ЭДО (СБИС/Диадок) для ${doc.tenantName}`, type: 'success' });
                                  setTimeout(() => setActionMessage(null), 4000);
                                }}
                                className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 transition-all cursor-pointer"
                                title="Отправить по ЭДО"
                              >
                                <Send size={14} />
                              </button>

                              {doc.status !== 'paid' && (
                                <button
                                  onClick={() => handleConfirmDocPayment(doc.id, doc.tenantName)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                                >
                                  <Check size={13} />
                                  <span>Оплачен</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-gray-500 dark:text-zinc-500 px-2 gap-4">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-emerald-500 animate-pulse" />
            <span>SFERA SaaS Cluster • Neon Serverless PostgreSQL 18.4 • Tenant Isolation via RLS</span>
          </div>
          <div>
            Обновлено: {new Date().toLocaleTimeString('ru-RU')}
          </div>
        </div>

      </div>

      <SaaSTenantModal
        isOpen={!!selectedTenantModal}
        onClose={() => setSelectedTenantModal(null)}
        tenant={selectedTenantModal}
        onExtendSubscription={handleExtendSubscription}
        onToggleStatus={handleToggleStatus}
        onRegisterDoc={handleRegisterDoc}
      />

      <SaaSPartnerModal
        isOpen={!!selectedPartnerModal}
        onClose={() => setSelectedPartnerModal(null)}
        partner={selectedPartnerModal}
        onPayPartner={(id, name, amount) => {
          handlePayPartner(id, name, amount);
          setSelectedPartnerModal(null);
        }}
      />

      {/* Add Partner / Reseller Modal */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-500" /> Регистрация Партнера или Агента
              </h3>
              <button
                onClick={() => setIsAddPartnerModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPartner} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                  ФИО Менеджера или Название компании-партнера *
                </label>
                <input
                  type="text"
                  required
                  placeholder="например, Александр Смирнов или ООО «Интегратор»"
                  value={newPartnerForm.name}
                  onChange={e => setNewPartnerForm({ ...newPartnerForm, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Промокод (UTM) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SMIRNOV_PRO"
                    value={newPartnerForm.promoCode}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, promoCode: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono uppercase text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Ставка комиссии (%) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    required
                    value={newPartnerForm.commissionRate}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, commissionRate: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Тип партнерства
                  </label>
                  <select
                    value={newPartnerForm.type}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, type: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    <option value="VIP Интегратор">VIP Интегратор (40-50%)</option>
                    <option value="Реселлер">Реселлер (35%)</option>
                    <option value="Менеджер продаж">Менеджер продаж (30%)</option>
                    <option value="Эксклюзивный дилер">Эксклюзивный дилер (50%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Telegram / Email для связи
                  </label>
                  <input
                    type="text"
                    placeholder="@smirnov_erp"
                    value={newPartnerForm.contactInfo}
                    onChange={e => setNewPartnerForm({ ...newPartnerForm, contactInfo: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-mono font-semibold text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Создать партнера
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
