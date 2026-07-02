import React, { useState, useEffect } from 'react';
import { Save, Upload, Palette, Eye, Check, AlertCircle, RefreshCw } from 'lucide-react';

export const WhiteLabelSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    brand_name: 'СФЕРА ERP',
    brand_color: '#F95700',
    brand_logo_url: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const presets = [
    { name: 'СФЕРА Оранж (По умолчанию)', color: '#F95700' },
    { name: 'Изумрудный Про (Green)', color: '#10B981' },
    { name: 'Королевский Синий (Blue)', color: '#3B82F6' },
    { name: 'Кибер Фиолетовый (Purple)', color: '#8B5CF6' },
    { name: 'Золотой Премиум (Amber)', color: '#F59E0B' },
    { name: 'Стальной Графит (Slate)', color: '#475569' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${baseUrl}/settings/`);
      if (res.ok) {
        const data = await res.json();
        const loaded = {
          brand_name: data.brand_name || 'СФЕРА ERP',
          brand_color: data.brand_color || '#F95700',
          brand_logo_url: data.brand_logo_url || ''
        };
        setSettings(loaded);
        applyBrandColor(loaded.brand_color);
      }
    } catch (err) {
      console.error('Failed to load brand settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyBrandColor = (colorHex: string) => {
    if (!colorHex) return;
    document.documentElement.style.setProperty('--brand-color', colorHex);
    // Дополнительно можно обновить цвет в localStorage для сохранения сессии
    localStorage.setItem('brand_color', colorHex);
  };

  const handleColorChange = (newColor: string) => {
    setSettings((prev: any) => ({ ...prev, brand_color: newColor }));
    applyBrandColor(newColor);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) {
      setSaveStatus({ type: 'error', msg: 'Размер файла логотипа не должен превышать 2 МБ' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSettings((prev: any) => ({ ...prev, brand_logo_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // Load all settings first to merge without overriding
      const resGet = await fetch(`${baseUrl}/settings/`);
      const currentAll = resGet.ok ? await resGet.json() : {};

      const finalSettings = {
        ...currentAll,
        brand_name: settings.brand_name,
        brand_color: settings.brand_color,
        brand_logo_url: settings.brand_logo_url
      };

      const resPost = await fetch(`${baseUrl}/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSettings)
      });

      if (resPost.ok) {
        setSaveStatus({ type: 'success', msg: 'Настройки White-Label успешно сохранены и применены к интерфейсу!' });
        applyBrandColor(settings.brand_color);
        window.dispatchEvent(new CustomEvent('brand_settings_updated', { detail: settings }));
      } else {
        setSaveStatus({ type: 'error', msg: 'Ошибка сохранения на сервере' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Сбой соединения при сохранении' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
        <span>Загрузка параметров брендирования...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-100 font-sans animate-fadeIn">
      {/* Настройки (Левая колонка) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-500" /> Фирменный стиль (White-Label MVP)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Настройте внешний вид платформы под бренд вашей компании: название, логотип и цветовую гамму.
            </p>
          </div>

          {/* Название бренда */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Название бренда CRM
            </label>
            <input
              type="text"
              value={settings.brand_name}
              onChange={e => setSettings({ ...settings, brand_name: e.target.value })}
              placeholder="Например: СФЕРА ERP или МойБренд CRM"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Логотип */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Логотип компании (URL или файл PNG/SVG)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={settings.brand_logo_url}
                onChange={e => setSettings({ ...settings, brand_logo_url: e.target.value })}
                placeholder="https://example.com/logo.png или загрузите файл..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition-colors flex-1 truncate"
              />
              <label className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center gap-2 transition-all shadow-md">
                <Upload size={14} className="text-amber-400" />
                <span>Загрузить файл</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {settings.brand_logo_url && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
                  <img src={settings.brand_logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                </div>
                <span className="text-xs text-slate-400 truncate flex-1">Предпросмотр загруженного логотипа</span>
                <button
                  onClick={() => setSettings({ ...settings, brand_logo_url: '' })}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>

          {/* Акцентный цвет */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Акцентный цвет интерфейса
            </label>
            
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.brand_color}
                onChange={e => handleColorChange(e.target.value)}
                className="w-12 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
              />
              <input
                type="text"
                value={settings.brand_color}
                onChange={e => handleColorChange(e.target.value)}
                placeholder="#F95700"
                className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white uppercase focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-400">Вставьте HEX-код или выберите из пресетов ниже</span>
            </div>

            {/* Палитра пресетов */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {presets.map(preset => (
                <button
                  key={preset.color}
                  onClick={() => handleColorChange(preset.color)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    settings.brand_color === preset.color
                      ? 'bg-slate-800 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-inner"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-xs font-medium text-slate-300 truncate">{preset.name.split(' ')[0]}</span>
                  </div>
                  {settings.brand_color === preset.color && <Check size={14} className="text-amber-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Уведомление о сохранении */}
          {saveStatus && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {saveStatus.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{saveStatus.msg}</span>
            </div>
          )}

          {/* Кнопка сохранения */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: settings.brand_color }}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Сохранить и применить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Предпросмотр (Правая колонка) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" /> Live Предпросмотр интерфейса
            </h4>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Режим реального времени
            </span>
          </div>

          {/* Мокап интерфейса CRM */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-2xl">
            {/* Фейковая шапка */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {settings.brand_logo_url ? (
                  <img src={settings.brand_logo_url} alt="Brand" className="h-6 w-auto object-contain max-w-[80px]" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center font-black text-white text-xs shadow"
                    style={{ backgroundColor: settings.brand_color }}
                  >
                    S
                  </div>
                )}
                <span className="font-extrabold text-white tracking-tight text-sm truncate max-w-[140px]">
                  {settings.brand_name || 'СФЕРА ERP'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-medium">Онлайн</span>
              </div>
            </div>

            {/* Фейковое тело CRM */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Рабочий дашборд</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-sm"
                  style={{ backgroundColor: settings.brand_color }}
                >
                  Pro Tariff
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">Новые сделки</div>
                  <div className="text-lg font-bold text-white mt-0.5">24 шт.</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full w-2/3" style={{ backgroundColor: settings.brand_color }} />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase">Счетчики задач</div>
                  <div className="text-lg font-bold text-white mt-0.5">18 в работе</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="h-full w-4/5" style={{ backgroundColor: settings.brand_color }} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  className="w-full py-2 rounded-lg text-xs font-bold text-white shadow-md transition-transform active:scale-98"
                  style={{ backgroundColor: settings.brand_color }}
                >
                  Тестовая брендированная кнопка
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            💡 При выборе цвета или загрузке логотипа изменения моментально применяются к CSS-переменной <code className="text-amber-400 font-mono">--brand-color</code>. После нажатия кнопки «Сохранить» настройки вступят в силу для всех пользователей вашей компании.
          </p>
        </div>
      </div>
    </div>
  );
};
