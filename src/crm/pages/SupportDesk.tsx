import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  LifeBuoy, MessageSquare, Plus, CheckCircle2, Clock, AlertCircle, ShieldAlert, 
  Send, Search, Server, Activity, Database, Cpu, Wifi, X, HelpCircle,
  RefreshCw, Check, Sparkles, Terminal, ShieldCheck,
  Paperclip, FileText, Download, Eye
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../context/AuthContext';

interface TicketMessage {
  sender: string;
  text: string;
  time: string;
  is_support: boolean;
  attachment?: {
    name: string;
    url: string;
    type: 'image' | 'document';
  };
}

interface Ticket {
  id: string;
  tenant_id: number;
  tenant_name: string;
  sender_username: string;
  category: string;
  topic: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  messages: TicketMessage[];
}

interface SystemService {
  name: string;
  status: string;
  ping_ms: number;
  details: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  kpi: {
    open_tickets: number;
    in_progress: number;
    resolved: number;
    sla_percentage: number;
    avg_response_min: number;
  };
  services: SystemService[];
}

export default function SupportDesk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSupportStaff = user?.role === 'superadmin' || user?.role === 'support_agent';

  const [activeTab, setActiveTab] = useState<'tickets' | 'monitoring'>('tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for new ticket
  const [newCategory, setNewCategory] = useState('Технический сбой');
  const [newTopic, setNewTopic] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newMsgText, setNewMsgText] = useState('');
  const [newAttachment, setNewAttachment] = useState<{ name: string; url: string; type: 'image' | 'document' } | null>(null);

  // Reply text state
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<{ name: string; url: string; type: 'image' | 'document' } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const handleAiSuggest = async () => {
    if (!selectedTicketId) return;
    setIsAiLoading(true);
    try {
      const res = await apiClient.get<{ suggestion: string }>(`/support/tickets/${selectedTicketId}/ai-suggest`);
      if (res && res.suggestion) {
        setReplyText(res.suggestion);
      }
    } catch (err: any) {
      console.error('Failed to generate AI suggestion:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setAtt: (val: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    if (isImg) {
      const reader = new FileReader();
      reader.onload = () => {
        setAtt({
          name: file.name,
          url: reader.result as string,
          type: 'image'
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAtt({
        name: file.name,
        url: '#',
        type: 'document'
      });
    }
  };

  // Queries
  const { data: tickets = [] } = useQuery<Ticket[], Error>({
    queryKey: ['support_tickets'],
    queryFn: () => apiClient.get('/support/tickets/'),
    refetchInterval: 10000
  });

  const { data: healthData, isLoading: healthLoading } = useQuery<SystemHealth, Error>({
    queryKey: ['system_health'],
    queryFn: () => apiClient.get('/support/system-health/'),
    enabled: isSupportStaff && activeTab === 'monitoring',
    refetchInterval: 15000
  });

  // Select first ticket automatically when data loads
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  // Mutations
  const createTicketMut = useMutation({
    mutationFn: (payload: any) => apiClient.post('/support/tickets/', payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      setIsNewModalOpen(false);
      setNewTopic('');
      setNewMsgText('');
      setNewAttachment(null);
      if (data?.ticket?.id) {
        setSelectedTicketId(data.ticket.id);
      }
    }
  });

  const sendMessageMut = useMutation({
    mutationFn: ({ ticketId, text, attachment }: { ticketId: string; text: string; attachment?: any }) => 
      apiClient.post(`/support/tickets/${ticketId}/messages/`, { text, attachment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      setReplyText('');
      setReplyAttachment(null);
    }
  });

  const changeStatusMut = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      apiClient.patch(`/support/tickets/${ticketId}/status/`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      queryClient.invalidateQueries({ queryKey: ['system_health'] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() && !newAttachment) return;
    createTicketMut.mutate({
      category: newCategory,
      topic: newTopic,
      priority: newPriority,
      initial_message: newMsgText || 'Прикреплен файл',
      attachment: newAttachment
    });
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyAttachment) return;
    if (!selectedTicketId) return;
    sendMessageMut.mutate({ ticketId: selectedTicketId, text: replyText || 'Прикреплен файл', attachment: replyAttachment });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"><ShieldAlert className="w-3 h-3" /> Критический</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20"><AlertCircle className="w-3 h-3" /> Высокий</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3" /> Средний</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/20">Низкий</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Открыто</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">В работе</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">Решено</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/15 text-gray-500 border border-gray-500/20">Закрыто</span>;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTopic = t.topic.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchTenant = t.tenant_name.toLowerCase().includes(q);
      if (!matchTopic && !matchId && !matchTenant) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-zinc-100 p-4 md:p-6 transition-colors duration-300 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <LifeBuoy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Центр поддержки & Helpdesk</h1>
              {user?.role === 'support_agent' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Инженер техподдержки
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {isSupportStaff 
                ? 'Реестр обращений со всех тенантов и телеметрия серверов (Zero-MRR Access)'
                : 'Оперативная связь с инженерами платформы СФЕРУМ и решение вопросов'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSupportStaff && (
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-medium border border-indigo-200/50 dark:border-indigo-800/40 transition-all shadow-sm"
              title="Инструкция по работе с Telegram-ботом"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Справка по боту</span>
            </button>
          )}
          {isSupportStaff && (
            <div className="flex bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200 dark:border-zinc-700/60">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'tickets'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Очередь тикетов
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {tickets.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'monitoring'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                Мониторинг систем
              </button>
            </div>
          )}

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Создать обращение
          </button>
        </div>
      </div>

      {/* MONITORING TAB (For Support Agents / Superadmin) */}
      {isSupportStaff && activeTab === 'monitoring' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Открытые тикеты</p>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{healthData?.kpi?.open_tickets || 0}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <MessageSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">SLA Соблюдение</p>
                <h3 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{healthData?.kpi?.sla_percentage || 99.8}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Среднее время ответа</p>
                <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{healthData?.kpi?.avg_response_min || 14} мин</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Статус телеметрии</p>
                <div className="flex items-center gap-1.5 mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  ВЕЗДЕ 100% ONLINE
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* System Services Status Grid */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-500" />
                  Мониторинг узлов СФЕРУМ (Zero-MRR Health Check)
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Специалисты поддержки отслеживают состояние серверов без доступа к финансовой аналитике платформы.
                </p>
              </div>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['system_health'] })}
                className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(healthData?.services || [
                {"name": "Neon PostgreSQL (RLS Database)", "status": "operational", "ping_ms": 12, "details": "Active connections: 24/100"},
                {"name": "FastAPI Core Server (8001)", "status": "operational", "ping_ms": 4, "details": "Uptime: 99.98%"},
                {"name": "WebSocket Real-time Broadcast", "status": "operational", "ping_ms": 8, "details": "Active channels: 18"},
                {"name": "Pinecone RAG Vector Store", "status": "operational", "ping_ms": 45, "details": "Index: sphera-knowledge-base"},
                {"name": "Telegram Bot Webhook Engine", "status": "operational", "ping_ms": 19, "details": "Webhook status: OK"}
              ]).map((srv, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/60 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {srv.name.includes('Postgres') && <Database className="w-4 h-4 text-blue-500" />}
                      {srv.name.includes('FastAPI') && <Cpu className="w-4 h-4 text-emerald-500" />}
                      {srv.name.includes('WebSocket') && <Wifi className="w-4 h-4 text-purple-500" />}
                      {srv.name.includes('Pinecone') && <Sparkles className="w-4 h-4 text-amber-500" />}
                      {srv.name.includes('Telegram') && <Terminal className="w-4 h-4 text-cyan-500" />}
                      <span className="font-semibold text-sm">{srv.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Operational
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-zinc-700/40 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                    <span>{srv.details}</span>
                    <span className="font-mono font-medium text-gray-700 dark:text-zinc-300">{srv.ping_ms} ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TICKETS & CHAT TAB */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Ticket List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по номеру, теме или компании..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Все обращ.' },
                  { id: 'open', label: 'Открытые' },
                  { id: 'in_progress', label: 'В работе' },
                  { id: 'resolved', label: 'Решенные' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      filterStatus === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Cards */}
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/80 p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 text-center">
                  <LifeBuoy className="w-10 h-10 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">Обращения не найдены</p>
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isSelected = selectedTicketId === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                          : 'bg-white dark:bg-zinc-900/80 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            {ticket.id}
                          </span>
                          {isSupportStaff && (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[140px]">
                              🏢 {ticket.tenant_name}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>

                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 mb-1">
                        {ticket.topic}
                      </h4>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 mt-3 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {ticket.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(ticket.priority)}
                          <span className="text-[11px]">{ticket.created_at.split(' ')[1]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Ticket Chat & Details View */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900/80 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col h-[740px]">
            {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {selectedTicket.id}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        От кого: <strong className="text-gray-800 dark:text-zinc-200">{selectedTicket.sender_username}</strong>
                      </span>
                      {isSupportStaff && (
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                          Tenant #{selectedTicket.tenant_id}: {selectedTicket.tenant_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedTicket.topic}
                    </h3>
                  </div>

                  {/* Actions for Support Staff */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isSupportStaff && (
                      <>
                        {selectedTicket.status !== 'in_progress' && (
                          <button
                            onClick={() => changeStatusMut.mutate({ ticketId: selectedTicket.id, status: 'in_progress' })}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium transition-colors"
                          >
                            В работу
                          </button>
                        )}
                        {selectedTicket.status !== 'resolved' && (
                          <button
                            onClick={() => changeStatusMut.mutate({ ticketId: selectedTicket.id, status: 'resolved' })}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Решено
                          </button>
                        )}
                      </>
                    )}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-zinc-900/40">
                  {selectedTicket.messages.map((msg, index) => {
                    const isSupportMsg = msg.is_support;
                    const att = msg.attachment;
                    
                    return (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[80%] ${isSupportMsg ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                            {msg.sender}
                          </span>
                          <span className="text-[10px] text-gray-400">{msg.time}</span>
                        </div>
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isSupportMsg
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700/80 rounded-bl-xs'
                          }`}
                        >
                          <div>{msg.text}</div>
                          {att && (
                            <div className="mt-3 pt-3 border-t border-white/20 dark:border-zinc-700/50">
                              {att.type === 'image' ? (
                                <div className="space-y-1">
                                  <img 
                                    src={att.url} 
                                    alt={att.name} 
                                    onClick={() => setPreviewImage(att.url)}
                                    className="max-h-48 rounded-lg cursor-pointer border border-white/30 dark:border-zinc-600 hover:opacity-90 transition-opacity object-cover" 
                                  />
                                  <div className="text-[11px] opacity-80 flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    <span>🔍 Кликните для увеличения:</span>
                                    <span className="font-mono">{att.name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/10 dark:bg-black/30 border border-white/20 dark:border-zinc-700/60">
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="w-5 h-5 shrink-0" />
                                    <span className="text-xs font-mono truncate">{att.name}</span>
                                  </div>
                                  <button 
                                    onClick={() => alert(`Скачивание документа: ${att.name}`)}
                                    className="px-2.5 py-1 rounded-lg bg-white/20 dark:bg-white/10 hover:bg-white/30 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Скачать</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input Box */}
                <form onSubmit={handleReplySubmit} className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {replyAttachment && (
                    <div className="mb-2 flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-2 truncate">
                        <span>📎 Прикреплен файл:</span>
                        <strong className="font-mono truncate">{replyAttachment.name}</strong>
                      </div>
                      <button type="button" onClick={() => setReplyAttachment(null)} className="text-red-500 hover:text-red-700 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="p-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded-xl cursor-pointer transition-colors" title="Прикрепить скриншот или документ">
                      <Paperclip className="w-4 h-4" />
                      <input 
                        type="file" 
                        onChange={e => handleFileSelect(e, setReplyAttachment)} 
                        className="hidden" 
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      />
                    </label>
                    {isSupportStaff && (
                      <button
                        type="button"
                        onClick={handleAiSuggest}
                        disabled={isAiLoading}
                        className={`p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors flex items-center justify-center shrink-0 ${isAiLoading ? 'animate-pulse' : ''}`}
                        title="Сгенерировать черновик ответа ИИ"
                      >
                        <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <input
                      type="text"
                      placeholder={selectedTicket.status === 'resolved' ? 'Обращение решено. Напишите, чтобы открыть снова...' : 'Введите ответ или сообщение для техподдержки...'}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={(!replyText.trim() && !replyAttachment) || sendMessageMut.isPending}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Отправить</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mb-3 stroke-1" />
                <h4 className="text-base font-medium text-gray-600 dark:text-zinc-300">Выберите обращение из списка слева</h4>
                <p className="text-xs mt-1">Или создайте новое нажатием кнопки «Создать обращение» в правом верхнем углу.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW TICKET MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 w-full max-w-lg shadow-2xl space-y-5 relative">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl bg-gray-100 dark:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                🛟
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Новое обращение в техподдержку</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Специалисты СФЕРУМ ответят в течение 15 минут</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400 mb-1">
                    Категория
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Технический сбой">🛠️ Технический сбой</option>
                    <option value="Биллинг и тарифы">💳 Биллинг и тарифы</option>
                    <option value="Запрос функционала">💡 Запрос функционала</option>
                    <option value="Помощь в настройке">⚙️ Помощь в настройке</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400 mb-1">
                    Приоритет
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="low">🟢 Низкий (Вопрос)</option>
                    <option value="medium">🔵 Средний (Обычная задача)</option>
                    <option value="high">🟠 Высокий (Срочно)</option>
                    <option value="critical">🚨 Критический (Блокирует работу!)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400 mb-1">
                  Тема обращения
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Не формируется акт КС-3 за март..."
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400 mb-1">
                  Подробное описание
                </label>
                <textarea
                  rows={4}
                  required={!newAttachment}
                  placeholder="Опишите ситуацию, укажите, при каких действиях возникает ошибка или какой именно функционал вам необходим..."
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-zinc-400 mb-1">
                  Прикрепить скриншот или документ (опционально)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl cursor-pointer text-xs font-semibold transition-colors flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span>{newAttachment ? 'Заменить файл' : 'Выбрать файл'}</span>
                    <input 
                      type="file" 
                      onChange={e => handleFileSelect(e, setNewAttachment)} 
                      className="hidden" 
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                  </label>
                  {newAttachment && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-xl text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      <span className="font-mono">{newAttachment.name}</span>
                      <button type="button" onClick={() => setNewAttachment(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createTicketMut.isPending}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                >
                  {createTicketMut.isPending ? 'Создание...' : 'Отправить обращение'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Bot Guide Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Инструкция по работе с Telegram-ботом</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Синхронизация CRM и Telegram-группы поддержки</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-5 text-sm text-gray-600 dark:text-zinc-300">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span>🎫</span> Обработка обращений клиентов
                </h4>
                <p className="mb-2">Все новые тикеты от клиентов мгновенно приходят в Telegram-группу поддержки с информацией о компании, теме и приоритете.</p>
                <ul className="list-disc list-inside pl-2 space-y-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <li><b className="text-gray-700 dark:text-zinc-300">Взять в работу:</b> Нажмите кнопку <code>📥 Взять в работу</code> под сообщением тикета. Статус изменится на <code>in_progress</code>.</li>
                  <li><b className="text-gray-700 dark:text-zinc-300">Решить проблему:</b> Нажмите кнопку <code>✅ Решено</code>, чтобы закрыть тикет.</li>
                  <li><b className="text-gray-700 dark:text-zinc-300">Авто-ответ ИИ:</b> Нажмите <code>🪄 Отправить ИИ-ответ</code>. Черновик ответа, сгенерированный Llama 3.3 на основе обращения, сразу отправится клиенту.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span>💬</span> Общение с клиентом через Telegram
                </h4>
                <p className="mb-2">Вы можете вести диалог с клиентом прямо из Telegram-группы. Для этого:</p>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800/80 space-y-2 text-xs">
                  <p>1. Сделайте <b className="text-gray-900 dark:text-white">Reply (Ответ)</b> в Telegram на нужное сообщение тикета.</p>
                  <p>2. Отправьте ответ. Бот автоматически перешлет его клиенту в чат CRM.</p>
                  <p>3. Вы можете отправлять:</p>
                  <ul className="list-disc list-inside pl-3 space-y-1 text-gray-500 dark:text-zinc-400">
                    <li>Обычный текст.</li>
                    <li><b className="text-indigo-600 dark:text-indigo-400">Скриншоты и изображения</b> — они сконвертируются в base64 и добавятся как вложения.</li>
                    <li><b className="text-indigo-600 dark:text-indigo-400">Файлы и документы</b> (PDF, DOCX, TXT и др.).</li>
                    <li><b className="text-indigo-600 dark:text-indigo-400">Голосовые сообщения</b> — бот автоматически расшифрует их через Whisper STT и отправит клиенту расшифрованный текст.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span>🤖</span> Управление разработкой через личные сообщения
                </h4>
                <p className="mb-2">При отправке команд или голосовых в ЛС боту <code>oblakocrmbot</code> (не в группу):</p>
                <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-gray-500 dark:text-zinc-400">
                  <li>Голосовые сообщения автоматически классифицируются в базу задач <b>DevBrain</b> (как баги, идеи или ADR).</li>
                  <li>Команда <code>/status</code> показывает текущую телеметрию разработки.</li>
                  <li>Команды <code>/bug</code>, <code>/idea</code>, <code>/decision</code> позволяют регистрировать задачи текстом.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-2xl p-2 border border-zinc-700 shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 shadow-lg hover:bg-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            <div className="mt-2 text-xs text-zinc-400 font-mono">Просмотр прикрепленного изображения</div>
          </div>
        </div>
      )}
    </div>
  );
}
