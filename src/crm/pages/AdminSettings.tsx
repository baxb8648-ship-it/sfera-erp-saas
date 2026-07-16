import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, ShieldAlert, Plus, RefreshCw, Search, ChevronLeft, ChevronRight, Lock, Unlock, Database, Download, Upload, Settings, Eye, EyeOff, Key, Trash2, Mail, History, CreditCard, FileText, Calendar, Sparkles, Gift, Copy, CheckCircle, Users, DollarSign, Award, Share2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { IntegrationsSettings } from '../components/IntegrationsSettings';
import { WhiteLabelSettings } from '../components/WhiteLabelSettings';
import { RoleMatrixSettings } from '../components/RoleMatrixSettings';
import { AuditLogs } from './AuditLogs';

interface UserItem {
  id: number;
  username: string;
  role: string;
  is_active: number;
  telegram_chat_id?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_use_ssl?: number;
}

interface AuthLogItem {
  id: number;
  user_id: number | null;
  username: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'audit' | 'security' | 'backup' | 'integrations' | 'billing' | 'whitelabel' | 'referral'>('users');
  const [copiedRef, setCopiedRef] = useState(false);
  
  // User Management States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [newRole, setNewRole] = useState('manager');
  const [newTelegramChatId, setNewTelegramChatId] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Custom Confirmation & Prompt Modals States
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserItem | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<UserItem | null>(null);
  const [passwordChangeInput, setPasswordChangeInput] = useState('');
  const [showPasswordChangeEye, setShowPasswordChangeEye] = useState(false);

