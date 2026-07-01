import React, { useState, useEffect } from 'react';
import { Mail, Send, AlertCircle, CheckCircle, Loader2, Save, Settings as SettingsIcon, Plus, X, Edit2, Trash2, Check } from 'lucide-react';

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

export const IntegrationsSettings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'smtp' | 'telegram' | 'tenders'>('smtp');
  const [settings, setSettings] = useState<any>({});
  const [platforms, setPlatforms] = useState<TenderPlatform[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // SMTP state
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{success: boolean; message: string} | null>(null);

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
  }, []);

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
          <div className="pb-2">
            <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-[#0088cc] flex items-center gap-2">
              <Send className="w-5 h-5" /> Интеграция с Telegram
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed mt-1">
              Укажите токен вашего Telegram-бота и ID канала или чата. CRM будет отправлять туда автоматические уведомления.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 dark:border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">Токен Telegram-бота (Bot Token)</label>
              <input
                type="text"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full p-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50 bg-white dark:bg-zinc-850 text-sm dark:text-white"
              />
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">Получить токен можно у официального бота @BotFather.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block">ID канала или чата (Channel ID)</label>
              <input
                type="text"
                value={settings.telegram_channel_id || ''}
                onChange={(e) => setSettings({ ...settings, telegram_channel_id: e.target.value })}
                placeholder="-100123456789"
                className="w-full p-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50 bg-white dark:bg-zinc-850 text-sm dark:text-white"
              />
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">ID публичного или приватного канала (должен начинаться с -100). Бот должен быть добавлен в него администратором.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
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
              onClick={handleTestTelegramConnection}
              disabled={isSaving || !settings.telegram_bot_token || !settings.telegram_channel_id}
              className="flex items-center justify-center px-6 py-2.5 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg transition-all font-bold text-sm select-none cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2 text-[#0088cc]" /> Проверить подключение
            </button>
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

    </div>
  );
};
