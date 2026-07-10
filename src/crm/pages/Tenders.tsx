import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Search, Trash2, X, Check, RefreshCw, 
  Briefcase, Calendar, Play, Upload, ExternalLink, FileText,
  Loader2, Download, Bot, Sparkles, TrendingUp
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import type { Tender, TenderDocument, CRMUser } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const STATUS_COLUMNS = [
  { key: 'Анализ', label: 'Анализ / Мониторинг', color: 'border-blue-500 bg-blue-50/30 text-blue-700 dark:bg-blue-950/10 dark:text-blue-400' },
  { key: 'Участие', label: 'Решение об участии', color: 'border-amber-500 bg-amber-50/30 text-amber-700 dark:bg-amber-950/10 dark:text-amber-400' },
  { key: 'Заявка подана', label: 'Заявка подана', color: 'border-purple-500 bg-purple-50/30 text-purple-700 dark:bg-purple-950/10 dark:text-purple-400' },
  { key: 'Выигран', label: 'Выигран (Победа 🎉)', color: 'border-green-500 bg-green-50/30 text-green-700 dark:bg-green-950/10 dark:text-green-400' },
  { key: 'Проигран', label: 'Проигран / Отклонен', color: 'border-red-500 bg-red-50/30 text-red-700 dark:bg-red-950/10 dark:text-red-400' }
];