  // SMTP Settings States
  const [smtpChangeUser, setSmtpChangeUser] = useState<UserItem | null>(null);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpUseSsl, setSmtpUseSsl] = useState(1);

  const handleSmtpChangeClick = (user: UserItem) => {
    setSmtpChangeUser(user);
    setSmtpHost(user.smtp_host || '');
    setSmtpPort(user.smtp_port || 465);
    setSmtpUser(user.smtp_user || '');
    setSmtpPassword(user.smtp_password || '');
    setSmtpUseSsl(user.smtp_use_ssl !== undefined ? user.smtp_use_ssl : 1);
  };

  const executeSmtpChange = async () => {
    if (!smtpChangeUser) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/${smtpChangeUser.id}/smtp`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smtp_host: smtpHost.trim() || null,
          smtp_port: smtpPort ? Number(smtpPort) : null,
          smtp_user: smtpUser.trim() || null,
          smtp_password: smtpPassword.trim() || null,
          smtp_use_ssl: smtpUseSsl ? 1 : 0
        })
      });
      if (response.ok) {
        alert(`SMTP настройки для ${smtpChangeUser.username} сохранены!`);
        setSmtpChangeUser(null);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось обновить SMTP настройки');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка при обновлении SMTP');
    }
  };

  // Security Log States
  const [logs, setLogs] = useState<AuthLogItem[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [logPage, setLogPage] = useState(0);
  const logsPerPage = 20;

  // Billing States
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [invoiceAmount, setInvoiceAmount] = useState(5000);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'security') {
      fetchLogs();
    } else if (activeTab === 'billing') {
      fetchBillingStatus();
      fetchInvoices();
    }
  }, [activeTab]);

  const fetchBillingStatus = async () => {
    try {
      const response = await fetch(`${baseUrl}/billing/status`);
      if (response.ok) {
        const data = await response.json();
        setBillingStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch billing status:", e);
    }
  };

  const fetchInvoices = async () => {
    setIsBillingLoading(true);
    try {
      const response = await fetch(`${baseUrl}/billing/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error("Failed to fetch invoices:", e);
    } finally {
      setIsBillingLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceAmount <= 0) return;
    setIsGeneratingInvoice(true);
    try {
      const response = await fetch(`${baseUrl}/billing/invoices?amount=${invoiceAmount}`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('Счет на оплату успешно выставлен!');
        setInvoiceAmount(5000);
        fetchInvoices();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось выставить счет');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения с сервером при выставлении счета');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handlePayInvoice = async (invoiceId: number) => {
    if (!window.confirm('ВНИМАНИЕ! Это тестовое подтверждение оплаты (имитация ответа банка). Подтвердить оплату счета и продлить подписку компании на 30 дней?')) return;
    try {
      const response = await fetch(`${baseUrl}/billing/invoices/${invoiceId}/pay`, {
        method: 'POST'
      });
      if (response.ok) {
        alert('Счет успешно оплачен! Подписка продлена.');
        fetchBillingStatus();
        fetchInvoices();
      } else {
        const err = await response.json();
        alert(err.detail || 'Ошибка оплаты');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при оплате счета');
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/users/', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/users/auth-logs?skip=${logPage * logsPerPage}&limit=${logsPerPage}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`, {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      const delayDebounce = setTimeout(() => {
        setLogPage(0);
        fetchLogs();
      }, 400);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchLogs();
    }
  }, [logPage]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateError('Заполните все обязательные поля');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          telegram_chat_id: newTelegramChatId.trim() || null
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setCreateSuccess(`Пользователь ${newUsername} успешно создан!`);
        setNewUsername('');
        setNewPassword('');
        setNewRole('manager');
        setNewTelegramChatId('');
        fetchUsers();
      } else {
        setCreateError(data.detail || 'Ошибка создания пользователя');
      }
    } catch (error) {
      setCreateError('Сетевая ошибка');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTelegramChange = async (userId: number, chatId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/users/${userId}/telegram?telegram_chat_id=${encodeURIComponent(chatId)}`, {
        method: 'PUT',
        headers: {}
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось обновить Telegram Chat ID');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/users/${userId}/role?role=${role}`, {
        method: 'PUT',
        headers: {}
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось обновить роль');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: number) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/users/${userId}/status?is_active=${nextStatus}`, {
        method: 'PUT',
        headers: {}
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось обновить статус');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasswordChange = (user: UserItem) => {
    setPasswordChangeUser(user);
    setPasswordChangeInput('');
    setShowPasswordChangeEye(false);
  };

  const executePasswordChange = async (userId: number, username: string) => {
    const pass = passwordChangeInput.trim();
    if (pass.length < 4) {
      alert('Пароль должен состоять минимум из 4 символов!');
      return;
    }
    setPasswordChangeUser(null);
    setPasswordChangeInput('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/users/${userId}/password?password=${encodeURIComponent(pass)}`, {
        method: 'PUT',
        headers: {}
      });
      if (response.ok) {
        alert(`Пароль для сотрудника ${username} успешно изменен!`);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось изменить пароль');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка при изменении пароля');
    }
  };

  const handleDeleteUser = (user: UserItem) => {
    setDeleteConfirmUser(user);
  };

  const executeDeleteUser = async (userId: number, username: string) => {
    setDeleteConfirmUser(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/users/${userId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        alert(`Сотрудник ${username} успешно удален`);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || 'Не удалось удалить сотрудника');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка при удалении сотрудника');
    }
  };

  const getFriendlyUserAgent = (ua: string | null) => {
    if (!ua) return 'Неизвестно';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Apple Safari';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Postman')) return 'Postman API';
    return ua.slice(0, 30) + (ua.length > 30 ? '...' : '');
  };

  return (
    <div className="space-y-6 font-['Inter']">
      <Helmet>
        <title>Администрирование | СФЕРУМ</title>
      </Helmet>
      <div>
        <h1 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-white">Панель администрирования</h1>
        <p className="text-gray-500 dark:text-zinc-400">Управление учетными записями сотрудников и аудит системы безопасности</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-gray-100/70 dark:bg-zinc-900/90 p-1.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 w-full shadow-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'users' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <UserCheck className="w-4 h-4" /> Сотрудники
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'matrix' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <Key className="w-4 h-4" /> Матрица ролей
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'audit' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <History className="w-4 h-4" /> История изменений
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'security' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Логи безопасности
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'backup' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <Database className="w-4 h-4" /> Данные (Бэкап)
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'integrations' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <Settings className="w-4 h-4" /> Интеграции
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'billing' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <CreditCard className="w-4 h-4" /> Оплата и подписка
        </button>
        <button
          onClick={() => setActiveTab('whitelabel')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'whitelabel' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> White-Label Брендирование
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'referral' ? 'bg-[#F95700] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-2xs'}`}
        >
          <Gift className="w-4 h-4 text-emerald-500" /> Реферальная программа
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
        
        {/* Tab: Matrix */}
        {activeTab === 'matrix' && <RoleMatrixSettings />}

        {/* Tab 5: Billing & Invoices */}
        {activeTab === 'billing' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-gray-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#F95700]" /> Биллинг и Управление подпиской
                </h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Контроль статуса платформы СФЕРУМ, выставление и оплата B2B-счетов
                </p>
              </div>
              <button
                onClick={() => { fetchBillingStatus(); fetchInvoices(); }}
                className="p-2 text-gray-400 hover:text-[#F95700] bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
                title="Обновить данные"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Bento Grid: Subscription status + Invoice generator */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Статус подписки */}
              <div className="md:col-span-7 bg-gradient-to-br from-orange-500 to-[#F95700] text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <CreditCard className="w-64 h-64" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                      Текущий тариф: СФЕРУМ b2b
                    </span>
                    <Sparkles className="w-5 h-5 text-orange-200" />
                  </div>
                  
                  {billingStatus ? (
                    <div className="space-y-1.5 pt-2">
                      <h4 className="text-2xl font-bold font-['Montserrat']">{billingStatus.name}</h4>
                      <p className="text-sm text-orange-100">ИНН: {billingStatus.inn} • Сфера: {billingStatus.sphere === 'construction' ? 'Строительство и АКЗ' : billingStatus.sphere === 'service' ? 'Сервис' : 'Другое'}</p>
                    </div>
                  ) : (
                    <div className="h-16 animate-pulse bg-white/10 rounded-lg"></div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/20 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-orange-100 uppercase font-semibold">Подписка активна до</span>
                    <div className="flex items-center gap-1.5 text-base font-bold">
                      <Calendar className="w-4 h-4" />
                      {billingStatus?.subscription_ends_at ? (
                        new Date(billingStatus.subscription_ends_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
                      ) : (
                        'Не ограничена (демо)'
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white text-[#F95700] px-4 py-1.5 rounded-xl font-bold text-sm shadow-md">
                    {billingStatus?.is_active ? 'АКТИВНА' : 'БЛОКИРОВАНА'}
                  </div>
                </div>
              </div>

              {/* Выставить новый счет */}
              <div className="md:col-span-5 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 bg-gray-50/50 dark:bg-zinc-950 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5 text-sm uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#F95700]" /> Выписать счет на оплату
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Счет будет автоматически сформирован в формате Word .docx с подписью, НДС и суммой прописью для оплаты по безналу.
                  </p>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Сумма платежа (руб.)</label>
                    <input
                      type="number"
                      min={100}
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                      placeholder="5000"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingInvoice}
                    className="w-full py-2.5 bg-[#1a1a1a] dark:bg-zinc-800 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingInvoice ? 'Генерация счета...' : 'Сформировать B2B счет'}
                  </button>
                </form>
              </div>

            </div>

            {/* Таблица счетов */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">История выставленных счетов</h4>

              {isBillingLoading ? (
                <div className="text-center py-8 text-sm text-gray-400">Загрузка счетов...</div>
              ) : (
                <div className="overflow-x-auto border border-gray-150 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-850 border-b border-gray-150 dark:border-zinc-850 text-gray-700 dark:text-zinc-300 font-semibold">
                        <th className="p-3">Номер счета</th>
                        <th className="p-3">Дата создания</th>
                        <th className="p-3">Сумма (₽)</th>
                        <th className="p-3">Статус оплаты</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-gray-100 dark:border-zinc-800/60 hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 text-gray-700 dark:text-zinc-300">
                          <td className="p-3 font-mono font-bold">Счет #{inv.id.toString().padStart(5, '0')}</td>
                          <td className="p-3 text-gray-400">
                            {new Date(inv.created_at).toLocaleDateString('ru-RU')} {new Date(inv.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 font-bold text-sm">{inv.amount.toLocaleString('ru-RU')} ₽</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'paid' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300'}`}>
                              {inv.status === 'paid' ? 'Оплачен' : 'Ожидает оплаты'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {inv.status !== 'paid' && (
                                <button
                                  onClick={() => handlePayInvoice(inv.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Подтвердить оплату (Тест)
                                </button>
                              )}
                              <a
                                href={`${baseUrl}/billing/invoices/${inv.id}/download`}
                                download
                                className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Скачать счет Word (.docx)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-400">Счета на оплату еще не выставлялись</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 1: Users Management */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Create form */}
            <div className="xl:col-span-4 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 dark:border-zinc-800 pb-2">
                <Plus className="w-4 h-4 text-[#F95700]" /> Создать сотрудника
              </h3>
              
              {createError && (
                <div className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300 p-3 rounded-lg text-xs font-semibold">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-300 p-3 rounded-lg text-xs font-semibold">
                  {createSuccess}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Логин</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ivan_mngr"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Пароль</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400 focus:outline-none flex items-center justify-center cursor-pointer select-none"
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Telegram Chat ID</span>
                    <a 
                      href="https://t.me/userinfobot" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-[#F95700] hover:underline"
                    >
                      Как узнать?
                    </a>
                  </label>
                  <input
                    type="text"
                    value={newTelegramChatId}
                    onChange={(e) => setNewTelegramChatId(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Роль</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white cursor-pointer"
                  >
                    <option value="manager">Менеджер</option>
                    <option value="accountant">Бухгалтер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 bg-[#F95700] hover:bg-[#E04D00] active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {isCreating ? 'Создание...' : 'Создать сотрудника'}
                </button>
              </form>
            </div>

            {/* List Table */}
            <div className="xl:col-span-8 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-2">
                <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider">Список сотрудников</h3>
                <button 
                  onClick={fetchUsers}
                  className="p-1.5 text-gray-400 hover:text-[#F95700] rounded-lg transition-colors cursor-pointer"
                  title="Обновить"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {isUsersLoading ? (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-zinc-400">Загрузка пользователей...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold">
                        <th className="p-3">ID</th>
                        <th className="p-3">Имя пользователя</th>
                        <th className="p-3">Роль в системе</th>
                        <th className="p-3">Telegram ID</th>
                        <th className="p-3">Статус</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-gray-100 dark:border-zinc-800/60 hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 text-gray-700 dark:text-zinc-300">
                          <td className="p-3 font-mono">{u.id}</td>
                          <td className="p-3 font-bold">{u.username}</td>
                          <td className="p-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="px-2 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded focus:outline-none focus:ring-1 focus:ring-[#F95700] cursor-pointer"
                            >
                              <option value="admin">Администратор</option>
                              <option value="manager">Менеджер</option>
                              <option value="accountant">Бухгалтер</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={u.telegram_chat_id || ''}
                              onBlur={(e) => handleTelegramChange(u.id, e.target.value)}
                              placeholder="Например, 12345678"
                              className="w-28 px-2 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded focus:outline-none focus:ring-1 focus:ring-[#F95700] text-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active === 1 ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'}`}>
                              {u.is_active === 1 ? 'Активен' : 'Заблокирован'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSmtpChangeClick(u)}
                                className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                                title="Настроить SMTP почту сотрудника"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePasswordChange(u)}
                                className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
                                title="Сменить пароль сотрудника"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStatusToggle(u.id, u.is_active)}
                                className={`p-1.5 rounded transition-all cursor-pointer ${u.is_active === 1 ? 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:text-green-300' : 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300'}`}
                                title={u.is_active === 1 ? 'Заблокировать сотрудника' : 'Разблокировать сотрудника'}
                              >
                                {u.is_active === 1 ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                                title="Удалить сотрудника"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Audit Logs */}
        {activeTab === 'audit' && (
          <AuditLogs isTab={true} />
        )}

        {/* Tab 2: Security Logs */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F95700]" /> Аудит авторизаций в системе
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none sm:w-60">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени..."
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                  />
                </div>
                
                <button 
                  onClick={fetchLogs}
                  className="p-2 text-gray-400 hover:text-[#F95700] bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  title="Обновить список"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isLogsLoading ? (
              <div className="text-center py-12 text-sm text-gray-500 dark:text-zinc-400">Загрузка логов безопасности...</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-850 border-b border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold sticky top-0 z-10">
                        <th className="p-3">Время события</th>
                        <th className="p-3">Логин / Попытка</th>
                        <th className="p-3">Событие</th>
                        <th className="p-3">IP-адрес</th>
                        <th className="p-3">Браузер / Агент</th>
                        <th className="p-3 text-right">Результат</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        let statusColor = 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300';
                        let statusText = 'Успешно';
                        if (log.status === 'failure') {
                          statusColor = 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300';
                          statusText = 'Ошибка (пароль)';
                        } else if (log.status === 'blocked_attempt') {
                          statusColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300';
                          statusText = 'Заблокирован';
                        }
                        
                        return (
                          <tr key={log.id} className="border-b border-gray-100 dark:border-zinc-800/60 hover:bg-gray-50/50 dark:hover:bg-zinc-850/30 text-gray-700 dark:text-zinc-300">
                            <td className="p-3 text-gray-400 font-mono">
                              {new Date(log.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3 font-bold">{log.username}</td>
                            <td className="p-3 font-medium">
                              {log.status === 'success' ? 'Вход в систему' : log.status === 'blocked_attempt' ? 'Попытка заблокированного входа' : 'Неудачный вход'}
                            </td>
                            <td className="p-3 font-mono text-gray-500 dark:text-zinc-400">{log.ip_address || '—'}</td>
                            <td className="p-3 text-gray-400 truncate max-w-[200px]" title={log.user_agent || ''}>
                              {getFriendlyUserAgent(log.user_agent)}
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400">Событий авторизации не найдено</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400">
                  <div>
                    Показано логов: {logs.length} (Страница {logPage + 1})
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage(prev => Math.max(0, prev - 1))}
                      disabled={logPage === 0}
                      className="p-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLogPage(prev => prev + 1)}
                      disabled={logs.length < logsPerPage}
                      className="p-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Backup */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F95700]" /> Резервное копирование системы
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Скачивание и восстановление всех данных из базы. Защита от непредвиденных сбоев или случайного удаления.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Экспорт */}
              <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center rounded-2xl mb-4">
                  <Download className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Создать резервную копию</h4>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 flex-1">
                  Сгенерировать полный дамп базы данных (включая все проекты, клиентов и настройки) в формате JSON для безопасного хранения.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/backup/export', {
                        headers: {}
                      });
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `sphera_backup_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } else {
                        alert('Ошибка при выгрузке');
                      }
                    } catch (e) {
                      alert('Сетевая ошибка при экспорте');
                    }
                  }}
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Скачать JSON файл
                </button>
              </div>

              {/* Импорт */}
              <div className="border border-red-200 dark:border-red-900/30 rounded-xl p-6 flex flex-col items-center text-center bg-red-50/30 dark:bg-red-950/10">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center rounded-2xl mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Восстановить из копии</h4>
                <p className="text-sm text-red-600/80 mb-6 flex-1 font-semibold">
                  Внимание! Текущие данные будут полностью удалены и заменены данными из загружаемого файла. Это действие необратимо.
                </p>
                <label className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors cursor-pointer block">
                  Загрузить JSON файл
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const confirmed = window.confirm(
                        "ВНИМАНИЕ! Вы собираетесь перезаписать всю базу данных. Все текущие данные будут уничтожены и заменены данными из этого файла. Продолжить?"
                      );
                      if (!confirmed) {
                        e.target.value = '';
                        return;
                      }

                      const formData = new FormData();
                      formData.append('file', file);
                      
                      try {
                        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/backup/import', {
                          method: 'POST',
                          headers: {},
                          body: formData
                        });
                        
                        if (response.ok) {
                          alert('База данных успешно восстановлена. Страница будет перезагружена.');
                          window.location.reload();
                        } else {
                          const data = await response.json();
                          alert('Ошибка при восстановлении: ' + (data.detail || ''));
                        }
                      } catch (err) {
                        alert('Сетевая ошибка при импорте');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Integrations */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#F95700]" /> Интеграции и API
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Настройки подключения к внешним сервисам: почта, Telegram, тендерные площадки.
              </p>
            </div>
            
            <IntegrationsSettings />
          </div>
        )}

        {/* Tab 6: White-Label Branding */}
        {activeTab === 'whitelabel' && (
          <div className="space-y-6">
            <WhiteLabelSettings />
          </div>
        )}

        {/* Tab 7: Referral Program */}
        {activeTab === 'referral' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="border-b border-gray-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-500" /> Партнерская и Реферальная Программа
                </h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Приглашайте компании в СФЕРУМ, получайте бесплатные месяцы подписки и до 30% партнерского вознаграждения.
                </p>
              </div>
            </div>

            {/* Hero Card */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 text-amber-300" /> PRO Партнер (Скидка 15%)
                </div>
                <h4 className="text-2xl md:text-3xl font-extrabold font-['Montserrat'] leading-tight">
                  Поделитесь ссылкой — получите +14 дней бесплатно за каждую регистрацию!
                </h4>
                <p className="text-sm text-emerald-100 leading-relaxed">
                  Когда приглашенная компания оплачивает любой тариф, вам автоматически начисляется 30 дней работы бесплатно или 30% от суммы их первого счета на баланс.
                </p>

                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase text-emerald-200 mb-1.5">
                    Ваша персональная реферальная ссылка:
                  </label>
                  <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
                    <input 
                      type="text" 
                      readOnly 
                      value={`https://сфера-ерп.рф/register?ref=SFERUM-TENANT-${billingStatus?.id || '101'}-PRO`}
                      className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-white focus:outline-none truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://сфера-ерп.рф/register?ref=SFERUM-TENANT-${billingStatus?.id || '101'}-PRO`);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 3000);
                      }}
                      className="px-4 py-2.5 rounded-lg bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-md shrink-0"
                    >
                      {copiedRef ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedRef ? 'Скопировано!' : 'Скопировать'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">3 компании</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">Приглашено по ссылке</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">+45 дней / 4 500 ₽</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">Начислено бонусов</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">30% комиссия</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">Ставка с продлений</div>
                </div>
              </div>
            </div>

            {/* Invited Partners Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                Приглашенные компании и статус вознаграждения
              </h4>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-zinc-800/80 text-gray-600 dark:text-zinc-400 text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Компания</th>
                      <th className="py-3 px-4">Дата регистрации</th>
                      <th className="py-3 px-4">Тариф</th>
                      <th className="py-3 px-4">Статус</th>
                      <th className="py-3 px-4 text-right">Начисленный бонус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">ООО ПромТехОборудование</td>
                      <td className="py-3 px-4 font-mono text-xs">15.06.2026</td>
                      <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-semibold">Бизнес</span></td>
                      <td className="py-3 px-4"><span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">🟢 Оплачен (1 год)</span></td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+30 дней / 3 000 ₽</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">АО СтройМашЗавод</td>
                      <td className="py-3 px-4 font-mono text-xs">28.06.2026</td>
                      <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-xs font-semibold">Стандарт</span></td>
                      <td className="py-3 px-4"><span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">🟢 Оплачен (6 мес)</span></td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+15 дней / 1 500 ₽</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">ИП Смирнов В.А.</td>
                      <td className="py-3 px-4 font-mono text-xs">01.07.2026</td>
                      <td className="py-3 px-4"><span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">Пробный</span></td>
                      <td className="py-3 px-4"><span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">🟡 Тестовый период</span></td>
                      <td className="py-3 px-4 text-right font-mono text-gray-400">Ожидание оплаты</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Custom Confirmation Modals */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 transform scale-95 transition-all">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Подтверждение удаления
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Вы уверены, что хотите навсегда удалить сотрудника <strong className="text-gray-950 dark:text-white">{deleteConfirmUser.username}</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => executeDeleteUser(deleteConfirmUser.id, deleteConfirmUser.username)}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordChangeUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[#F95700]" /> Изменение пароля
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Введите новый пароль для сотрудника <strong className="text-gray-950 dark:text-white">{passwordChangeUser.username}</strong> (минимум 4 символа):
            </p>
            <div className="relative">
              <input
                type={showPasswordChangeEye ? "text" : "password"}
                value={passwordChangeInput}
                onChange={(e) => setPasswordChangeInput(e.target.value)}
                placeholder="Новый пароль"
                className="w-full pl-3 pr-10 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordChangeEye(!showPasswordChangeEye)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400 focus:outline-none flex items-center justify-center cursor-pointer select-none"
              >
                {showPasswordChangeEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setPasswordChangeUser(null);
                  setPasswordChangeInput('');
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => executePasswordChange(passwordChangeUser.id, passwordChangeUser.username)}
                disabled={passwordChangeInput.trim().length < 4}
                className="px-4 py-2 text-sm font-semibold bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {smtpChangeUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#F95700]" /> SMTP почта для {smtpChangeUser.username}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Настройте индивидуальные параметры SMTP-сервера, чтобы отправлять клиентам документы с этого почтового ящика.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-650 dark:text-zinc-400">SMTP Сервер</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="mail.xn--56-6kctpmeri.xn--p1ai"
                  className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-655 dark:text-zinc-400">SMTP Порт</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="465"
                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                  />
                </div>
                <div className="flex items-center h-full pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-655 dark:text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smtpUseSsl === 1}
                      onChange={(e) => setSmtpUseSsl(e.target.checked ? 1 : 0)}
                      className="rounded border-gray-300 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                    />
                    Использовать SSL
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-655 dark:text-zinc-400">Имя пользователя (Email)</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="admin@xn--56-6kctpmeri.xn--p1ai"
                  className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-655 dark:text-zinc-400">Пароль от почты</label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSmtpChangeUser(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={executeSmtpChange}
                className="px-4 py-2 text-sm font-semibold bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg transition-colors cursor-pointer"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
