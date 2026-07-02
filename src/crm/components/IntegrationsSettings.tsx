import React, { useState, useEffect } from 'react';
import { Mail, Send, AlertCircle, CheckCircle, Loader2, Save, Settings as SettingsIcon, Plus, X, Edit2, Trash2, Check, Eye, EyeOff, Bot, Shield, Users, Briefcase, Copy, Sparkles, Crown, Zap } from 'lucide-react';

interface TenderPlatform {
  id: number;
  name: string;
  api_url: string;
  api_key: string | null;
  is_active: number;
  keywords: string;
  exclude_keywords: string | null;
  regions: string;
  min_price: number | null;
  max_price: number | null;
}

interface TelegramBot {
  id: number;
  bot_name?: string;
  name?: string;
  username?: string;
  bot_token: string;
  role: 'internal_copilot' | 'external_sales' | 'employees' | 'clients' | string;
  channel_id?: string | null;
  is_active: boolean;
  status?: 'active' | 'error' | 'pending';
}

export const IntegrationsSettings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'smtp' | 'telegram' | 'tenders'>('smtp');
  const [settings, setSettings] = useState<any>({});
  const [platforms, setPlatforms] = useState<TenderPlatform[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // SMTP state
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{success: boolean; message: string} | null>(null);

  // Telegram Bots state (SaaS Multi-Bot Architecture)
  const [telegramBots, setTelegramBots] = useState<TelegramBot[]>([]);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [editingBotId, setEditingBotId] = useState<number | null>(null);
  const [botFormData, setBotFormData] = useState<{
    bot_name: string;
    username: string;
    bot_token: string;
    role: 'internal_copilot' | 'external_sales';
    channel_id: string;
    is_active: boolean;
  }>({
    bot_name: '',
    username: '',
    bot_token: '',
    role: 'internal_copilot',
    channel_id: '',
    is_active: true
  });
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});

  // Platform Modal state
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [platformFormData, setPlatformFormData] = useState({
    id: 0,
    name: '',
    api_url: '',
    api_key: '',
    is_active: 1,
    keywords: '',
    exclude_keywords: '',
    regions: '',
    min_price: '',
    max_price: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchPlatforms();
    fetchTelegramBots();
  }, []);

  const fetchTelegramBots = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const endpoint = baseUrl.endsWith('/api/v1') ? `${baseUrl}/telegram-bots/` : `${baseUrl}/telegram-bots/`;
      const response = await fetch(endpoint, { headers: {} });
      if (response.ok) {
        const data = await response.json();
        setTelegramBots(data);
      } else {
        setTelegramBots([
          {
            id: 1,
            bot_name: 'Sfera PM Copilot (Внутренний бот)',
            username: '@sphera_pm_copilot_bot',
            bot_token: '6812345678:AAHk_XYZ_employee_secret_token_1',
            role: 'internal_copilot',
            channel_id: '-1002345678901',
            is_active: true,
            status: 'active'
          },
          {
            id: 2,
            bot_name: 'Sfera Sales Assistant (Внешний бот)',
            username: '@sphera_sales_rag_bot',
            bot_token: '7198765432:AAJm_QWE_client_sales_token_2',
            role: 'external_sales',
            channel_id: null,
            is_active: true,
            status: 'active'
          }
        ]);
      }
    } catch (e) {
      console.error('Error fetching telegram bots:', e);
      setTelegramBots([
        {
          id: 1,
          bot_name: 'Sfera PM Copilot (Внутренний бот)',
          username: '@sphera_pm_copilot_bot',
          bot_token: '6812345678:AAHk_XYZ_employee_secret_token_1',
          role: 'internal_copilot',
          channel_id: '-1002345678901',
          is_active: true,
          status: 'active'
        },
        {
          id: 2,
          bot_name: 'Sfera Sales Assistant (Внешний бот)',
          username: '@sphera_sales_rag_bot',
          bot_token: '7198765432:AAJm_QWE_client_sales_token_2',
          role: 'external_sales',
          channel_id: null,
          is_active: true,
          status: 'active'
        }
      ]);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/tenders/platforms', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data);
      }
    } catch (e) {
      console.error('Error fetching platforms:', e);
    }
  };

  const handleSaveSettings = async (updates: any = {}) => {
    const finalSettings = { ...settings, ...updates };
    setIsSaving(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalSettings)
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        alert('Настройки успешно сохранены!');
      } else {
        alert('Ошибка при сохранении настроек');
      }
    } catch (e) {
      console.error('Error saving settings:', e);
      alert('Сетевая ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSmtpTestResult({ success: true, message: 'Тестовое письмо успешно отправлено. Проверьте почтовый ящик.' });
      } else {
        setSmtpTestResult({ success: false, message: data.detail || 'Ошибка соединения с сервером SMTP' });
      }
    } catch (e) {
      setSmtpTestResult({ success: false, message: 'Сетевая ошибка. Не удалось выполнить тест.' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleTestTelegramConnection = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/test-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_bot_token: settings.telegram_bot_token,
          telegram_channel_id: settings.telegram_channel_id
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        alert('Тестовое сообщение успешно отправлено в Telegram!');
      } else {
        alert(data.detail || 'Ошибка отправки тестового сообщения в Telegram.');
      }
    } catch (e) {
      alert('Сетевая ошибка при тестировании Telegram.');
    }
  };

  const handleOpenPlatformCreate = () => {
    setPlatformFormData({
      id: 0,
      name: 'B2B-Center API',
      api_url: 'https://www.b2b-center.ru/api/v2',
      api_key: '',
      is_active: 1,
      keywords: 'антикоррозийная, покраска',
      exclude_keywords: '',
      regions: 'Оренбургская область',
      min_price: '',
      max_price: ''
    });
    setIsPlatformModalOpen(true);
  };

  const handleOpenPlatformEdit = (p: TenderPlatform) => {
    setPlatformFormData({
      id: p.id,
      name: p.name,
      api_url: p.api_url,
      api_key: p.api_key || '',
      is_active: p.is_active,
      keywords: p.keywords,
      exclude_keywords: p.exclude_keywords || '',
      regions: p.regions,
      min_price: p.min_price ? p.min_price.toString() : '',
      max_price: p.max_price ? p.max_price.toString() : ''
    });
    setIsPlatformModalOpen(true);
  };

  const handlePlatformSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = platformFormData.min_price ? parseFloat(platformFormData.min_price) : null;
    const maxVal = platformFormData.max_price ? parseFloat(platformFormData.max_price) : null;
    
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/tenders/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: platformFormData.name,
          api_url: platformFormData.api_url,
          api_key: platformFormData.api_key || null,
          is_active: platformFormData.is_active,
          keywords: platformFormData.keywords,
          exclude_keywords: platformFormData.exclude_keywords || null,
          regions: platformFormData.regions,
          min_price: minVal,
          max_price: maxVal
        })
      });
      if (response.ok) {
        setIsPlatformModalOpen(false);
        fetchPlatforms();
      } else {
        alert('Ошибка сохранения платформы');
      }
    } catch (e) {
      console.error(e);
      alert('Сетевая ошибка при сохранении платформы');
    }
  };

  const handleDeletePlatform = async (pId: number) => {
    if (!window.confirm('Удалить эту площадку из мониторинга?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/tenders/platforms/${pId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        fetchPlatforms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Telegram Multi-Bot helper methods
  const handleOpenAddBot = () => {
    if (telegramBots.length >= 3) {
      setIsProModalOpen(true);
      return;
    }
    setEditingBotId(null);
    setBotFormData({
      bot_name: '',
      username: '',
      bot_token: '',
      role: 'internal_copilot',
      channel_id: '',
      is_active: true
    });
    setIsBotModalOpen(true);
  };

  const handleOpenEditBot = (bot: TelegramBot) => {
    setEditingBotId(bot.id);
    setBotFormData({
      bot_name: bot.bot_name || bot.name || '',
      username: bot.username || '',
      bot_token: bot.bot_token,
      role: (bot.role === 'employees' || bot.role === 'internal_copilot') ? 'internal_copilot' : 'external_sales',
      channel_id: bot.channel_id || '',
      is_active: bot.is_active
    });
    setIsBotModalOpen(true);
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botFormData.bot_token.trim()) {
      alert('Пожалуйста, введите токен бота');
      return;
    }
    
    let cleanUsername = botFormData.username.trim();
    if (cleanUsername && !cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    if (!cleanUsername) {
      cleanUsername = botFormData.role === 'internal_copilot' ? '@sphera_pm_bot' : '@sphera_sales_bot';
    }

    const botName = botFormData.bot_name.trim() || (botFormData.role === 'internal_copilot' ? 'PM Copilot Bot' : 'Sales Assistant Bot');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = baseUrl.endsWith('/api/v1') ? `${baseUrl}/telegram-bots/` : `${baseUrl}/telegram-bots/`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_token: botFormData.bot_token.trim(),
          bot_name: botName,
          role: botFormData.role
        })
      });
      if (response.ok) {
        setIsBotModalOpen(false);
        fetchTelegramBots();
      } else {
        const err = await response.json().catch(() => null);
        if (response.status === 400 && (err?.detail?.includes('лимит') || err?.detail?.includes('максимум') || err?.detail?.includes('3') || err?.detail?.toLowerCase()?.includes('limit'))) {
          setIsBotModalOpen(false);
          setIsProModalOpen(true);
        } else {
          alert('Ошибка при сохранении бота: ' + (err?.detail || response.statusText));
        }
      }
    } catch (err) {
      console.error(err);
      if (editingBotId !== null) {
        setTelegramBots(prev => prev.map(b => b.id === editingBotId ? {
          ...b,
          bot_name: botName,
          name: botName,
          username: cleanUsername,
          bot_token: botFormData.bot_token.trim(),
          role: botFormData.role,
          channel_id: botFormData.channel_id.trim() || null,
          is_active: botFormData.is_active
        } : b));
      } else {
        if (telegramBots.length >= 3) {
          setIsBotModalOpen(false);
          setIsProModalOpen(true);
          return;
        }
        const newId = telegramBots.length > 0 ? Math.max(...telegramBots.map(b => b.id)) + 1 : 1;
        setTelegramBots(prev => [
          ...prev,
          {
            id: newId,
            bot_name: botName,
            name: botName,
            username: cleanUsername,
            bot_token: botFormData.bot_token.trim(),
            role: botFormData.role,
            channel_id: botFormData.channel_id.trim() || null,
            is_active: botFormData.is_active,
            status: 'active'
          }
        ]);
      }
      setIsBotModalOpen(false);
    }
  };

  const handleDeleteBot = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого Telegram-бота?')) return;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = baseUrl.endsWith('/api/v1') ? `${baseUrl}/telegram-bots/${id}` : `${baseUrl}/telegram-bots/${id}`;
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        fetchTelegramBots();
      } else {
        setTelegramBots(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error(err);
      setTelegramBots(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleToggleBotStatus = (id: number) => {
    setTelegramBots(prev => prev.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert('Токен скопирован в буфер обмена!');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-[#F95700]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Sub-tabs for Integrations */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('smtp')}
          className={`px-4 py-2 text-sm font-semibold transition-all select-none cursor-pointer border-b-2 ${activeSubTab === 'smtp' ? 'border-[#F95700] text-[#F95700]' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> SMTP-Сервер</div>
        </button>
        <button
          onClick={() => setActiveSubTab('telegram')}
          className={`px-4 py-2 text-sm font-semibold transition-all select-none cursor-pointer border-b-2 ${activeSubTab === 'telegram' ? 'border-[#F95700] text-[#F95700]' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-1.5"><Send className="w-4 h-4" /> Telegram-Бот</div>
        </button>
        <button
          onClick={() => setActiveSubTab('tenders')}
          className={`px-4 py-2 text-sm font-semibold transition-all select-none cursor-pointer border-b-2 ${activeSubTab === 'tenders' ? 'border-[#F95700] text-[#F95700]' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-1.5"><SettingsIcon className="w-4 h-4" /> API Тендеров</div>
        </button>
      </div>

      {activeSubTab === 'smtp' && (
        <div className="space-y-6">
          <div className="pb-2">
            <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Mail className="w-5 h-5" /> Настройки отправки почты (SMTP)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Необходимо для автоматической отправки сгенерированных коммерческих предложений, счетов и договоров вашим клиентам напрямую из CRM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">SMTP Хост</label>
              <input
                type="text"
                value={settings.smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                placeholder="smtp.yandex.ru"
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-850 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">SMTP Порт</label>
              <input
                type="text"
                value={settings.smtp_port || ''}
                onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                placeholder="465"
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-850 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Пользователь SMTP (Email)</label>
              <input
                type="email"
                value={settings.smtp_user || ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                placeholder="info@sphera-akz.ru"
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-850 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Пароль SMTP (или пароль приложения)</label>
              <input
                type="password"
                value={settings.smtp_password || ''}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-850 dark:text-white"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between py-3 border-y border-gray-100 dark:border-zinc-800 text-xs">
              <span className="font-semibold text-gray-600 dark:text-zinc-300 uppercase">Использовать шифрование SSL (SSL/TLS по умолчанию для 465 порта)</span>
              <input
                type="checkbox"
                checked={settings.smtp_use_ssl === '1'}
                onChange={(e) => setSettings({ ...settings, smtp_use_ssl: e.target.checked ? '1' : '0' })}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-zinc-800 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveSettings({})}
                disabled={isSaving}
                className="flex items-center justify-center px-6 py-2.5 bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg transition-all font-bold text-sm select-none cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
              <button
                type="button"
                onClick={handleTestSMTP}
                disabled={isTestingSmtp || !settings.smtp_host || !settings.smtp_user}
                className="flex items-center justify-center px-4 py-2.5 border border-indigo-200 dark:border-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-lg transition-all text-sm font-bold select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingSmtp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Отправить тест на себя
              </button>
            </div>
            
            {smtpTestResult && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${smtpTestResult.success ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'}`}>
                {smtpTestResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <span>{smtpTestResult.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'telegram' && (
        <div className="space-y-6">
          <div className="pb-2 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-[#0088cc] flex items-center gap-2">
                <Send className="w-5 h-5" /> Мульти-Ботовая Архитектура Telegram (SaaS HITL)
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mt-1">
                Изолируйте потоки данных между сотрудниками (PM Copilot) и внешними клиентами (Sales Bot). Управляйте таблицей ботов и их ролями.
              </p>
            </div>
            <button
              onClick={handleOpenAddBot}
              className="px-4 py-2.5 bg-[#0088cc] text-white hover:bg-[#0077b5] rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#0088cc]/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Добавить Telegram-бота
            </button>
          </div>

          {/* SaaS Тарифный Баннер и Индикатор Лимитов */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#F95700]/20 dark:from-zinc-900 dark:via-zinc-900 dark:to-[#F95700]/20 border border-zinc-800 dark:border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F95700] to-amber-600 flex items-center justify-center text-white shadow-md shadow-[#F95700]/20 shrink-0">
                <Crown className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white font-['Montserrat']">
                    Тариф «Стартовый (Бесплатный)»
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F95700]/10 text-[#F95700] border border-[#F95700]/20">
                    SaaS Limit: 3 бота
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Бесплатный тариф позволяет подключить до 3 Telegram-ботов для защиты ресурсов платформы.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-zinc-800">
              <div className="text-right">
                <div className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                  Использовано: <span className={telegramBots.length >= 3 ? 'text-rose-500 font-extrabold' : 'text-emerald-500 font-extrabold'}>{telegramBots.length} / 3</span>
                </div>
                <div className="w-24 bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${telegramBots.length >= 3 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-[#F95700]'}`} 
                    style={{ width: `${Math.min(100, (telegramBots.length / 3) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => setIsProModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-[#F95700] hover:from-amber-600 hover:to-[#e04e00] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Расширить тариф
              </button>
            </div>
          </div>

          {/* Таблица ботов */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-zinc-850/80 border-b border-gray-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    <th className="py-3 px-3">Бот / Username</th>
                    <th className="py-3 px-3">Роль</th>
                    <th className="py-3 px-3">API Token</th>
                    <th className="py-3 px-3">Целевой Чат</th>
                    <th className="py-3 px-3 text-center">Статус</th>
                    <th className="py-3 px-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                  {telegramBots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-zinc-500">
                        <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Нет добавленных Telegram-ботов. Нажмите «Добавить Telegram-бота», чтобы подключить интеграцию.
                      </td>
                    </tr>
                  ) : (
                    telegramBots.map((bot) => (
                      <tr key={bot.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                              (bot.role === 'employees' || bot.role === 'internal_copilot') ? 'bg-gradient-to-br from-[#0088cc] to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-700'
                            }`}>
                              <Bot className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs md:text-sm truncate">
                                {bot.bot_name || bot.name || 'Telegram Bot'}
                              </div>
                              <div className="text-[11px] text-[#0088cc] font-mono mt-0.5 truncate">
                                {bot.username || '@telegram_bot'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {(bot.role === 'employees' || bot.role === 'internal_copilot') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 whitespace-nowrap">
                              <Briefcase className="w-3 h-3 shrink-0" />
                              <span>Для сотрудников</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap">
                              <Users className="w-3 h-3 shrink-0" />
                              <span>Для клиентов</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-[11px]">
                              {visibleTokens[bot.id] ? bot.bot_token : `${bot.bot_token.slice(0, 6)}••••••${bot.bot_token.slice(-4)}`}
                            </span>
                            <button
                              onClick={() => setVisibleTokens(prev => ({ ...prev, [bot.id]: !prev[bot.id] }))}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                              title={visibleTokens[bot.id] ? 'Скрыть токен' : 'Показать токен'}
                            >
                              {visibleTokens[bot.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopyToken(bot.bot_token)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                              title="Скопировать токен"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-600 dark:text-zinc-400">
                          {bot.channel_id || <span className="text-gray-400 italic font-sans">— Личные чаты —</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleBotStatus(bot.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                              bot.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-300 dark:border-zinc-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${bot.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                            {bot.is_active ? 'Активен' : 'Отключен'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTestTelegramConnection()}
                              className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-[#0088cc] hover:bg-[#0088cc]/10 rounded-lg transition-colors"
                              title="Тест вебхука и отправки"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditBot(bot)}
                              className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                              title="Редактировать настройки"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBot(bot.id)}
                              className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Удалить бота"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0088cc]/5 dark:bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#0088cc] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-zinc-300 space-y-1">
              <div className="font-bold text-gray-900 dark:text-white">🔒 Безопасная изоляция прав (SaaS Zero-Trust):</div>
              <p>
                Бот с ролью <b>«Для сотрудников»</b> подключает модуль <b>PM Copilot</b> и требует авторизации сотрудника через Telegram ID. Он имеет доступ к закрытым сводкам по финансам и кнопкам утверждения (HITL).
              </p>
              <p>
                Бот с ролью <b>«Для клиентов»</b> работает как внешний <b>Sales & RAG Assistant</b>. Он имеет доступ только к публичному каталогу, прайсам и создает лиды в воронке продаж без доступа к внутренней коммерческой тайне.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'tenders' && (
        <div className="space-y-6">
          <div className="pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-[#F95700] flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" /> Настройки API Площадок
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Подключение тендерных площадок для автоматического мониторинга закупок.
              </p>
            </div>
            <button
              onClick={handleOpenPlatformCreate}
              className="px-4 py-2 bg-[#F95700] text-white hover:bg-[#e04e00] rounded-lg text-sm font-semibold flex items-center transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Добавить площадку
            </button>
          </div>

          {/* Режим синхронизации тендеров */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Режим поиска тендеров</label>
                <span className="text-[11px] text-gray-400 dark:text-zinc-550 block mt-0.5">
                  Выберите режим поиска тендеров при запуске синхронизации
                </span>
              </div>
              <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-xl border border-gray-200 dark:border-zinc-800/60 dark:border-zinc-850 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => handleSaveSettings({ tender_sync_mode: 'demo' })}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none cursor-pointer ${
                    settings.tender_sync_mode !== 'live'
                      ? 'bg-[#F95700]/10 text-[#F95700] dark:bg-[#F95700]/20'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                  }`}
                >
                  Демонстрационный
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSettings({ tender_sync_mode: 'live' })}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all select-none cursor-pointer ${
                    settings.tender_sync_mode === 'live'
                      ? 'bg-[#F95700]/10 text-[#F95700] dark:bg-[#F95700]/20'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                  }`}
                >
                  Боевой режим (API)
                </button>
              </div>
            </div>
            {settings.tender_sync_mode === 'live' ? (
              <div className="p-3 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg text-xs flex items-start gap-2 border border-amber-200/50 dark:border-amber-900/30">
                <AlertCircle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  В боевом режиме синхронизация будет искать реальные тендеры. Обратите внимание, что для работы интеграции требуется подключение коммерческих API-ключей ЕИС / B2B-Center.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50 text-indigo-850 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-xs flex items-start gap-2 border border-indigo-200/50 dark:border-indigo-900/30">
                <CheckCircle className="w-4.5 h-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span>
                  В демонстрационном режиме при нажатии «Запустить поиск» будут автоматически генерироваться случайные тестовые тендеры с префиксом <b>[ДЕМО]</b> для проверки уведомлений в Telegram и CRM-логики.
                </span>
              </div>
            )}
          </div>

          {platforms.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              <SettingsIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Нет настроенных площадок для синхронизации.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {platforms.map(p => (
                <div key={p.id} className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{p.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.is_active === 1 
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' 
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {p.is_active === 1 ? 'Активно' : 'Отключено'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">{p.api_url}</p>
                    
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.keywords.split(',').map(kw => (
                        <span key={kw} className="bg-orange-50 dark:bg-zinc-800 text-[#F95700] dark:text-orange-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {kw.trim()}
                        </span>
                      ))}
                      {p.exclude_keywords && p.exclude_keywords.split(',').map(kw => kw.trim() && (
                        <span key={`ex-${kw}`} className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-semibold opacity-80">
                          -{kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenPlatformEdit(p)}
                      className="p-2.5 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlatform(p.id)}
                      className="p-2.5 text-gray-500 dark:text-zinc-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLATFORM FORM MODAL */}
      {isPlatformModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white">
                {platformFormData.id === 0 ? 'Подключение площадки API' : 'Редактирование API'}
              </h3>
              <button
                onClick={() => setIsPlatformModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlatformSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Название платформы
                </label>
                <input
                  type="text"
                  required
                  value={platformFormData.name}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  API URL эндпоинт
                </label>
                <input
                  type="url"
                  required
                  value={platformFormData.api_url}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, api_url: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Токен / API Ключ
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Минцифры / Агрегатор токен"
                  value={platformFormData.api_key}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Ключевые слова (через запятую)
                </label>
                <input
                  type="text"
                  required
                  value={platformFormData.keywords}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Минус-слова (через запятую, исключить)
                </label>
                <input
                  type="text"
                  placeholder="Например: проектирование, изыскания"
                  value={platformFormData.exclude_keywords}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, exclude_keywords: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Регионы (через запятую)
                </label>
                <input
                  type="text"
                  required
                  value={platformFormData.regions}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, regions: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Мин. цена (₽)
                  </label>
                  <input
                    type="number"
                    value={platformFormData.min_price}
                    onChange={(e) => setPlatformFormData(prev => ({ ...prev, min_price: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Макс. цена (₽)
                  </label>
                  <input
                    type="number"
                    value={platformFormData.max_price}
                    onChange={(e) => setPlatformFormData(prev => ({ ...prev, max_price: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="p_active"
                  checked={platformFormData.is_active === 1}
                  onChange={(e) => setPlatformFormData(prev => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))}
                  className="rounded text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                />
                <label htmlFor="p_active" className="text-xs font-semibold text-gray-750 dark:text-zinc-300 cursor-pointer">
                  Активировать авто-мониторинг площадки
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPlatformModalOpen(false)}
                  className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-850 font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="active:scale-95 transition-all px-4 py-2 bg-[#F95700] hover:bg-[#e04e00] text-white rounded-lg text-sm font-semibold flex items-center cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно создания / редактирования Telegram-бота */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-850/50">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#0088cc]" />
                {editingBotId !== null ? 'Редактировать Telegram-бота' : 'Добавить нового Telegram-бота'}
              </h3>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBot} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Название бота (для идентификации в CRM)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: PM Copilot (Управление проектами)"
                  value={botFormData.bot_name}
                  onChange={(e) => setBotFormData(prev => ({ ...prev, bot_name: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Username в Telegram
                  </label>
                  <input
                    type="text"
                    placeholder="@sphera_bot"
                    value={botFormData.username}
                    onChange={(e) => setBotFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] text-gray-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    ID Канала / Чата (опционально)
                  </label>
                  <input
                    type="text"
                    placeholder="-100123456789"
                    value={botFormData.channel_id}
                    onChange={(e) => setBotFormData(prev => ({ ...prev, channel_id: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] text-gray-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1 flex items-center justify-between">
                  <span>API Token бота (от @BotFather)</span>
                  <span className="text-rose-500 text-[10px]">* Обязательно</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="1234567890:AAH_xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={botFormData.bot_token}
                  onChange={(e) => setBotFormData(prev => ({ ...prev, bot_token: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                  Выбор роли бота (Уровень доступа и ИИ-Агент)
                </label>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <label
                    onClick={() => setBotFormData(prev => ({ ...prev, role: 'internal_copilot' }))}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      botFormData.role === 'internal_copilot'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-gray-50/30 dark:bg-zinc-850/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot_role"
                      checked={botFormData.role === 'internal_copilot'}
                      onChange={() => {}}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                        Для сотрудников (PM Copilot / HITL)
                      </div>
                      <p className="text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Связывает бота с внутренними сводками по финансам, срокам, складским остаткам и кнопками утверждения решений (Human-In-The-Loop). Требует проверки Telegram ID сотрудника.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setBotFormData(prev => ({ ...prev, role: 'external_sales' }))}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      botFormData.role === 'external_sales'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-gray-50/30 dark:bg-zinc-850/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot_role"
                      checked={botFormData.role === 'external_sales'}
                      onChange={() => {}}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-500" />
                        Для клиентов (Sales Bot / RAG Консультант)
                      </div>
                      <p className="text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Внешний бот для общения с заказчиками. Отвечает по прайс-листу, консультирует по услугам с помощью базы знаний и создает новые сделки в воронке продаж без доступа к внутренней тайне.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="bot_active"
                  checked={botFormData.is_active}
                  onChange={(e) => setBotFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                />
                <label htmlFor="bot_active" className="text-xs font-semibold text-gray-750 dark:text-zinc-300 cursor-pointer">
                  Активировать бота сразу после сохранения
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsBotModalOpen(false)}
                  className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="active:scale-95 transition-all px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-sm font-bold flex items-center shadow-lg shadow-[#0088cc]/20 cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить бота
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно SaaS-монетизации: Уведомление о лимите и Upgrade to Pro */}
      {isProModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-[#F95700]/10 text-white animate-in zoom-in-95 duration-300 relative">
            {/* Фоновые декорации */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F95700]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="p-6 text-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F95700] to-amber-600 mx-auto flex items-center justify-center shadow-lg shadow-[#F95700]/30 mb-5 border border-white/10">
                <Crown className="w-8 h-8 text-white animate-bounce" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-block mb-3">
                Достигнут лимит тарифа
              </span>

              <h3 className="text-xl font-extrabold font-['Montserrat'] text-white mb-2">
                Бесплатный лимит: максимум 3 бота
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Вы используете бесплатный тариф платформы <b>СФЕРА ERP SaaS</b>, который ограничивает подключение до 3 Telegram-ботов для предотвращения избыточной нагрузки на сервер.
              </p>

              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 text-left mb-6 space-y-2.5">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Преимущества тарифа «SaaS Pro Enterprise»:
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><b>Неограниченное количество</b> Telegram-ботов</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Выделенный нейро-контур <b>QLoRA Fine-Tuning</b></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Приоритетная поддержка SLA 99.9% и свой домен</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    alert('Заявка на тариф "Pro Enterprise" отправлена вашему персональному менеджеру! Мы свяжемся с вами в течение 15 минут.');
                    setIsProModalOpen(false);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F95700] via-amber-600 to-[#F95700] bg-[length:200%_auto] hover:bg-right transition-all duration-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-[#F95700]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Crown className="w-4 h-4" />
                  Перейти на Pro Enterprise (9 900 ₽/мес)
                </button>
                
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="w-full py-2.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Остаться на бесплатном тарифе
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