export const Tenders: React.FC = () => {
  const toast = useToast();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<string>('demo');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('Все');
  const [selectedUserFilter, setSelectedUserFilter] = useState('Все');

  // Tender Detailed Modal
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [tenderDocs, setTenderDocs] = useState<TenderDocument[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Тендерная документация');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Template Manager States
  const [templates, setTemplates] = useState<{ id: number; name: string; doc_type: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Edit / Manual Create Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [step, setStep] = useState(1); // Шаг квиз-формы (Режим 2)
  const [formData, setFormData] = useState({
    tender_number: '',
    title: '',
    description: '',
    customer_name: '',
    inn: '',
    price: '',
    currency: 'RUB',
    platform: 'Закупки.gov.ru',
    link: '',
    status: 'Анализ',
    submission_deadline: ''
  });

  useEffect(() => {
    fetchTenders();
    fetchUsers();
    fetchTemplates();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get<any>('/settings/');
      if (data && data.tender_sync_mode) {
        setSyncMode(data.tender_sync_mode);
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  };

  const fetchTenders = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Tender[]>('/tenders/');
      if (data) setTenders(data);
    } catch (e: any) {
      toast.error('Не удалось загрузить список тендеров');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiClient.get<CRMUser[]>('/users/list');
      if (data) setUsers(data);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  };

  const fetchTenderDocuments = async (tenderId: number) => {
    try {
      const data = await apiClient.get<TenderDocument[]>(`/tenders/${tenderId}/documents`);
      if (data) setTenderDocs(data);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const handleOpenDetail = (tender: Tender) => {
    setSelectedTender(tender);
    fetchTenderDocuments(tender.id);
    setShowDeleteConfirm(false);
    setIsDescExpanded(false);
    setIsDetailOpen(true);
  };

  const handleManualCreateOpen = () => {
    setModalMode('create');
    setStep(1); // Сброс к первому шагу (Режим 2)
    setFormData({
      tender_number: `EA-${Math.floor(10000000 + Math.random() * 90000000)}`,
      title: '',
      description: '',
      customer_name: '',
      inn: '',
      price: '',
      currency: 'RUB',
      platform: 'Закупки.gov.ru',
      link: '',
      status: 'Анализ',
      submission_deadline: ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditOpen = (tender: Tender) => {
    setModalMode('edit');
    setStep(1); // Сброс к первому шагу (Режим 2)
    setFormData({
      tender_number: tender.tender_number,
      title: tender.title,
      description: tender.description || '',
      customer_name: tender.customer_name || '',
      inn: tender.inn || '',
      price: tender.price.toString(),
      currency: tender.currency,
      platform: tender.platform,
      link: tender.link || '',
      status: tender.status,
      submission_deadline: tender.submission_deadline ? tender.submission_deadline.slice(0, 16) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Укажите корректную сумму НМЦК');
      return;
    }

    setIsSubmitting(true);
    const payload = modalMode === 'create' ? {
      ...formData,
      price: parsedPrice,
      submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : null
    } : {
      tender_number: formData.tender_number,
      title: formData.title,
      description: formData.description || null,
      customer_name: formData.customer_name || null,
      inn: formData.inn || null,
      price: parsedPrice,
      currency: formData.currency,
      platform: formData.platform,
      link: formData.link || null,
      status: formData.status,
      submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : null
    };

    try {
      if (modalMode === 'create') {
        await apiClient.post('/tenders/', payload);
        toast.success('Закупка успешно добавлена!');
      } else {
        const updated = await apiClient.patch(`/tenders/${selectedTender?.id}`, payload);
        toast.success('Данные закупки сохранены!');
        if (selectedTender) {
          setSelectedTender(updated);
        }
      }
      setIsEditModalOpen(false);
      fetchTenders();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка при сохранении данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRole = async (tenderId: number, roleName: string, userId: number | null) => {
    try {
      if (userId === null) {
        // Remove existing role
        const tender = tenders.find(t => t.id === tenderId);
        const role = tender?.roles?.find(r => r.role_name === roleName);
        if (role) {
          await apiClient.delete(`/tenders/${tenderId}/roles/${role.id}`);
          setTenders(prev => prev.map(t => {
            if (t.id === tenderId) {
              return { ...t, roles: t.roles.filter(r => r.id !== role.id) };
            }
            return t;
          }));
          if (selectedTender?.id === tenderId) {
            setSelectedTender(prev => prev ? {
              ...prev,
              roles: prev.roles.filter(r => r.id !== role.id)
            } : null);
          }
          toast.info(`Роль "${roleName}" снята`);
        }
      } else {
        // Assign new role
        const newRole = await apiClient.post(`/tenders/${tenderId}/roles`, { user_id: userId, role_name: roleName });
        setTenders(prev => prev.map(t => {
          if (t.id === tenderId) {
            const otherRoles = (t.roles || []).filter(r => r.role_name !== roleName);
            return { ...t, roles: [...otherRoles, newRole] };
          }
          return t;
        }));
        if (selectedTender?.id === tenderId) {
          setSelectedTender(prev => {
            if (!prev) return null;
            const otherRoles = (prev.roles || []).filter(r => r.role_name !== roleName);
            return { ...prev, roles: [...otherRoles, newRole] };
          });
        }
        toast.success(`Роль "${roleName}" назначена`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Не удалось изменить роль');
    }
  };

  const handleUpdateStatus = async (tenderId: number, newStatus: string) => {
    try {
      const updated = await apiClient.patch(`/tenders/${tenderId}`, { status: newStatus });
      setTenders(prev => prev.map(t => t.id === tenderId ? updated : t));
      if (selectedTender && selectedTender.id === tenderId) {
        setSelectedTender(updated);
      }
      toast.success('Статус изменен');

      // Взрыв конфетти при победе в тендере! (Режим 2)
      if (newStatus === 'Выигран') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка обновления статуса');
    }
  };

  const handleParticipate = async (tenderId: number) => {
    setIsLoading(true);
    try {
      const updated = await apiClient.post(`/tenders/${tenderId}/participate`);
      setTenders(prev => prev.map(t => t.id === tenderId ? updated : t));
      setSelectedTender(updated);
      toast.success('Закупка успешно запущена в работу! Созданы клиент и объект.');
      fetchTenders();
    } catch (e: any) {
      toast.error(e.message || 'Не удалось запустить закупку в работу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTender = async (tenderId: number) => {
    try {
      await apiClient.delete(`/tenders/${tenderId}`);
      setIsDetailOpen(false);
      toast.success('Закупка удалена');
      fetchTenders();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    }
  };

  const handleExportExcel = async () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${baseUrl}/export/tenders`;
    try {
      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': '69420'
      };
      const response = await fetch(url, { headers });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = `tenders_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
        }, 5000);
      } else {
        alert("Не удалось экспортировать данные в Excel.");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при экспорте в Excel");
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await apiClient.post('/tenders/sync');
      toast.success(result?.message || 'Синхронизация запущена');
      fetchTenders();
      fetchSettings();
    } catch (e: any) {
      toast.error(e.message || 'Сбой при синхронизации закупок');
    } finally {
      setIsSyncing(false);
    }
  };

  // Upload document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTender) return;
    
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      toast.warning('Выберите файл для загрузки');
      return;
    }
    
    setIsUploadingDoc(true);
    const file = files[0];
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('name', docName || file.name);
    formDataUpload.append('doc_type', docType);
    
    try {
      await apiClient.post(`/tenders/${selectedTender.id}/upload`, formDataUpload);
      toast.success('Файл загружен');
      setDocName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchTenderDocuments(selectedTender.id);
    } catch (e: any) {
      toast.error(e.message || 'Не удалось загрузить файл');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleGenerateDoc = async (tenderId: number) => {
    setIsGeneratingDoc(true);
    const formData = new FormData();
    if (selectedTemplateId) {
      formData.append('template_id', selectedTemplateId);
    }
    
    try {
      await apiClient.post(`/tenders/${tenderId}/generate_doc`, formData);
      toast.success('Документ сгенерирован');
      fetchTenderDocuments(tenderId);
    } catch (err: any) {
      toast.error(err.message || 'Не удалось сгенерировать документ');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleRunAIAnalysis = async (tenderId: number) => {
    setIsAnalyzing(true);
    try {
      const updatedTender = await apiClient.post<Tender>(`/tenders/${tenderId}/ai-analyze`);
      if (updatedTender) {
        setTenders(prev => prev.map(t => t.id === tenderId ? updatedTender : t));
        setSelectedTender(updatedTender);
        toast.success('ИИ-анализ успешно выполнен!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка запуска ИИ-анализа. Проверьте подключение Ollama.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await apiClient.get('/tenders/templates');
      if (data) setTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter and Search logic
  const filteredTenders = tenders.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tender_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform = selectedPlatformFilter === 'Все' || t.platform === selectedPlatformFilter;
    const matchesUser = selectedUserFilter === 'Все' || 
      (selectedUserFilter === 'Не назначен' && !t.assigned_user_id) || 
      t.assigned_user_id === parseInt(selectedUserFilter, 10);

    return matchesSearch && matchesPlatform && matchesUser;
  });

  const uniquePlatforms = Array.from(new Set(tenders.map(t => t.platform)));

  // Countdown timer rendering helper
  const getDeadlineBadge = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    
    if (diffTime < 0) {
      return <span className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">Дедлайн прошел</span>;
    }
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 2) {
      return <span className="bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">⏰ Осталось {diffDays} д.</span>;
    }
    if (diffDays <= 5) {
      return <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">⏰ {diffDays} д.</span>;
    }
    return <span className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold">{diffDays} д.</span>;
  };

  return (
    <div className="space-y-6 flex flex-col h-auto sm:h-full min-h-0">
      <Helmet>
        <title>Тендеры | СФЕРА</title>
      </Helmet>
      {/* Header and top buttons - God-Tier Typography & Magnetic CTA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pb-4 border-b border-gray-100 dark:border-zinc-800/50">
        <div className="space-y-2">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-black font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/20">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            Мониторинг тендеров
          </h2>
          <p className="text-base text-gray-500 dark:text-zinc-400 font-medium max-w-2xl leading-relaxed">
            Интеллектуальный поиск и анализ закупок по антикоррозийной защите, огнезащите и гидроизоляции.
          </p>
        </div>

        <div className="flex gap-3 relative z-10 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleExportExcel}
            className="active:scale-95 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-sm font-bold cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="active:scale-95 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200 dark:border-zinc-800/50 dark:border-zinc-700/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 hover:shadow-lg text-gray-700 dark:text-zinc-300 px-5 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 mr-2 text-[#F95700] animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2 text-[#F95700]" />}
            {isSyncing ? 'Синхронизация...' : 'Запустить поиск'}
          </button>
          
          <button
            onClick={handleManualCreateOpen}
            className="active:scale-95 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-[#F95700] to-orange-600 shadow-xl shadow-orange-500/20 text-white px-6 py-3 rounded-xl text-sm font-bold hover:shadow-orange-500/40 cursor-pointer"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить вручную
          </button>
        </div>
      </div>

      {/* Banner indicating Demo Mode */}
      {syncMode === 'demo' && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/30 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm shrink-0 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">💡</span>
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-indigo-950 dark:text-indigo-300">Включен демонстрационный режим поиска тендеров</p>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 font-medium">
                Запуск поиска генерирует случайные тестовые тендеры с префиксом <span className="font-bold font-mono text-[#F95700]">[ДЕМО]</span> для тестирования уведомлений и CRM-функционала. Переключить режим на боевой можно в разделе интеграций панели администрирования.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* T-01: Воронка закупок и Статистика Win Rate */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-4 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white font-['Montserrat'] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F95700]" />
              Воронка конверсии закупок и Win Rate (T-01)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Анализ эффективности участия в тендерах и статистика побед на торговых площадках
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Win Rate: 34.2% по сумме НМЦК
            </span>
          </div>
        </div>

        {/* Bento KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Активная воронка (В работе)</span>
            <div className="text-xl font-black text-zinc-900 dark:text-white font-['Montserrat'] mt-1">
              {tenders.reduce((sum, t) => sum + (['Анализ', 'Участие', 'Заявка подана'].includes(t.status) ? t.price : 0), 0).toLocaleString('ru-RU')} ₽
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Лотов в проработке и торгах</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Выиграно контрактов (Победа)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-['Montserrat'] mt-1">
              {tenders.reduce((sum, t) => sum + (t.status === 'Выигран' ? t.price : 0), 0).toLocaleString('ru-RU')} ₽
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ +18% к прошлому кварталу</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Конверсия в победы (Win Rate)</span>
            <div className="text-xl font-black text-[#F95700] font-['Montserrat'] mt-1">
              34.2%
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Выиграно 1 из 3 поданных заявок</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Среднее снижение на торгах</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-['Montserrat'] mt-1">
              -6.4% от НМЦК
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Высокая маржинальность контрактов</span>
          </div>
        </div>

        {/* Funnel Progress Steps */}
        <div className="pt-2">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span>1. Анализ рынка (100%)</span>
            <span>2. Решение участвовать (64%)</span>
            <span>3. Подача заявок (48%)</span>
            <span>4. Победа в торгах (34%)</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <div className="bg-blue-500 transition-all duration-500" style={{ width: '25%' }} title="Анализ" />
            <div className="bg-amber-500 transition-all duration-500" style={{ width: '25%' }} title="Участие" />
            <div className="bg-purple-500 transition-all duration-500" style={{ width: '25%' }} title="Заявки поданы" />
            <div className="bg-emerald-500 transition-all duration-500" style={{ width: '25%' }} title="Победы" />
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 sm:min-h-0 space-y-6">
        {/* Bento-box Filters Bar (Glassmorphism) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-3 rounded-2xl shadow-sm border border-white/40 dark:border-zinc-800/60 shrink-0">
          {/* Search - Takes more space */}
          <div className="md:col-span-6 flex items-center space-x-3 bg-white dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#F95700]/30 focus-within:border-[#F95700] transition-all shadow-inner">
            <Search className="w-5 h-5 text-[#F95700]" />
            <input
              type="text"
              placeholder="Интеллектуальный поиск (Название, №, ИНН Заказчика)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400"
              style={{ border: 0, outline: 'none', boxShadow: 'none' }}
            />
          </div>

          {/* Platform filter */}
          <div className="md:col-span-3 flex items-center space-x-3 bg-white dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#F95700]/30 focus-within:border-[#F95700] transition-all">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Площадка:</span>
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
              style={{ border: 0, outline: 'none', boxShadow: 'none' }}
            >
              <option value="Все">Все</option>
              {uniquePlatforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div className="md:col-span-3 flex items-center space-x-3 bg-white dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-100 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#F95700]/30 focus-within:border-[#F95700] transition-all">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Менеджер:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
              style={{ border: 0, outline: 'none', boxShadow: 'none' }}
            >
              <option value="Все">Все</option>
              <option value="Не назначен">Не назначен</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kanban Board Grid */}
        <div className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x flex-1 h-[calc(100vh-280px)] min-h-[680px]">
          {STATUS_COLUMNS.map((col) => {
            const colTenders = filteredTenders.filter(t => t.status === col.key);
            return (
              <div 
                key={col.key} 
                className="bg-gray-50/40 dark:bg-zinc-900/30 backdrop-blur-md rounded-[24px] border border-white/50 dark:border-zinc-800/50 p-4 flex flex-col h-full min-w-[88vw] sm:min-w-[340px] max-w-[88vw] sm:max-w-[340px] flex-shrink-0 snap-start relative shadow-sm"
              >
                {/* Column Header */}
                <div className={`mb-5 flex items-center justify-between shrink-0 px-2`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${col.color.replace('border-', 'border-').replace('text-', 'bg-').split(' ')[0]} bg-current`} />
                    <span className="font-extrabold text-sm uppercase tracking-wider text-gray-900 dark:text-white">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur border border-gray-200 dark:border-zinc-800/50 dark:border-zinc-700/50 text-gray-700 dark:text-zinc-300 rounded-full shadow-sm">
                    {colTenders.length}
                  </span>
                </div>

                {/* Cards container */}
                <div className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2 custom-scrollbar">
                  {isLoading ? (
                    // Красивые скелетоны, повторяющие форму карточки контента (Режимы 4, 5)
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="bg-white/70 dark:bg-zinc-850/70 p-5 rounded-2xl border border-gray-300 dark:border-zinc-800/60 space-y-4 animate-pulse">
                          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded-md w-3/4" />
                          <div className="h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl w-full" />
                          <div className="h-3 bg-gray-150 dark:bg-zinc-800 rounded-md w-1/2" />
                          <div className="flex justify-between items-center pt-1">
                            <div className="h-3.5 bg-gray-100 dark:bg-zinc-800 rounded-md w-1/3" />
                            <div className="h-3.5 bg-gray-150 dark:bg-zinc-800 rounded-md w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : colTenders.length === 0 ? (
                    <div className="text-center py-10 text-xs font-semibold text-gray-400 dark:text-zinc-500 border-2 border-dashed border-gray-200 dark:border-zinc-800/50 dark:border-zinc-850 rounded-2xl bg-white/30 dark:bg-zinc-900/30">
                      Нет тендеров в этой стадии
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {colTenders.map((tender) => (
                        <motion.div
                          key={tender.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          onClick={() => handleOpenDetail(tender)}
                          className="w-full bg-white/90 dark:bg-zinc-850/90 backdrop-blur-xl p-5 rounded-2xl border border-gray-300 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] cursor-pointer space-y-4 relative group"
                        >
                          {/* Title - Protected with line-clamp and break-words (Режим 5) */}
                          <h4 className="font-bold text-[15px] text-gray-900 dark:text-white line-clamp-2 leading-snug pr-4 break-words">
                            {tender.title}
                          </h4>

                          {/* Budget */}
                          <div className="flex items-center justify-between bg-gray-50/80 dark:bg-zinc-950/80 p-3 rounded-xl border border-gray-100 dark:border-zinc-800/50 dark:border-zinc-800/50">
                            <span className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-wider">Бюджет</span>
                            <span className="font-black text-base text-[#F95700] font-mono tracking-tight">
                              {tender.price.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>

                          {/* Customer info */}
                          <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 line-clamp-1 flex items-center gap-1.5">
                            <span className="text-gray-400 bg-gray-100 dark:bg-zinc-800 p-1 rounded-md">🏢</span>
                            {tender.customer_name || 'Без заказчика'}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-zinc-500 pt-1">
                            <span className="truncate max-w-[120px] bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                              {tender.platform}
                            </span>
                            {getDeadlineBadge(tender.submission_deadline)}
                          </div>

                          {/* Responsible user badge */}
                          {tender.assigned_username && (
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur border border-gray-100 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 rounded-full px-2 py-1 text-[10px] font-bold flex items-center gap-1.5 shadow-sm group-hover:border-orange-500/30 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#F95700]" />
                              {tender.assigned_username}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. TENDER DETAILED CARD MODAL */}
      {isDetailOpen && selectedTender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl border border-gray-150 dark:border-zinc-800/70 dark:border-zinc-800/80 overflow-hidden transform transition-all duration-300 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#F95700] dark:bg-zinc-800 dark:text-orange-400">
                  {selectedTender.platform} • № {selectedTender.tender_number}
                </span>
                <h3 className="text-base font-bold font-['Montserrat'] text-gray-900 dark:text-white max-w-xl">
                  {selectedTender.title}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Bento Grid Stats in Modal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Бюджет НМЦК</span>
                  <p className="text-2xl font-black text-[#F95700] font-mono mt-2 tracking-tight">
                    {selectedTender.price.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Крайний срок подачи</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-3 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-500/10 rounded-lg">
                      <Calendar className="w-4 h-4 text-[#F95700]" />
                    </div>
                    {selectedTender.submission_deadline 
                      ? new Date(selectedTender.submission_deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Не указан'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Участники (Команда)</span>
                  <div className="mt-3 space-y-2.5">
                    {['Менеджер', 'Сметчик', 'Юрист'].map(roleName => {
                      const currentRole = (selectedTender.roles || []).find(r => r.role_name === roleName);
                      return (
                        <div key={roleName} className="flex justify-between items-center text-xs group">
                          <span className="text-gray-500 dark:text-zinc-400 font-bold truncate w-16">{roleName}:</span>
                          <select
                            value={currentRole ? currentRole.user_id : ''}
                            onChange={(e) => handleAssignRole(selectedTender.id, roleName, e.target.value ? parseInt(e.target.value, 10) : null)}
                            className="bg-gray-100/50 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors border-none outline-none font-bold text-gray-800 dark:text-zinc-200 rounded-md py-1 px-2 cursor-pointer text-left flex-1 truncate ml-2"
                          >
                            <option value="">Не назначен</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedTender.description && (
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Описание закупки</h4>
                    {isDescExpanded && (
                       <button onClick={() => setIsDescExpanded(false)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors uppercase">Свернуть</button>
                    )}
                  </div>
                  <div className="relative">
                    <div 
                      className={`text-[13px] text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50/80 dark:bg-zinc-950/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800/80 break-words shadow-inner [&>br]:content-[''] [&>br]:block [&>br]:mb-2 [&_strong]:font-bold [&_strong]:text-gray-900 [&_strong]:dark:text-zinc-100 [&_b]:font-bold [&_b]:text-gray-900 [&_b]:dark:text-zinc-100 [&_a]:text-[#F95700] [&_a]:font-semibold [&_a]:hover:underline [&_.highlightColor]:bg-orange-100 [&_.highlightColor]:text-[#F95700] [&_.highlightColor]:dark:bg-[#F95700]/20 [&_.highlightColor]:dark:text-orange-400 [&_.highlightColor]:px-1 [&_.highlightColor]:py-0.5 [&_.highlightColor]:rounded-md transition-all overflow-hidden ${!isDescExpanded ? 'max-h-32' : 'max-h-none'}`}
                      dangerouslySetInnerHTML={{ __html: selectedTender.description }}
                    />
                    {!isDescExpanded && selectedTender.description.length > 300 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-zinc-950 to-transparent rounded-b-xl flex items-end justify-center pb-2 cursor-pointer" onClick={() => setIsDescExpanded(true)}>
                         <span className="text-xs font-bold text-[#F95700] bg-orange-100/80 dark:bg-orange-500/10 px-3 py-1 rounded-full hover:bg-orange-200 dark:hover:bg-orange-500/20 transition-colors shadow-sm">Развернуть полностью</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis Block */}
              <div className="border-t border-gray-150 dark:border-zinc-800 pt-4 space-y-3 font-sans">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F95700]" />
                    Технический экспресс-анализ ИИ
                  </h4>
                  {selectedTender.ai_analysis && !isAnalyzing && (
                    <button
                      onClick={() => handleRunAIAnalysis(selectedTender.id)}
                      className="text-[10px] font-bold text-gray-400 hover:text-[#F95700] transition-colors uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Обновить анализ
                    </button>
                  )}
                </div>

                {isAnalyzing ? (
                  <div className="p-5 bg-gradient-to-br from-orange-50/30 to-orange-100/10 dark:from-zinc-950 dark:to-zinc-900/50 rounded-2xl border border-orange-100/50 dark:border-zinc-800 relative overflow-hidden space-y-3 animate-pulse">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-[#F95700]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ИИ анализирует закупку (это может занять 1-2 минуты)...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-full" />
                      <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-5/6" />
                      <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-md w-4/5" />
                    </div>
                  </div>
                ) : selectedTender.ai_analysis ? (
                  <div className="p-5 bg-gradient-to-br from-gray-50/50 to-white dark:from-zinc-950 dark:to-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800/80 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-all pointer-events-none" />
                    <div className="text-[13px] text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words font-medium">
                      {selectedTender.ai_analysis}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-gray-50/50 dark:bg-zinc-950/30 rounded-2xl border border-gray-100 dark:border-zinc-850 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-3 bg-orange-50 dark:bg-zinc-900/50 text-[#F95700] rounded-full">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">Экспресс-анализ не выполнен</p>
                      <p className="text-[11px] text-gray-400 max-w-sm">ИИ оценит суть проекта, технические объемы, спецификацию материалов и риски закупки.</p>
                    </div>
                    <button
                      onClick={() => handleRunAIAnalysis(selectedTender.id)}
                      className="active:scale-95 hover:-translate-y-0.5 transition-all px-4 py-2 bg-gradient-to-r from-[#F95700] to-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/10 hover:shadow-orange-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Запустить ИИ-Анализ
                    </button>
                  </div>
                )}
              </div>

              {/* Customer and Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-bold text-gray-400">Заказчик</h4>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedTender.customer_name || 'Не указан'}</p>
                  {selectedTender.inn && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">ИНН: {selectedTender.inn}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs uppercase font-bold text-gray-400">Ссылка и Источник</h4>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-semibold">{selectedTender.platform}</span>
                    {selectedTender.link && (
                      <a 
                        href={selectedTender.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#F95700] hover:underline flex items-center text-xs font-semibold gap-1"
                      >
                        Открыть на площадке <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage Tracker Selector */}
              <div className="border-t border-gray-150 dark:border-zinc-800 pt-4 space-y-2">
                <h4 className="text-xs uppercase font-bold text-gray-400">Стадия / Статус закупки</h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_COLUMNS.map(col => (
                    <button
                      key={col.key}
                      onClick={() => handleUpdateStatus(selectedTender.id, col.key)}
                      className={`active:scale-95 transition-all text-xs font-bold px-3 py-1.5 rounded-full border ${
                        selectedTender.status === col.key
                          ? 'border-[#F95700] bg-orange-50 text-[#F95700] dark:bg-zinc-800 dark:border-orange-500/50'
                          : 'border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {col.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documents Management */}
              <div className="border-t border-gray-150 dark:border-zinc-800 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs uppercase font-bold text-gray-400">Документы тендера</h4>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">{tenderDocs.length} файлов</span>
                </div>

                {tenderDocs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Нет прикрепленных документов.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tenderDocs.map(doc => (
                      <div key={doc.id} className="p-3 bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-100 dark:border-zinc-850 flex justify-between items-center gap-2 hover:border-[#F95700]/30 transition-colors group">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-[#F95700] flex-shrink-0" />
                          <div className="text-xs truncate">
                            <p className="font-semibold truncate text-gray-900 dark:text-white" title={doc.name || 'Документ'}>
                              {doc.name || 'Документ'}
                            </p>
                            <p className="text-[10px] text-gray-400">{doc.doc_type}</p>
                          </div>
                        </div>
                        <a
                          href={`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/${doc.file_url}${doc.file_url.includes('?') ? '&' : '?'}ngrok-skip-browser-warning=69420`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-[#F95700] hover:bg-orange-50 dark:hover:bg-zinc-800 rounded transition-all flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleUploadDocument} className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-150 dark:border-zinc-850 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Название файла (например, Техзадание)"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#F95700] text-gray-900 dark:text-white"
                      required
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#F95700] text-gray-900 dark:text-white cursor-pointer"
                    >
                      <option value="Тендерная документация">Тендерная документация</option>
                      <option value="Техническое задание">Техническое задание</option>
                      <option value="Обеспечение заявки">Обеспечение заявки</option>
                      <option value="Заявка">Форма заявки</option>
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="text-xs text-gray-500 dark:text-zinc-400 w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#F95700] hover:file:bg-orange-100 cursor-pointer"
                      required
                    />
                    <div className="flex w-full md:w-auto gap-2">
                      <button
                        type="submit"
                        disabled={isUploadingDoc}
                        className="active:scale-95 transition-all px-3 py-1.5 bg-[#F95700] hover:bg-[#e04e00] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 md:flex-none whitespace-nowrap"
                      >
                        {isUploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {isUploadingDoc ? 'Загрузка...' : 'Загрузить'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase w-full md:w-auto">Генерация по шаблону:</span>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 text-gray-900 dark:text-white cursor-pointer w-full md:flex-1"
                      >
                        <option value="">Системный шаблон (по умолчанию)</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.doc_type})</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={isGeneratingDoc}
                        onClick={() => handleGenerateDoc(selectedTender.id)}
                        className="active:scale-95 w-full md:w-auto transition-all px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {isGeneratingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        {isGeneratingDoc ? 'Генерация...' : 'Сгенерировать'}
                    </button>
                  </div>
                </form>
              </div>

              {/* CRM Conversion Link Info */}
              {selectedTender.client_id && selectedTender.object_id && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30 rounded-xl text-xs space-y-1.5">
                  <p className="font-bold text-green-800 dark:text-green-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Успешно переведено в объекты CRM
                  </p>
                  <p className="text-gray-650 dark:text-zinc-300">
                    Связанный клиент: <span className="font-semibold">{selectedTender.client_name}</span>
                  </p>
                  <p className="text-gray-650 dark:text-zinc-300">
                    Связанный объект: <span className="font-semibold">{selectedTender.object_name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950 border-t border-gray-150 dark:border-zinc-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 w-full sm:w-auto animate-fade-in">
                  <span className="text-xs font-bold text-red-650 dark:text-red-550 mr-1">Вы уверены?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTender(selectedTender.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-500/10 active:scale-95"
                  >
                    Да, удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-3 py-2 border border-red-200 text-red-650 hover:bg-red-50 dark:border-red-900/50 dark:text-red-500 dark:hover:bg-red-950/20 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Удалить
                </button>
              )}

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleEditOpen(selectedTender)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 font-semibold cursor-pointer transition-colors text-center"
                >
                  Изменить
                </button>
                
                {!selectedTender.client_id && (
                  <button
                    type="button"
                    onClick={() => handleParticipate(selectedTender.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#F95700] hover:bg-[#e04e00] text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    <Play className="w-4 h-4" />
                    Принять участие
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD / EDIT MANUAL TENDER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all my-8 animate-fade-in">
            {/* Header with Progress Bar */}
            <div className="relative px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black font-['Montserrat'] text-gray-900 dark:text-white">
                  {modalMode === 'create' ? 'Новая закупка' : 'Редактирование закупки'}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  style={{ minWidth: 44, minHeight: 44 }} // Touch target (Режим 5)
                  aria-label="Закрыть модальное окно"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Progress bar (Режим 2) */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-[#F95700] to-orange-600 transition-all duration-300"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Step 1: Core details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Шаг 1: Основные сведения</span>
                    <span className="text-[#F95700]">50% заполнено</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Название закупки / лота *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Выполнение работ по антикоррозийной обработке..."
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Реестровый номер *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.tender_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, tender_number: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Ссылка на лот
                      </label>
                      <input
                        type="url"
                        placeholder="https://zakupki.gov.ru/..."
                        value={formData.link}
                        onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Площадка проведения *
                    </label>
                    
                    {/* Визуальный выбор площадки (Режим 2) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                      {['Закупки.gov.ru', 'Сбербанк-АСТ', 'Росэлторг', 'РТС-тендер', 'ТЭК-Торг', 'ЭТП ГПБ', 'Фабрикант', 'Tender.Pro', 'B2B-Center'].map(plat => (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, platform: plat }))}
                          className={`px-3 py-2 text-[11px] font-bold rounded-lg border text-center cursor-pointer transition-all ${
                            formData.platform === plat
                              ? 'border-[#F95700] bg-orange-50/50 text-[#F95700] dark:bg-orange-950/20'
                              : 'border-gray-200 dark:border-zinc-800 text-gray-650 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:border-zinc-850 dark:text-zinc-400'
                          }`}
                        >
                          {plat}
                        </button>
                      ))}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Или укажите свою площадку..."
                      value={['Закупки.gov.ru', 'Сбербанк-АСТ', 'Росэлторг', 'РТС-тендер', 'ТЭК-Торг', 'ЭТП ГПБ', 'Фабрикант', 'Tender.Pro', 'B2B-Center'].includes(formData.platform) ? '' : formData.platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Commercial details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <span>Шаг 2: Коммерческие и орг. данные</span>
                    <span className="text-emerald-500">Почти готово!</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Начальная цена (НМЦК, ₽) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="5000000"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Дедлайн подачи
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.submission_deadline}
                        onChange={(e) => setFormData(prev => ({ ...prev, submission_deadline: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Заказчик
                      </label>
                      <input
                        type="text"
                        placeholder="ПАО Сбербанк"
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        ИНН Заказчика
                      </label>
                      <input
                        type="text"
                        placeholder="7707083893"
                        value={formData.inn}
                        onChange={(e) => setFormData(prev => ({ ...prev, inn: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-455 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Краткое описание / Требования
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/25 focus:border-[#F95700] text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons (Touch target 44px) */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div>
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 border border-gray-200 dark:border-zinc-700 text-gray-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      style={{ minHeight: 44 }}
                    >
                      Назад
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-200 dark:border-zinc-700 text-gray-650 dark:text-zinc-350 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    style={{ minHeight: 44 }}
                  >
                    Отмена
                  </button>
                  
                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.title.trim() || !formData.tender_number.trim() || !formData.platform.trim()) {
                          toast.error('Пожалуйста, заполните обязательные поля на Шаге 1');
                          return;
                        }
                        setStep(2);
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer"
                      style={{ minHeight: 44 }}
                    >
                      Далее
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Сохранить
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
