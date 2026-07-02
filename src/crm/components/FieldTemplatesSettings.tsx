import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Database, 
  Sparkles, 
  Layers, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Type,
  AlignLeft,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface FieldTemplate {
  id: number;
  tenant_id: number;
  entity_type: 'object' | 'client' | 'task';
  object_type?: string | null;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  options?: string[] | null;
  placeholder?: string | null;
  is_required: boolean;
  sort_order: number;
  created_at?: string;
}

export const FieldTemplatesSettings: React.FC = () => {
  const [activeEntity, setActiveEntity] = useState<'object' | 'client'>('object');
  const [selectedObjectType, setSelectedObjectType] = useState<string>('');
  
  const [templates, setTemplates] = useState<FieldTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Состояние формы создания нового поля
  const [fieldLabel, setFieldLabel] = useState<string>('');
  const [fieldKey, setFieldKey] = useState<string>('');
  const [isKeyManual, setIsKeyManual] = useState<boolean>(false);
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea'>('text');
  const [optionsStr, setOptionsStr] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [objectType, setObjectType] = useState<string>('');

  const OBJECT_TYPES = [
    { id: '', label: '🌐 Все отрасли (Общие поля)' },
    { id: 'construction', label: '🏗️ Строительство и АКЗ' },
    { id: 'agro', label: '🌾 Агропромышленность' },
    { id: 'fleet', label: '🚜 Спецтехника и Автопарк' },
    { id: 'furniture', label: '🪚 Мебельное производство' },
  ];

  // Автоматическая генерация системного ключа (field_key) из названия (field_label)
  const generateKey = (label: string): string => {
    const map: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
      'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
      'я': 'ya'
    };
    return label
      .toLowerCase()
      .split('')
      .map(char => map[char] || (/[a-z0-9]/.test(char) ? char : '_'))
      .join('')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30);
  };

  const handleLabelChange = (val: string) => {
    setFieldLabel(val);
    if (!isKeyManual) {
      setFieldKey(generateKey(val));
    }
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { entity_type: activeEntity };
      if (activeEntity === 'object' && selectedObjectType) {
        params.object_type = selectedObjectType;
      }
      const data = await apiClient.get<FieldTemplate[]>('/field-templates/', params);
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Failed to fetch field templates:', err);
      setError(err.message || 'Ошибка при загрузке шаблонов полей');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [activeEntity, selectedObjectType]);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.post('/field-templates/seed-defaults');
      setSuccessMsg('Отраслевые шаблоны успешно загружены в базу данных!');
      await fetchTemplates();
    } catch (err: any) {
      console.error('Seed defaults error:', err);
      setError(err.message || 'Ошибка при загрузке отраслевых шаблонов');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) {
      setError('Пожалуйста, введите название поля');
      return;
    }
    const keyToUse = fieldKey.trim() || generateKey(fieldLabel);
    if (!keyToUse) {
      setError('Ключ поля не может быть пустым');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const optionsArray = fieldType === 'select' && optionsStr.trim()
        ? optionsStr.split(',').map(s => s.trim()).filter(Boolean)
        : null;

      const payload = {
        entity_type: activeEntity,
        object_type: activeEntity === 'object' && objectType ? objectType : null,
        field_key: keyToUse,
        field_label: fieldLabel.trim(),
        field_type: fieldType,
        options: optionsArray,
        placeholder: placeholder.trim() || null,
        is_required: isRequired,
        sort_order: templates.length * 10 + 10
      };

      await apiClient.post('/field-templates/', payload);
      setSuccessMsg(`Поле «${fieldLabel}» успешно создано!`);

      // Сброс формы
      setFieldLabel('');
      setFieldKey('');
      setIsKeyManual(false);
      setOptionsStr('');
      setPlaceholder('');
      setIsRequired(false);
      setObjectType('');

      await fetchTemplates();
    } catch (err: any) {
      console.error('Create template error:', err);
      setError(err.message || 'Ошибка при создании шаблона поля');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: number, label: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить шаблон поля «${label}»?`)) return;

    try {
      await apiClient.delete(`/field-templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSuccessMsg(`Поле «${label}» удалено.`);
    } catch (err: any) {
      console.error('Delete template error:', err);
      setError(err.message || 'Ошибка при удалении шаблона поля');
    }
  };

  const getFieldTypeBadge = (type: string) => {
    switch (type) {
      case 'text':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><Type className="w-3 h-3" /> Текст</span>;
      case 'number':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><Hash className="w-3 h-3" /> Число</span>;
      case 'select':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800"><List className="w-3 h-3" /> Список</span>;
      case 'date':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><Calendar className="w-3 h-3" /> Дата</span>;
      case 'boolean':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"><ToggleLeft className="w-3 h-3" /> Да/Нет</span>;
      case 'textarea':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><AlignLeft className="w-3 h-3" /> Многострочный</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{type}</span>;
    }
  };

  const getObjectTypeBadge = (type?: string | null) => {
    if (!type) return <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">🌐 Общее для всех</span>;
    const found = OBJECT_TYPES.find(t => t.id === type);
    return <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{found ? found.label : type}</span>;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Шапка раздела */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-900/90 dark:via-zinc-800/80 dark:to-zinc-900/90 rounded-2xl text-white shadow-xl border border-zinc-700/50">
        <div>
          <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm tracking-wider uppercase mb-1">
            <Settings2 className="w-4 h-4 animate-spin-slow" />
            <span>Фаза 3.2 • Конструктор полей</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Управление кастомными полями (Project Engine)</h2>
          <p className="text-zinc-300 text-sm mt-1 max-w-2xl">
            Настраивайте индивидуальные свойства для объектов и клиентов без изменения схемы базы данных. 
            Созданные поля динамически появляются в карточках вашей компании.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Загрузить отраслевые шаблоны</span>
          </button>
        </div>
      </div>

      {/* Уведомления об ошибке / успехе */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 animate-slideDown">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold hover:underline">Закрыть</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 animate-slideDown">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs font-semibold hover:underline">Закрыть</button>
        </div>
      )}

      {/* Верхний бар с переключателем сущностей и фильтром отраслей */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800">
          <button
            onClick={() => { setActiveEntity('object'); setSelectedObjectType(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeEntity === 'object'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Поля для Объектов</span>
          </button>
          <button
            onClick={() => { setActiveEntity('client'); setSelectedObjectType(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeEntity === 'client'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Поля для Клиентов</span>
          </button>
        </div>

        {/* Фильтр по типу объекта (только для объектов) */}
        {activeEntity === 'object' && (
          <div className="flex items-center gap-2 px-2 overflow-x-auto">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Отрасль:
            </span>
            <select
              value={selectedObjectType}
              onChange={(e) => setSelectedObjectType(e.target.value)}
              className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm"
            >
              {OBJECT_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Основная сетка: Список полей (левая колонка) и Форма создания (правая колонка) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Левая колонка: Таблица существующих полей */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {activeEntity === 'object' ? 'Свойства объектов' : 'Свойства клиентов'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {templates.length}
              </span>
            </div>
            <button
              onClick={fetchTemplates}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 dark:text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <span className="text-sm">Загрузка структуры полей...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 px-4 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
              <Database className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Для этого раздела пока нет кастомных полей
              </h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                Вы можете добавить собственное поле через форму справа или в 1 клик загрузить готовые отраслевые стандарты.
              </p>
              <button
                onClick={handleSeedDefaults}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-sm shadow-md shadow-orange-500/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Загрузить отраслевые шаблоны</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-3">Название и ключ</th>
                    <th className="py-3 px-3">Тип</th>
                    {activeEntity === 'object' && <th className="py-3 px-3">Отрасль</th>}
                    <th className="py-3 px-3 text-center">Обязательное</th>
                    <th className="py-3 px-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-sm">
                  {templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          {tpl.field_label}
                        </div>
                        <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                          <span>key: {tpl.field_key}</span>
                          {tpl.placeholder && (
                            <span className="italic text-zinc-400">({tpl.placeholder})</span>
                          )}
                        </div>
                        {tpl.options && tpl.options.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {tpl.options.map((opt, idx) => (
                              <span key={idx} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getFieldTypeBadge(tpl.field_type)}
                      </td>
                      {activeEntity === 'object' && (
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {getObjectTypeBadge(tpl.object_type)}
                        </td>
                      )}
                      <td className="py-3.5 px-3 text-center">
                        {tpl.is_required ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" title="Обязательное поле" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" title="Необязательное" />
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.field_label)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-80 group-hover:opacity-100"
                          title="Удалить поле"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Правая колонка: Форма добавления нового поля */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 self-start">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <Plus className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Добавить новое поле
            </h3>
          </div>

          <form onSubmit={handleCreateTemplate} className="space-y-4">
            {/* Отрасль / Тип объекта (только для объектов) */}
            {activeEntity === 'object' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Отрасль / Применение
                </label>
                <select
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {OBJECT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Название поля */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Название поля *
              </label>
              <input
                type="text"
                value={fieldLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Например: Площадь посева (га)"
                required
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Системный ключ (Key) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Системный ключ (JSONB)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsKeyManual(!isKeyManual);
                    if (isKeyManual && fieldLabel) {
                      setFieldKey(generateKey(fieldLabel));
                    }
                  }}
                  className="text-[11px] text-orange-500 hover:underline font-medium"
                >
                  {isKeyManual ? '🔄 Авто-генерация' : '✏️ Вручную'}
                </button>
              </div>
              <input
                type="text"
                value={fieldKey}
                onChange={(e) => {
                  setFieldKey(e.target.value);
                  setIsKeyManual(true);
                }}
                placeholder="ploshad_poseva_ga"
                readOnly={!isKeyManual}
                required
                className={`w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border transition-all ${
                  isKeyManual
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-orange-400 focus:ring-2 focus:ring-orange-500/50'
                    : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/60 cursor-not-allowed'
                }`}
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Уникальный идентификатор поля в базе данных (только латиница, цифры и _).
              </p>
            </div>

            {/* Тип поля */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Тип данных
              </label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as any)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="text">🔤 Строка (Текст)</option>
                <option value="number">🔢 Число</option>
                <option value="select">📑 Выпадающий список (Select)</option>
                <option value="date">📅 Дата</option>
                <option value="boolean">✅ Переключатель (Да/Нет)</option>
                <option value="textarea">📝 Многострочный текст</option>
              </select>
            </div>

            {/* Варианты для списка (если тип === 'select') */}
            {fieldType === 'select' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Варианты выбора * (через запятую)
                </label>
                <textarea
                  value={optionsStr}
                  onChange={(e) => setOptionsStr(e.target.value)}
                  placeholder="Пшеница, Ячмень, Кукуруза, Подсолнечник"
                  required
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Элементы списка, которые пользователь сможет выбрать в карточке.
                </p>
              </div>
            )}

            {/* Подсказка (Placeholder) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Подсказка (Placeholder)
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Например: Введите значение в гектарах..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white text-sm px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Чекбокс обязательности */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200 select-none">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                />
                <span>Обязательное для заполнения</span>
              </label>
            </div>

            {/* Кнопка отправки */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Создать шаблон поля</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
