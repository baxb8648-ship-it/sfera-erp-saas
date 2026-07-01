import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Plus, Trash2, X, Play,
  Target, AlertCircle, Loader2, Edit3, Database,
  Building2, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { LeadsDatabase } from './LeadsDatabase';
import { GodTierModal } from '../components/GodTierModal';

// ─── Справочник регионов РФ ──────────────────────────────────────────────────
const REGIONS: { code: string; name: string }[] = [
  { code: '77', name: 'Москва' }, { code: '78', name: 'Санкт-Петербург' },
  { code: '56', name: 'Оренбургская область' }, { code: '74', name: 'Челябинская область' },
  { code: '66', name: 'Свердловская область' }, { code: '55', name: 'Омская область' },
  { code: '54', name: 'Новосибирская область' }, { code: '63', name: 'Самарская область' },
  { code: '52', name: 'Нижегородская область' }, { code: '61', name: 'Ростовская область' },
  { code: '72', name: 'Тюменская область' }, { code: '59', name: 'Пермский край' },
  { code: '23', name: 'Краснодарский край' }, { code: '16', name: 'Татарстан' },
  { code: '02', name: 'Башкортостан' }, { code: '64', name: 'Саратовская область' },
  { code: '73', name: 'Ульяновская область' }, { code: '58', name: 'Пензенская область' },
  { code: '43', name: 'Кировская область' }, { code: '18', name: 'Удмуртия' },
  { code: '13', name: 'Мордовия' }, { code: '21', name: 'Чувашия' },
  { code: '36', name: 'Воронежская область' }, { code: '48', name: 'Липецкая область' },
  { code: '31', name: 'Белгородская область' }, { code: '46', name: 'Курская область' },
  { code: '68', name: 'Тамбовская область' }, { code: '62', name: 'Рязанская область' },
  { code: '76', name: 'Ярославская область' }, { code: '40', name: 'Калужская область' },
  { code: '71', name: 'Тульская область' }, { code: '67', name: 'Смоленская область' },
  { code: '50', name: 'Московская область' }, { code: '33', name: 'Владимирская область' },
  { code: '37', name: 'Ивановская область' }, { code: '44', name: 'Костромская область' },
  { code: '47', name: 'Ленинградская область' }, { code: '60', name: 'Псковская область' },
  { code: '53', name: 'Новгородская область' }, { code: '35', name: 'Вологодская область' },
  { code: '29', name: 'Архангельская область' }, { code: '51', name: 'Мурманская область' },
  { code: '10', name: 'Карелия' }, { code: '11', name: 'Коми' },
  { code: '83', name: 'Ненецкий АО' }, { code: '86', name: 'Ханты-Мансийский АО' },
  { code: '89', name: 'Ямало-Ненецкий АО' }, { code: '45', name: 'Курганская область' },
  { code: '22', name: 'Алтайский край' }, { code: '42', name: 'Кемеровская область' },
  { code: '70', name: 'Томская область' }, { code: '38', name: 'Иркутская область' },
  { code: '75', name: 'Забайкальский край' }, { code: '03', name: 'Бурятия' },
  { code: '17', name: 'Тыва' }, { code: '19', name: 'Хакасия' },
  { code: '24', name: 'Красноярский край' }, { code: '04', name: 'Алтай (республика)' },
  { code: '14', name: 'Якутия' }, { code: '28', name: 'Амурская область' },
  { code: '65', name: 'Сахалинская область' }, { code: '49', name: 'Магаданская область' },
  { code: '27', name: 'Хабаровский край' }, { code: '25', name: 'Приморский край' },
  { code: '41', name: 'Камчатский край' }, { code: '87', name: 'Чукотский АО' },
  { code: '79', name: 'Еврейская АО' }, { code: '91', name: 'Республика Крым' },
  { code: '92', name: 'Севастополь' },
];

