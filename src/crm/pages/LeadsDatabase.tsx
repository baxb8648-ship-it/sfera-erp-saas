import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Trash2, Mail, UserPlus, Star,
  Search, X, RefreshCw, Building2, Phone, Globe,
  CheckCircle2, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';

interface Lead {
  id: number;
  task_id: number | null;
  name: string;
  full_name: string | null;
  inn: string | null;
  ogrn: string | null;
  okvad_main: string | null;
  okvad_name: string | null;
  region: string | null;
  address: string | null;
  reg_date: string | null;
  status: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  director: string | null;
  ai_score: number;
  ai_reason: string | null;
  kp_sent: number;
  kp_sent_at: string | null;
  added_to_crm: number;
  source: string | null;
  created_at: string;
}

interface LeadsDatabaseProps {
  taskId: number;
  taskName: string;
  offerContext: string;
  onClose: () => void;
  asPage?: boolean;
}

const AI_SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900';
  if (score >= 5) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900';
  return 'text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
};

export const LeadsDatabase: React.FC<LeadsDatabaseProps> = ({ taskId, taskName, offerContext, onClose, asPage = false }) => {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [kpFilter, setKpFilter] = useState<number | undefined>(undefined);
  const [sendingKP, setSendingKP] = useState<number | null>(null);
  const [addingCRM, setAddingCRM] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { task_id: String(taskId), limit: '200' };
      if (search) params.search = search;
      if (minScore !== undefined) params.min_score = String(minScore);
      if (kpFilter !== undefined) params.kp_sent = String(kpFilter);
      const qs = new URLSearchParams(params).toString();
      const data = await apiClient.get<Lead[]>(`/leads/?${qs}`);
      if (data) {
        setLeads(data);
        setTotal(data.length);
      }
    } catch {
      toast.error('Не удалось загрузить базу лидов');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, search, minScore, kpFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleExportCSV = () => {
    // BUG-001 FIX: использовать порт 8001 (СФЕРА ERP), а не 8000
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/leads/export/csv?task_id=${taskId}`;
    window.open(url, '_blank');
    toast.success('CSV-файл загружается...');
  };

  const handleSendKP = async (lead: Lead) => {
    if (!lead.email) { toast.warning('У этой компании нет email'); return; }
    setSendingKP(lead.id);
    try {
      const res = await apiClient.post<{ message: string }>(`/leads/${lead.id}/send-kp`, {
        offer_context: offerContext,
      });
      toast.success(res?.message || 'КП отправлено!');
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка отправки КП');
    } finally {
      setSendingKP(null);
    }
  };

  const handleAddToCRM = async (lead: Lead) => {
    setAddingCRM(lead.id);
    try {
      const res = await apiClient.post<{ message: string; status: string }>(`/leads/${lead.id}/add-to-crm`, {});
      if (res?.status === 'exists') {
        toast.warning(res.message);
      } else {
        toast.success(res?.message || 'Добавлен в CRM!');
      }
      fetchLeads();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка добавления');
    } finally {
      setAddingCRM(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/leads/${id}`);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('Запись удалена');
    } catch {
      toast.error('Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  const sentCount = leads.filter(l => l.kp_sent).length;
  const crmCount = leads.filter(l => l.added_to_crm).length;
  const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + (l.ai_score || 0), 0) / leads.length) : 0;

  const content = (
    <div className={asPage ? "w-full flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[640px]" : "ml-auto w-full max-w-5xl bg-white dark:bg-zinc-950 flex flex-col h-full shadow-2xl border-l border-gray-200 dark:border-zinc-800"}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black font-['Montserrat'] text-gray-900 dark:text-white">
              База лидов: {taskName}
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              {total} компаний · {sentCount} КП отправлено · {crmCount} в CRM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт CSV
          </button>
          <button
            onClick={fetchLeads}
            className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!asPage && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-gray-100 dark:border-zinc-800/60 shrink-0">
          {[
            { label: 'Всего', value: total, color: 'text-indigo-500' },
            { label: 'Ср. AI-score', value: avgScore + '/10', color: 'text-amber-500' },
            { label: 'КП отправлено', value: sentCount, color: 'text-emerald-500' },
            { label: 'В CRM', value: crmCount, color: 'text-blue-500' },
          ].map(stat => (
            <div key={stat.label} className="text-center p-2 rounded-xl bg-gray-50 dark:bg-zinc-900/50">
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-zinc-400 font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Фильтры */}
        <div className="flex gap-3 px-6 py-3 border-b border-gray-100 dark:border-zinc-800/60 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, ИНН, адресу..."
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          <select
            value={minScore ?? ''}
            onChange={e => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
            className="text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">AI-score: все</option>
            <option value="8">Высокий (8+)</option>
            <option value="5">Средний (5+)</option>
            <option value="3">Низкий (3+)</option>
          </select>
          <select
            value={kpFilter ?? ''}
            onChange={e => setKpFilter(e.target.value !== '' ? Number(e.target.value) : undefined)}
            className="text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            <option value="">КП: все</option>
            <option value="0">Не отправлено</option>
            <option value="1">Отправлено</option>
          </select>
        </div>

        {/* Список лидов */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-400">
              <Building2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-bold">База пуста</p>
              <p className="text-xs mt-1">Запустите спецзадание чтобы наполнить базу</p>
            </div>
          ) : (
            leads.map(lead => (
              <div
                key={lead.id}
                className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Основная строка */}
                <div className="flex items-start gap-4 p-4">
                  {/* AI Score badge */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black ${AI_SCORE_COLOR(lead.ai_score || 0)}`}>
                    {lead.ai_score || 0}
                  </div>

                  {/* Основные данные */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-gray-900 dark:text-white truncate">
                        {lead.name}
                      </span>
                      {lead.status === 'Действующее' || lead.status === 'Active' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          Действующее
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-200 dark:border-red-900">
                          {lead.status}
                        </span>
                      )}
                      {lead.kp_sent ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-500 border border-blue-200 dark:border-blue-900">
                          <CheckCircle2 className="w-2.5 h-2.5" /> КП отправлено
                        </span>
                      ) : null}
                      {lead.added_to_crm ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-500 border border-purple-200 dark:border-purple-900">
                          В CRM
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {lead.inn && (
                        <span className="text-[10px] text-zinc-400 font-semibold">ИНН: <span className="text-zinc-600 dark:text-zinc-300">{lead.inn}</span></span>
                      )}
                      {lead.okvad_main && (
                        <span className="text-[10px] text-zinc-400 font-semibold">ОКВЭД: <span className="text-indigo-500">{lead.okvad_main}</span></span>
                      )}
                      {lead.okvad_name && (
                        <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[260px]">{lead.okvad_name}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold">
                          <Phone className="w-2.5 h-2.5" /> {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold">
                          <Mail className="w-2.5 h-2.5" /> {lead.email}
                        </span>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-600 font-semibold transition-colors">
                          <Globe className="w-2.5 h-2.5" /> Сайт
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
                      title="Подробнее"
                    >
                      {expandedId === lead.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {!lead.kp_sent && lead.email && (
                      <button
                        onClick={() => handleSendKP(lead)}
                        disabled={sendingKP === lead.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        title="Отправить КП"
                      >
                        {sendingKP === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        КП
                      </button>
                    )}

                    {!lead.added_to_crm && (
                      <button
                        onClick={() => handleAddToCRM(lead)}
                        disabled={addingCRM === lead.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        title="Добавить в CRM"
                      >
                        {addingCRM === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                        CRM
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(lead.id)}
                      disabled={deletingId === lead.id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer disabled:opacity-50"
                      title="Удалить"
                    >
                      {deletingId === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Расширенная информация */}
                {expandedId === lead.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-zinc-800/60 pt-3 bg-gray-50/50 dark:bg-zinc-950/50">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {lead.full_name && (
                        <div className="col-span-2">
                          <span className="text-zinc-400 font-bold">Полное наименование:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-0.5">{lead.full_name}</p>
                        </div>
                      )}
                      {lead.address && (
                        <div className="col-span-2">
                          <span className="text-zinc-400 font-bold">Юридический адрес:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-0.5">{lead.address}</p>
                        </div>
                      )}
                      {lead.director && (
                        <div>
                          <span className="text-zinc-400 font-bold">Руководитель:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-0.5">{lead.director}</p>
                        </div>
                      )}
                      {lead.ogrn && (
                        <div>
                          <span className="text-zinc-400 font-bold">ОГРН:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-0.5">{lead.ogrn}</p>
                        </div>
                      )}
                      {lead.reg_date && (
                        <div>
                          <span className="text-zinc-400 font-bold">Дата регистрации:</span>
                          <p className="text-zinc-700 dark:text-zinc-300 font-semibold mt-0.5">{lead.reg_date}</p>
                        </div>
                      )}
                      {lead.ai_reason && (
                        <div className="col-span-2 bg-amber-50/80 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-900/50">
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mb-1">
                            <Star className="w-3 h-3" /> AI-оценка ({lead.ai_score}/10):
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-400 font-medium">{lead.ai_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
    </div>
  );

  if (asPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/50 backdrop-blur-[8px]">
      {content}
    </div>
  );
};