// Популярные ОКВЭД для быстрого выбора
const OKVAD_PRESETS = [
  { code: '43.99', name: 'Прочие спец. строительные работы' },
  { code: '43.91', name: 'Производство кровельных работ' },
  { code: '41.20', name: 'Строительство жилых зданий' },
  { code: '43.34', name: 'Малярные и стекольные работы' },
  { code: '81.22', name: 'Уборка и чистка зданий' },
  { code: '43.21', name: 'Производство электромонтажных работ' },
  { code: '43.31', name: 'Производство штукатурных работ' },
  { code: '43.32', name: 'Столярные и плотничные работы' },
  { code: '43.33', name: 'Облицовочные и напольные работы' },
  { code: '46.73', name: 'Торговля строительными материалами' },
  { code: '71.12', name: 'Инженерно-технические работы' },
  { code: '43.22', name: 'Санитарно-технические работы' },
  { code: '42.11', name: 'Строительство автодорог и шоссе' },
  { code: '35.11', name: 'Производство электроэнергии' },
  { code: '68.20', name: 'Аренда и управление недвижимостью' },
];

export interface SpecialTask {
  id: number;
  name: string;
  keyword: string;
  offer_context: string;
  platform: string;
  search_type?: string;
  is_active: number;
  schedule_interval: string;
  last_run: string | null;
  created_at: string;
  okvad_code?: string;
  region_code?: string;
  search_limit?: number;
  use_ai_filter?: number;
  ai_filter_prompt?: string;
  run_status?: string;
}

const DEFAULT_FORM = {
  name: '',
  keyword: '',
  offer_context: '',
  platform: 'Закупки.gov.ru',
  search_type: 'tenders',
  is_active: 1,
  schedule_interval: 'weekly',
  okvad_code: '',
  region_code: '56',
  search_limit: 20,
  use_ai_filter: 0,
  ai_filter_prompt: '',
};

type FormType = typeof DEFAULT_FORM;

const SEARCH_TYPE_OPTIONS = [
  { value: 'tenders', icon: '🎯', label: 'Тендеры (44/223-ФЗ)' },
  { value: 'organizations', icon: '🌐', label: 'Поиск в интернете (DuckDuckGo)' },
  { value: 'okvad', icon: '🏗️', label: 'База по ОКВЭД (ЕГРЮЛ / api-ФНС)' },
];

export const SpecialTasks: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<SpecialTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<SpecialTask | null>(null);
  const [formData, setFormData] = useState<FormType>(DEFAULT_FORM);
  const [leadsCounts, setLeadsCounts] = useState<Record<number, number>>({});
  const [openLeadsTaskId, setOpenLeadsTaskId] = useState<number | null>(null);
  const [showOkvadPresets, setShowOkvadPresets] = useState(false);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<number | null>(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<SpecialTask[]>('/special-tasks/');
      if (data) {
        setTasks(data);
        // Загружаем количество лидов для ОКВЭД-заданий
        const okvadTasks = data.filter(t => t.search_type === 'okvad');
        const counts: Record<number, number> = {};
        await Promise.all(okvadTasks.map(async (t) => {
          try {
            const res = await apiClient.get<{ count: number }>(`/leads/count?task_id=${t.id}`);
            if (res) counts[t.id] = res.count;
          } catch { counts[t.id] = 0; }
        }));
        setLeadsCounts(counts);
      }
    } catch {
      toast.error('Не удалось загрузить спецзадания');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Polling: если есть задачи в статусе running, обновляем каждые 3 секунды
    const isAnyRunning = tasks.some(t => t.run_status === 'running');
    if (isAnyRunning) {
      const timer = setTimeout(() => {
        fetchTasks();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedTask(null);
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: SpecialTask) => {
    setModalMode('edit');
    setSelectedTask(task);
    setFormData({
      name: task.name,
      keyword: task.keyword,
      offer_context: task.offer_context,
      platform: task.platform,
      search_type: task.search_type || 'tenders',
      is_active: task.is_active,
      schedule_interval: task.schedule_interval,
      okvad_code: task.okvad_code || '',
      region_code: task.region_code || '56',
      search_limit: task.search_limit || 20,
      use_ai_filter: task.use_ai_filter || 0,
      ai_filter_prompt: task.ai_filter_prompt || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.keyword.trim() || !formData.offer_context.trim()) {
      toast.warning('Заполните все обязательные поля');
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiClient.post('/special-tasks/', formData);
        toast.success('Спецзадание создано!');
      } else {
        await apiClient.put(`/special-tasks/${selectedTask?.id}`, formData);
        toast.success('Параметры сохранены!');
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTaskConfirm = async () => {
    if (deleteConfirmTaskId === null) return;
    try {
      await apiClient.delete(`/special-tasks/${deleteConfirmTaskId}`);
      setTasks(prev => prev.filter(t => t.id !== deleteConfirmTaskId));
      toast.success('Спецзадание удалено');
      setDeleteConfirmTaskId(null);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    }
  };

  const handleRunTask = async (taskId: number) => {
    setRunningTaskId(taskId);
    try {
      const res = await apiClient.post<{ message: string }>(`/special-tasks/${taskId}/run`);
      toast.success(res?.message || 'Задание запущено!');
      setTimeout(() => fetchTasks(), 5000);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка запуска');
    } finally {
      setRunningTaskId(null);
    }
  };

  const currentOkvadTask = tasks.find(t => t.id === openLeadsTaskId);

  return (
    <div className="space-y-6 flex flex-col h-auto sm:h-full min-h-0">
      <Helmet><title>Спецзадания (Снайпер-парсер) | СФЕРА</title></Helmet>

      {/* Открытие базы лидов */}
      {openLeadsTaskId && currentOkvadTask && (
        <LeadsDatabase
          taskId={openLeadsTaskId}
          taskName={currentOkvadTask.name}
          offerContext={currentOkvadTask.offer_context}
          onClose={() => { setOpenLeadsTaskId(null); fetchTasks(); }}
        />
      )}

      {/* Header */}
      <div className="pb-6 border-b border-gray-100 dark:border-zinc-800/50 shrink-0">
        <div className="max-w-4xl space-y-4">
          <button
            onClick={() => navigate('/crm/tasks')}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад к задачам
          </button>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-black font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-500/20">
              <Target className="w-7 h-7 text-white" />
            </div>
            Спецзадания (Снайпер-парсер)
          </h2>
          <p className="text-base text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
            Поиск тендеров, организаций по интернету и <span className="text-indigo-500 font-bold">баз ООО/ИП по ОКВЭД из ЕГРЮЛ</span> через api-ФНС.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleOpenCreate}
              className="active:scale-95 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-red-500 to-rose-600 shadow-xl shadow-red-500/20 text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:shadow-red-500/40 cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              Создать спецзадание
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[24px] bg-zinc-50/20 dark:bg-zinc-950/20 max-w-3xl mx-auto p-8">
            <AlertCircle className="w-12 h-12 text-zinc-400/80 mb-3" />
            <span className="text-sm font-bold">Спецзаданий пока нет</span>
            <span className="text-xs text-zinc-400 mt-1 max-w-sm">
              Создайте первое спецзадание — поиск тендеров, организаций или базы ООО по ОКВЭД.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
            {tasks.map((task) => {
              const isOkvad = task.search_type === 'okvad';
              const isOrganizations = task.search_type === 'organizations';
              const leadsCount = leadsCounts[task.id] || 0;

              const typeConfig = isOkvad
                ? { icon: '🏗️', label: 'База по ОКВЭД', color: 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50' }
                : isOrganizations
                ? { icon: '🌐', label: 'Организации (веб)', color: 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50' }
                : { icon: '🎯', label: 'Тендеры', color: 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' };

              return (
                <div
                  key={task.id}
                  className="glass-panel p-6 rounded-[24px] border border-gray-150 dark:border-zinc-800/80 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/0 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black font-['Montserrat'] text-gray-900 dark:text-white leading-tight">
                          {task.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-450 border border-zinc-200/50 dark:border-zinc-700/50">
                            🔑 <span className="text-red-500 font-extrabold">{task.keyword}</span>
                          </span>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeConfig.color}`}>
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                          {isOkvad && task.okvad_code && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                              ОКВЭД: {task.okvad_code}
                            </span>
                          )}
                          {isOkvad && leadsCount > 0 && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                              📋 {leadsCount} компаний в базе
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                          title="Редактировать"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTaskId(task.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-55/20 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 bg-gray-50/50 dark:bg-zinc-950/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800/80 shadow-inner">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                        {isOkvad ? 'Контекст КП / Описание кампании' : 'Контекст КП (Что предлагаем)'}
                      </span>
                      <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed line-clamp-3">
                        {task.offer_context}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div className="text-left text-xs font-semibold text-zinc-450 dark:text-zinc-500 space-y-1">
                      <div>Тип поиска: <span className="font-bold text-zinc-700 dark:text-zinc-350">{typeConfig.icon} {typeConfig.label}</span></div>
                      {isOkvad ? (
                        <>
                          {task.region_code && (
                            <div>Регион: <span className="font-bold text-zinc-700 dark:text-zinc-350">
                              {REGIONS.find(r => r.code === task.region_code)?.name || task.region_code}
                            </span></div>
                          )}
                          <div>Лимит: <span className="font-bold text-zinc-700 dark:text-zinc-350">{task.search_limit || 20} компаний</span></div>
                          <div>AI-фильтр: <span className={`font-bold ${task.use_ai_filter ? 'text-indigo-500' : 'text-zinc-400'}`}>
                            {task.use_ai_filter ? '✓ Включён' : 'Выключен'}
                          </span></div>
                        </>
                      ) : (
                        <>
                          <div>Площадка: <span className="font-bold text-zinc-700 dark:text-zinc-350">{isOrganizations ? 'Интернет (DuckDuckGo)' : task.platform}</span></div>
                          <div>Интервал: <span className="font-bold text-zinc-700 dark:text-zinc-350">{
                            task.schedule_interval === 'daily' ? 'Каждый день' :
                            task.schedule_interval === 'weekly' ? 'Раз в неделю' : 'Вручную'
                          }</span></div>
                        </>
                      )}
                      {task.last_run && (
                        <div className="text-[10px] text-zinc-400">
                          Последний запуск: {new Date(task.last_run).toLocaleDateString('ru-RU')} {new Date(task.last_run).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Кнопка открытия базы лидов (только для ОКВЭД) */}
                      {isOkvad && (
                        <button
                          onClick={() => setOpenLeadsTaskId(task.id)}
                          className="active:scale-95 transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5" />
                          Открыть базу ({leadsCount})
                        </button>
                      )}

                      <button
                        onClick={() => handleRunTask(task.id)}
                        disabled={runningTaskId === task.id || task.run_status === 'running'}
                        className="active:scale-95 transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-500/10 cursor-pointer disabled:opacity-50"
                      >
                        {(runningTaskId === task.id || task.run_status === 'running') ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> {isOkvad ? 'Парсинг...' : 'Поиск...'}</>
                        ) : (
                          <><Play className="w-4 h-4" /> {isOkvad ? 'Запустить парсер' : 'Запустить поиск'}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-150 dark:border-zinc-800/80 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 rounded-t-2xl">
              <h3 className="text-base font-bold font-['Montserrat'] text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Новое спецзадание' : 'Редактировать спецзадание'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Тип поиска — карточки */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">Тип поиска</label>
                <div className="grid grid-cols-3 gap-2">
                  {SEARCH_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, search_type: opt.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        formData.search_type === opt.value
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-lg">{opt.icon}</div>
                      <div className={`text-[10px] font-bold mt-1 ${formData.search_type === opt.value ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Название */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">Название кампании</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.search_type === 'okvad' ? 'Напр. Кровельщики Оренбурга' : 'Напр. Продажа услуг АКЗ строителям'}
                  className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  required
                />
              </div>

              {/* ОКВЭД-специфичные поля */}
              {formData.search_type === 'okvad' && (
                <div className="space-y-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-3.5 h-3.5" />
                    Параметры ОКВЭД-парсера (api-ФНС / ЕГРЮЛ)
                  </div>

                  {/* Ключевое слово для поиска */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">
                      Ключевое слово для поиска компаний *
                    </label>
                    <input
                      type="text"
                      value={formData.keyword}
                      onChange={e => setFormData({ ...formData, keyword: e.target.value })}
                      placeholder="Напр. монтаж, кровля, строительство, отделка"
                      className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                    <p className="text-[10px] text-zinc-400">Будет искать компании, в названии которых есть это слово</p>
                  </div>

                  {/* ОКВЭД-код */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">ОКВЭД-код (для справки / фильтрации)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.okvad_code}
                        onChange={e => setFormData({ ...formData, okvad_code: e.target.value })}
                        onFocus={() => setShowOkvadPresets(true)}
                        placeholder="Напр. 43.99 или 43.91,41.20"
                        className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      {showOkvadPresets && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                          {OKVAD_PRESETS.map(preset => (
                            <button
                              key={preset.code}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, okvad_code: preset.code });
                                setShowOkvadPresets(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-indigo-500">{preset.code}</span>
                              <span className="text-zinc-500 ml-2">{preset.name}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowOkvadPresets(false)}
                            className="w-full text-center py-2 text-[10px] text-zinc-400 hover:text-zinc-600 cursor-pointer border-t border-gray-100 dark:border-zinc-800"
                          >
                            Закрыть
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Регион и лимит */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">Регион РФ</label>
                      <select
                        value={formData.region_code}
                        onChange={e => setFormData({ ...formData, region_code: e.target.value })}
                        className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value="">Все регионы</option>
                        {REGIONS.map(r => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">Лимит компаний</label>
                      <select
                        value={formData.search_limit}
                        onChange={e => setFormData({ ...formData, search_limit: Number(e.target.value) })}
                        className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value={20}>20 компаний</option>
                        <option value={50}>50 компаний</option>
                      </select>
                    </div>
                  </div>

                  {/* AI-фильтр */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">AI-фильтр (Ollama)</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, use_ai_filter: formData.use_ai_filter ? 0 : 1 })}
                        className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${formData.use_ai_filter ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.use_ai_filter ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {formData.use_ai_filter ? (
                      <div className="space-y-1">
                        <textarea
                          value={formData.ai_filter_prompt}
                          onChange={e => setFormData({ ...formData, ai_filter_prompt: e.target.value })}
                          rows={3}
                          placeholder="Опишите идеального клиента для нашего предложения. Напр.: строительные компании, выполняющие отделочные работы, которым нужна АКЗ-покраска и антикоррозийная защита металлоконструкций."
                          className="w-full text-xs font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        />
                        <p className="text-[10px] text-amber-500 font-semibold">⚠ AI-фильтр замедляет парсинг (~5 сек/компанию на CPU)</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-400">Включите чтобы Ollama автоматически отсеивала нерелевантные компании</p>
                    )}
                  </div>
                </div>
              )}

              {/* Ключевое слово — для НЕ-ОКВЭД типов */}
              {formData.search_type !== 'okvad' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">
                      {formData.search_type === 'organizations' ? 'Поисковый запрос (DuckDuckGo)' : 'Ключевое слово тендеров'}
                    </label>
                    <input
                      type="text"
                      value={formData.keyword}
                      onChange={e => setFormData({ ...formData, keyword: e.target.value })}
                      placeholder={formData.search_type === 'organizations' ? 'Школы Оренбургской области' : 'Унипол, антикоррозийная защита'}
                      className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">Интервал автозапуска</label>
                    <select
                      value={formData.schedule_interval}
                      onChange={e => setFormData({ ...formData, schedule_interval: e.target.value })}
                      className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                    >
                      <option value="manual">Только вручную</option>
                      <option value="daily">Каждый день</option>
                      <option value="weekly">Раз в неделю</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Контекст КП */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-550 dark:text-zinc-400">
                  {formData.search_type === 'okvad' ? 'Контекст для генерации КП (Ollama)' : 'Что предлагаем (Контекст для ИИ-оферты)'}
                </label>
                <textarea
                  value={formData.offer_context}
                  onChange={e => setFormData({ ...formData, offer_context: e.target.value })}
                  rows={4}
                  placeholder="Опишите ваш продукт или услугу. ИИ использует это для генерации персонализированных КП каждой найденной компании."
                  className="w-full text-sm font-semibold p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-150 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      <GodTierModal
        isOpen={deleteConfirmTaskId !== null}
        onClose={() => setDeleteConfirmTaskId(null)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2 text-rose-500 uppercase tracking-wider text-sm font-bold">
            <Trash2 className="w-4.5 h-4.5" /> Подтверждение удаления
          </div>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirmTaskId(null)}
              className="px-4 py-2 border border-zinc-250 dark:border-zinc-700 text-xs font-bold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleDeleteTaskConfirm}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
          Удалить спецзадание и всю связанную базу лидов? Это действие нельзя отменить.
        </p>
      </GodTierModal>
    </div>
  );
};
