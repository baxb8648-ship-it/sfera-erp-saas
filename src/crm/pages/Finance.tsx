import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, Download, TrendingUp, TrendingDown, Plus, Trash2, X, Wallet, ArrowUpRight, ArrowDownRight, Search, Filter, Loader2, Calendar, PieChart } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient, API_BASE_URL } from '../../api/client';
import type { Transaction, Client, ObjectItem } from '../../types';

const downloadDocumentFile = async (docId: number, docName: string) => {
  const url = `${API_BASE_URL}/documents/download/${docId}`;
  try {
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': '69420'
    };
    const impersonated = localStorage.getItem('impersonated_tenant');
    if (impersonated) {
      try {
        const parsed = JSON.parse(impersonated);
        if (parsed?.id) headers['X-Impersonate-Tenant-Id'] = parsed.id.toString();
      } catch (e) {}
    }
    
    const response = await fetch(url, { headers, credentials: 'include' });
    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const contentType = response.headers.get('content-type') || '';
      const isViewable = contentType.includes('application/pdf') || contentType.startsWith('image/');
      
      // Детекция мобильного устройства (включая iPad на iOS 13+)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isViewable && !isMobile) {
        window.open(downloadUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = docName;
        if (disposition && disposition.includes('filename=')) {
          const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        // Если это PDF, проверяем наличие расширения .pdf
        if (contentType.includes('application/pdf') && !filename.toLowerCase().endsWith('.pdf')) {
          filename = filename ? `${filename}.pdf` : `document_${docId}.pdf`;
        }
        
        link.download = filename || `document_${docId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 5000);
    } else {
      alert("Не удалось скачать документ.");
    }
  } catch (e) {
    console.error(e);
    alert("Сетевая ошибка при скачивании");
  }
};

export const Finance: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'finance' | 'documents' | 'pnl'>('finance');
  const [pnlMode, setPnlMode] = useState<'actual' | 'budget'>('actual');
  const [activeCashRegister, setActiveCashRegister] = useState<'works' | 'materials'>('works');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Все');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Transaction Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    transaction_type: 'income',
    amount: '',
    category: 'Оплата от клиента',
    payment_method: 'Безнал с НДС',
    client_id: '',
    object_id: '',
    cash_register: 'works',
    description: ''
  });

  // Document Generator state
  const [docClientId, setDocClientId] = useState('');
  const [docObjectId, setDocObjectId] = useState('');
  const [generatingDocType, setGeneratingDocType] = useState<string | null>(null);

  // Settings & Disclaimer template states
  const [settings, setSettings] = useState<any>({});
  const [invoiceDisclaimer, setInvoiceDisclaimer] = useState('');
  const [facturaDisclaimer, setFacturaDisclaimer] = useState('');
  const [updDisclaimer, setUpdDisclaimer] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeCashRegister, activeTab, searchQuery, filterCategory, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchObjects();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get('/settings/');
      if (data) {
        setSettings(data);
        setInvoiceDisclaimer(data.invoice_disclaimer || '');
        setFacturaDisclaimer(data.factura_disclaimer || '');
        setUpdDisclaimer(data.upd_disclaimer || '');
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const handleSaveDisclaimers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await apiClient.post('/settings/', {
        ...settings,
        invoice_disclaimer: invoiceDisclaimer,
        factura_disclaimer: facturaDisclaimer,
        upd_disclaimer: updDisclaimer
      });
      toast.success('Шаблоны успешно сохранены!');
      await fetchSettings();
    } catch (e: any) {
      toast.error(e.message || 'Не удалось сохранить шаблоны');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Transaction[]>('/finance/');
      if (data) setTransactions(data);
    } catch (e) {
      toast.error('Не удалось загрузить транзакции');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await apiClient.get<Client[]>('/clients/');
      if (data) setClients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchObjects = async () => {
    try {
      const data = await apiClient.get<ObjectItem[]>('/objects/');
      if (data) setObjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  const registerTransactions = transactions.filter(t => (t.cash_register || 'works') === activeCashRegister);

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return registerTransactions.filter(t => {
      const matchesSearch = 
        (t.client_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (t.object_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        t.amount.toString().includes(searchQuery);
      
      const matchesCategory = filterCategory === 'Все' || t.category === filterCategory;
      
      let matchesDate = true;
      const tDate = new Date(t.date).getTime();
      if (dateFrom) {
        matchesDate = matchesDate && tDate >= new Date(dateFrom).setHours(0,0,0,0);
      }
      if (dateTo) {
        matchesDate = matchesDate && tDate <= new Date(dateTo).setHours(23,59,59,999);
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [registerTransactions, searchQuery, filterCategory, dateFrom, dateTo]);

  // Unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = registerTransactions.map(t => t.category);
    return ['Все', ...Array.from(new Set(cats))];
  }, [registerTransactions]);

  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // P&L Динамическая аналитика по статьям доходов и расходов
  const pnlAnalytics = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    let actualIncome = 0;
    let actualExpense = 0;

    transactions.forEach(t => {
      const cat = t.category || 'Прочее';
      const amt = Number(t.amount) || 0;
      if (t.transaction_type === 'income') {
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
        actualIncome += amt;
      } else {
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
        actualExpense += amt;
      }
    });

    const incomeList = Object.entries(incomeByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: actualIncome > 0 ? ((amount / actualIncome) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.amount - a.amount);

    const expenseList = Object.entries(expenseByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: actualExpense > 0 ? ((amount / actualExpense) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.amount - a.amount);

    const actualNetProfit = actualIncome - actualExpense;
    const actualMargin = actualIncome > 0 ? ((actualNetProfit / actualIncome) * 100).toFixed(1) : '0';

    return {
      incomeList,
      expenseList,
      actualIncome,
      actualExpense,
      actualNetProfit,
      actualMargin
    };
  }, [transactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.warning('Нет данных для экспорта');
      return;
    }

    const headers = ['Дата', 'Тип', 'Заказчик', 'Объект', 'Категория', 'Способ оплаты', 'Сумма'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('ru-RU'),
      t.transaction_type === 'income' ? 'Доход' : 'Расход',
      t.client_name || t.description || '-',
      t.object_name || '-',
      t.category,
      t.payment_method,
      t.amount.toString()
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Выписка_${activeCashRegister}_${new Date().toLocaleDateString('ru-RU')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Файл успешно скачан');
  };

  const handleExportExcel = async () => {
    const url = `${API_BASE_URL}/export/finance?cash_register=${activeCashRegister}`;
    try {
      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': '69420'
      };
      const impersonated = localStorage.getItem('impersonated_tenant');
      if (impersonated) {
        try {
          const parsed = JSON.parse(impersonated);
          if (parsed?.id) headers['X-Impersonate-Tenant-Id'] = parsed.id.toString();
        } catch (e) {}
      }
      
      const response = await fetch(url, { headers, credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = `finance_export_${activeCashRegister}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const handleOpenModal = () => {
    setFormData({
      transaction_type: 'income',
      amount: '',
      category: activeCashRegister === 'materials' ? 'Продажа товаров' : 'Оплата от клиента',
      payment_method: 'Безнал с НДС',
      client_id: activeCashRegister === 'materials' ? '' : (clients.length > 0 ? clients[0].id.toString() : ''),
      object_id: '',
      cash_register: activeCashRegister,
      description: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (formData.transaction_type === 'income') {
      const defaultCat = formData.cash_register === 'materials' 
        ? 'Продажа товаров' 
        : 'Оплата от клиента';
      setFormData(prev => ({ ...prev, category: defaultCat }));
    } else {
      setFormData(prev => ({ ...prev, category: 'Закупка материалов' }));
    }
  }, [formData.transaction_type, formData.cash_register]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Сумма должна быть положительным числом');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/finance/', {
        amount: parsedAmount,
        transaction_type: formData.transaction_type,
        category: formData.category,
        payment_method: formData.payment_method,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        object_id: formData.object_id ? parseInt(formData.object_id) : null,
        cash_register: formData.cash_register,
        description: formData.description || null
      });
      setIsModalOpen(false);
      toast.success('Операция добавлена');
      fetchTransactions();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка при сохранении операции');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = (id: number) => {
    setDeleteTransactionId(id);
  };

  const confirmDeleteTransaction = async () => {
    if (deleteTransactionId === null) return;

    try {
      await apiClient.delete(`/finance/${deleteTransactionId}`);
      toast.success('Операция удалена');
      setSelectedIds(prev => prev.filter(item => item !== deleteTransactionId));
      setDeleteTransactionId(null);
      fetchTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка при удалении');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleteModalOpen(false);
    try {
      for (const id of selectedIds) {
        await apiClient.delete(`/finance/${id}`);
      }
      toast.success(`${selectedIds.length} транзакций успешно удалено`);
      setSelectedIds([]);
      fetchTransactions();
    } catch (e: any) {
      console.error(e);
      toast.error("Ошибка при удалении некоторых транзакций");
      fetchTransactions();
    }
  };

  const handleGeneratePDF = async (docType: string) => {
    if (!docClientId) {
      toast.warning('Сначала выберите заказчика');
      return;
    }
    
    setGeneratingDocType(docType);
    try {
      const data = await apiClient.post(`/documents/generate/${docClientId}/${docType}`, null, {
        params: docObjectId ? { object_id: docObjectId } : {}
      });
      
      if (data && data.id) {
        toast.success('Документ сгенерирован');
        downloadDocumentFile(data.id, '');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка генерации документа');
    } finally {
      setGeneratingDocType(null);
    }
  };

  const filteredDocObjects = objects.filter(obj => obj.client_id === parseInt(docClientId));
  const filteredFormObjects = objects.filter(obj => obj.client_id === parseInt(formData.client_id));

  return (
    <div className="flex flex-col space-y-6 pb-4">
      <Helmet>
        <title>Финансы | СФЕРА</title>
      </Helmet>
      
      {/* Header Panel */}
      <div className="glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl shadow-[0_8px_30px_rgba(249,87,0,0.015)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
            Финансовый учет
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Отслеживание движения денежных средств и оформление первичной документации</p>
        </div>
        {activeTab === 'finance' && (
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center px-4 py-2.5 bg-white/50 dark:bg-zinc-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-zinc-650 dark:text-zinc-300 hover:text-[#F95700] dark:hover:text-[#F95700] border border-zinc-250 dark:border-zinc-700 rounded-xl active:scale-95 transition-all select-none cursor-pointer shadow-sm hover:shadow-md text-xs font-bold"
          >
            <Download className="w-4 h-4 mr-2" /> Экспорт в CSV
          </button>
        )}
      </div>

      {/* Statistics Cards Row */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Income card */}
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(16,185,129,0.08)] hover:border-emerald-500/30 transition-all duration-300 group">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-1">Всего Доходов</p>
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-450 font-['Montserrat']">
                +{totalIncome.toLocaleString('ru-RU')} ₽
              </h3>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-500 dark:text-emerald-450 bg-emerald-500/5 dark:bg-emerald-500/10 transition-all duration-300">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Expense card */}
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(239,68,68,0.08)] hover:border-red-500/30 transition-all duration-300 group">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-1">Всего Расходов</p>
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-450 font-['Montserrat']">
                -{totalExpense.toLocaleString('ru-RU')} ₽
              </h3>
            </div>
            <div className="p-3 rounded-xl border border-rose-500/10 dark:border-rose-500/20 text-rose-500 dark:text-rose-450 bg-rose-500/5 dark:bg-rose-500/10 transition-all duration-300">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>

          {/* Balance card */}
          {(() => {
            const isPos = balance >= 0;
            return (
              <div className={`glass-panel p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 group ${isPos ? 'hover:shadow-[0_15px_30px_rgba(59,130,246,0.08)] hover:border-blue-500/30' : 'hover:shadow-[0_15px_30px_rgba(249,87,0,0.08)] hover:border-[#F95700]/30'}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-1">Чистый баланс</p>
                  <h3 className={`text-2xl lg:text-3xl font-black tracking-tight font-['Montserrat'] ${isPos ? 'text-blue-600 dark:text-blue-450' : 'text-orange-600 dark:text-orange-450'}`}>
                    {isPos ? '+' : ''}{balance.toLocaleString('ru-RU')} ₽
                  </h3>
                </div>
                <div className={`p-3 rounded-xl border transition-all duration-300 ${isPos ? 'border-blue-500/10 dark:border-blue-500/20 text-blue-500 dark:text-blue-450 bg-blue-500/5 dark:bg-blue-500/10' : 'border-orange-500/10 dark:border-orange-500/20 text-[#F95700] dark:text-orange-400 bg-orange-500/5 dark:bg-orange-500/10'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Switchers Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex space-x-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm w-fit">
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${activeTab === 'finance' ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
          >
            Транзакции (Доходы / Расходы)
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${activeTab === 'documents' ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
          >
            Генерация Документов
          </button>
          <button 
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'pnl' ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
          >
            <PieChart className="w-3.5 h-3.5" />
            P&L Отчет (ОПиУ) и Бюджет
          </button>
        </div>

        {activeTab === 'finance' && (
          <div className="flex space-x-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm w-fit">
            <button 
              onClick={() => setActiveCashRegister('works')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${activeCashRegister === 'works' ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
            >
              Касса: Работы
            </button>
            <button 
              onClick={() => setActiveCashRegister('materials')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${activeCashRegister === 'materials' ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
            >
              Касса: Товары и материалы
            </button>
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="glass-panel rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-white/20 dark:border-zinc-800/60">
        {activeTab === 'finance' ? (
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-150 uppercase tracking-widest font-['Montserrat']">
                История транзакций ({activeCashRegister === 'works' ? 'Касса: Работы' : 'Касса: Товары и материалы'})
              </h2>
              <div className="flex flex-wrap gap-3">
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 active:scale-95 rounded-xl transition-all duration-200 font-bold select-none cursor-pointer text-xs"
                  >
                    <Trash2 className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">Удалить ({selectedIds.length})</span>
                  </button>
                )}
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all duration-150 font-bold select-none cursor-pointer text-xs"
                >
                  <Download className="w-4 h-4 mr-2" /> Экспорт
                </button>
                <button 
                  onClick={handleOpenModal}
                  className="flex items-center px-4 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all duration-150 font-bold select-none cursor-pointer text-xs"
                >
                  <Plus className="w-4.5 h-4.5 mr-2" /> Добавить операцию
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850">
              <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Поиск по клиенту, объекту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150 focus:ring-0"
                />
              </div>

              <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Filter className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150 cursor-pointer focus:ring-0"
                >
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150"
                />
              </div>

              <div className="flex items-center space-x-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-400 dark:text-zinc-550 text-xs">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs text-zinc-650 dark:text-zinc-300 border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200/50 dark:border-zinc-800 font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredTransactions.map(t => t.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3.5">Дата</th>
                    <th className="px-4 py-3.5">Тип</th>
                    <th className="px-4 py-3.5">Заказчик / Проект</th>
                    <th className="px-4 py-3.5">Категория</th>
                    <th className="px-4 py-3.5">Способ оплаты</th>
                    <th className="px-4 py-3.5 text-right">Сумма</th>
                    <th className="px-4 py-3.5 text-right">Удалить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/60 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-400">
                          <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#F95700]" />
                          Загрузка транзакций...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-zinc-400 dark:text-zinc-550">
                        Транзакции не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-[10px] text-zinc-450 dark:text-zinc-500 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {t.transaction_type === 'income' 
                            ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20"><TrendingUp className="w-3.5 h-3.5 mr-1"/> Доход</span>
                            : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"><TrendingDown className="w-3.5 h-3.5 mr-1"/> Расход</span>
                          }
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{t.client_name || t.description || '—'}</div>
                          <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">{t.object_name || ''}</div>
                        </td>
                        <td className="px-4 py-3.5">{t.category}</td>
                        <td className="px-4 py-3.5 text-xs">{t.payment_method}</td>
                        <td className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${t.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {t.transaction_type === 'income' ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-500/15 rounded-lg active:scale-95 transition-all duration-100 select-none cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4 pb-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#F95700]" />
                  Загрузка транзакций...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 dark:text-zinc-550">
                  Транзакции не найдены
                </div>
              ) : (
                filteredTransactions.map(t => (
                  <div key={t.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, t.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== t.id));
                            }
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                        />
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-550 font-mono">
                          {new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {t.transaction_type === 'income' 
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20"><TrendingUp className="w-3 h-3 mr-1"/> Доход</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20"><TrendingDown className="w-3 h-3 mr-1"/> Расход</span>
                      }
                    </div>

                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight break-words">{t.client_name || t.description || '—'}</h4>
                      {t.object_name && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{t.object_name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-250/30 dark:border-zinc-800/60">
                      <div>
                        <span className="text-zinc-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider block">Категория:</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-250 mt-0.5">{t.category}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider block">Оплата:</span>
                        <p className="font-medium text-zinc-850 dark:text-zinc-300 mt-0.5">{t.payment_method}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-250/30 dark:border-zinc-800/60">
                      <span className={`font-extrabold text-base ${t.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.transaction_type === 'income' ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                      </span>
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-500/15 rounded-lg active:scale-95 transition-all select-none cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        ) : activeTab === 'documents' ? (
          <div className="space-y-8 overflow-y-auto custom-scrollbar font-['Inter']">
            {/* Customer & Object Select */}
            <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">1. Выберите заказчика *</label>
                <select 
                  value={docClientId} 
                  onChange={(e) => {
                    setDocClientId(e.target.value);
                    setDocObjectId(''); // reset object
                  }}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs cursor-pointer font-medium"
                >
                  <option value="">-- Выберите клиента из базы --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">2. Выберите объект (опционально)</label>
                <select 
                  value={docObjectId} 
                  disabled={!docClientId}
                  onChange={(e) => setDocObjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs disabled:opacity-50 cursor-pointer font-medium"
                >
                  <option value="">-- Не выбрано / Сгенерировать без объекта --</option>
                  {filteredDocObjects.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Templates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 text-left">
              {[
                { id: 'kp', title: 'Коммерческое предложение', desc: 'Авто-генерация КП на основе выбранного объекта и расчетов.' },
                { id: 'contract', title: 'Договор подряда', desc: 'Заполнение шаблона договора реквизитами клиента.' },
                { id: 'act', title: 'Акт выполненных работ', desc: 'Формирование закрывающего документа по завершению объекта.' },
                { id: 'ks2', title: 'Акт КС-2', desc: 'Акт о приемке выполненных строительно-монтажных работ.' },
                { id: 'ks3', title: 'Справка КС-3', desc: 'Справка о стоимости выполненных работ и затрат по форме КС-3.' }
              ].map(doc => {
                const isGenerating = generatingDocType === doc.id;
                return (
                  <div key={doc.id} className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 hover:border-[#F95700]/40 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(249,87,0,0.03)] transition-all duration-300 group bg-white/80 dark:bg-zinc-900/30 flex flex-col justify-between">
                    <div>
                      <FileText className="w-8 h-8 text-[#F95700] mb-3" />
                      <h3 className="font-extrabold text-xs uppercase tracking-widest font-['Montserrat'] text-zinc-900 dark:text-zinc-100 mb-2">{doc.title}</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-4 h-12 leading-relaxed">{doc.desc}</p>
                    </div>
                    <button 
                      onClick={() => handleGeneratePDF(doc.id)}
                      disabled={!docClientId || isGenerating}
                      className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-250 dark:border-zinc-750 rounded-xl text-zinc-650 dark:text-zinc-400 group-hover:bg-[#F95700] group-hover:text-white group-hover:border-[#F95700] active:scale-95 transition-all duration-300 select-none cursor-pointer disabled:opacity-50 disabled:group-hover:bg-white dark:bg-zinc-900 disabled:group-hover:text-gray-400 disabled:group-hover:border-gray-200 dark:border-zinc-800 text-xs font-bold"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {isGenerating ? 'Генерация...' : 'Сгенерировать PDF'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Disclaimer template editor */}
            <form onSubmit={handleSaveDisclaimers} className="mt-8 pt-8 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-6 text-left">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-150 font-['Montserrat']">
                  Шаблоны примечаний для финансовых документов
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-405 mt-1 leading-relaxed">
                  Этот текст будет автоматически подгружаться и печататься в нижней части счетов на оплату, счет-фактур и УПД.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">
                    Примечание в Счете на оплату
                  </label>
                  <textarea
                    value={invoiceDisclaimer}
                    onChange={(e) => setInvoiceDisclaimer(e.target.value)}
                    rows={4}
                    placeholder="Введите текст примечания для Счета..."
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">
                    Примечание в Счет-фактуре
                  </label>
                  <textarea
                    value={facturaDisclaimer}
                    onChange={(e) => setFacturaDisclaimer(e.target.value)}
                    rows={4}
                    placeholder="Введите текст примечания для Счет-фактуры..."
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider block">
                    Примечание в УПД
                  </label>
                  <textarea
                    value={updDisclaimer}
                    onChange={(e) => setUpdDisclaimer(e.target.value)}
                    rows={4}
                    placeholder="Введите текст примечания для УПД..."
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white font-bold rounded-xl text-xs hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50 select-none cursor-pointer"
                >
                  {isSavingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSavingSettings ? 'Сохранение...' : 'Сохранить шаблоны'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ================= FN-01: P&L ОТЧЕТ О ПРИБЫЛЯХ И УБЫТКАХ (ОПиУ) И БЮДЖЕТ ================= */
          <div className="space-y-8 font-['Inter'] text-left">
            
            {/* P&L Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-5">
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white font-['Montserrat']">
                  Консолидированный Отчёт о Прибылях и Убытках (ОПиУ)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Сводный финансовый результат по стандарту IFRS / 1С:Предприятие с контролем бюджета
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  <option>Текущий месяц (Июль 2026)</option>
                  <option>III Квартал (Q3 2026)</option>
                  <option>С начала года (YTD 2026)</option>
                </select>
                <button
                  onClick={() => toast.success('P&L Отчёт сформирован и готов к скачиванию в PDF')}
                  className="px-4 py-2 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Экспорт ОПиУ (PDF)
                </button>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-100/80 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
              <div className="flex space-x-1">
                <button
                  onClick={() => setPnlMode('actual')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${pnlMode === 'actual' ? 'bg-[#F95700] text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  📊 Фактический P&L (По статьям проводок СФЕРА ERP)
                </button>
                <button
                  onClick={() => setPnlMode('budget')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${pnlMode === 'budget' ? 'bg-[#F95700] text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                >
                  📋 Консолидированный бюджет (Стандарт IFRS / 1С)
                </button>
              </div>
            </div>

            {pnlMode === 'actual' ? (
              <div className="space-y-6">
                {/* 4 Bento Cards for Actual P&L */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Итого Фактических Доходов</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Montserrat'] mt-1">
                      +{pnlAnalytics.actualIncome.toLocaleString('ru-RU')} ₽
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                      Поступило по всем кассам
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Итого Фактических Расходов</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-450 font-['Montserrat'] mt-1">
                      -{pnlAnalytics.actualExpense.toLocaleString('ru-RU')} ₽
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-1 inline-block">
                      Затраты и платежи
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Чистый результат (EBITDA)</span>
                    <div className={`text-2xl font-black font-['Montserrat'] mt-1 ${pnlAnalytics.actualNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
                      {pnlAnalytics.actualNetProfit >= 0 ? '+' : ''}{pnlAnalytics.actualNetProfit.toLocaleString('ru-RU')} ₽
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-1 inline-block">
                      Сальдо периода
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#F95700]">Фактическая Рентабельность</span>
                    <div className="text-2xl font-black text-[#F95700] font-['Montserrat'] mt-1">
                      {pnlAnalytics.actualMargin}%
                    </div>
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mt-1 inline-block">
                      Доля чистой прибыли
                    </span>
                  </div>
                </div>

                {/* Actual Breakdown Table by Categories */}
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                  <div className="bg-zinc-100 dark:bg-zinc-900 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    <span>Статья движения денежных средств</span>
                    <span>Сумма и доля в структуре</span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {/* Income categories */}
                    <div className="bg-emerald-500/10 px-5 py-2.5 font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex justify-between">
                      <span>I. Поступления по статьям доходов</span>
                      <span>Итого: +{pnlAnalytics.actualIncome.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {pnlAnalytics.incomeList.length === 0 ? (
                      <div className="px-5 py-4 text-zinc-500">Нет записей по доходам за выбранный период</div>
                    ) : (
                      pnlAnalytics.incomeList.map((inc) => (
                        <div key={inc.category} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{inc.category}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(inc.percentage))}%` }} />
                            </div>
                            <span className="text-zinc-500 w-12 text-right">{inc.percentage}%</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 w-32 text-right">
                              +{inc.amount.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Expense categories */}
                    <div className="bg-rose-500/10 px-5 py-2.5 font-extrabold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex justify-between">
                      <span>II. Выплаты по статьям расходов</span>
                      <span>Итого: -{pnlAnalytics.actualExpense.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {pnlAnalytics.expenseList.length === 0 ? (
                      <div className="px-5 py-4 text-zinc-500">Нет записей по расходам за выбранный период</div>
                    ) : (
                      pnlAnalytics.expenseList.map((exp) => (
                        <div key={exp.category} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{exp.category}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(exp.percentage))}%` }} />
                            </div>
                            <span className="text-zinc-500 w-12 text-right">{exp.percentage}%</span>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 w-32 text-right">
                              -{exp.amount.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Net Result Row */}
                    <div className="bg-zinc-100 dark:bg-zinc-900 px-5 py-4 font-black flex justify-between items-center text-sm">
                      <span>ФАКТИЧЕСКИЙ ЧИСТЫЙ РЕЗУЛЬТАТ (ПРИБЫЛЬ / УБЫТОК):</span>
                      <span className={`font-mono text-base ${pnlAnalytics.actualNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {pnlAnalytics.actualNetProfit >= 0 ? '+' : ''}{pnlAnalytics.actualNetProfit.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* P&L Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Выручка от реализации</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Montserrat'] mt-1">
                  8 450 000 ₽
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                  ▲ +14.2% к плану бюджета
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Валовая прибыль (Gross Profit)</span>
                <div className="text-2xl font-black text-zinc-900 dark:text-white font-['Montserrat'] mt-1">
                  5 920 000 ₽
                </div>
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-1 inline-block">
                  Маржинальность: 70.1%
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Операционные расходы (OPEX)</span>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-450 font-['Montserrat'] mt-1">
                  -2 180 000 ₽
                </div>
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-1 inline-block">
                  ФОТ, Аренда, ГСМ, Маркетинг
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">EBITDA / Чистая прибыль</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-['Montserrat'] mt-1">
                  3 740 000 ₽
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                  Рентабельность бизнеса: 44.2%
                </span>
              </div>
            </div>

            {/* P&L Detailed Statement Table */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
              <div className="bg-zinc-100 dark:bg-zinc-900 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <span>Статья финансового отчёта (ОПиУ)</span>
                <span>Сумма за период (₽)</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {/* Section I */}
                <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-5 py-2.5 font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                  I. Доходы от основной деятельности (Выручка)
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Выполнение строительно-монтажных работ (СМР)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+4 200 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Поставка стройматериалов и оборудования</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+2 150 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Аренда спецтехники автопарка (Самосвалы, Краны)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+1 400 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Реализация продукции агрокомплекса (Зерно, МРС)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+700 000 ₽</span>
                </div>

                {/* Section II */}
                <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-5 py-2.5 font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                  II. Себестоимость продаж (COGS)
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Закупка сырья, материалов и комплектующих</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-2 530 000 ₽</span>
                </div>

                {/* Section III */}
                <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-5 py-2.5 font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                  III. Операционные расходы (OPEX)
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Заработная плата сотрудников и налоги ФОТ</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-1 250 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">ГСМ, запчасти и регламентное ТО спецтехники</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-480 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Аренда производственных баз и офисов</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-350 000 ₽</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">SaaS инфраструктура и серверы СФЕРА ERP</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-100 000 ₽</span>
                </div>

                {/* Total EBITDA */}
                <div className="bg-emerald-500/10 px-5 py-4 flex justify-between items-center font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Итоговая Чистая Прибыль (EBITDA) за период</span>
                  <span className="text-base">+3 740 000 ₽</span>
                </div>
              </div>
            </div>

            {/* Budget Execution Section (План-Факт Анализ) */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    План-Факт анализ исполнения бюджета (Июль 2026)
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Контроль лимитов по статьям затрат и выполнение плана выручки
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Бюджет в норме
                </span>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-zinc-800 dark:text-zinc-200">Выручка строительно-монтажного направления</span>
                    <span className="text-emerald-600">4 200 000 ₽ из 4 000 000 ₽ (105%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-zinc-800 dark:text-zinc-200">Лимит ФОТ и премиального фонда</span>
                    <span className="text-blue-600">1 250 000 ₽ из 1 400 000 ₽ (89%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '89%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-zinc-800 dark:text-zinc-200">Лимит затрат на ГСМ и ТО техники</span>
                    <span className="text-amber-600">480 000 ₽ из 500 000 ₽ (96%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Модальное окно транзакции (Стеклянная подложка, темная тема) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800/60 shadow-[#F95700]/5 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300 font-['Inter']">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
              <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-widest font-['Montserrat']">
                Добавить финансовую операцию
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              {formError && (
                <div className="p-4 rounded-xl text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-start gap-2 animate-shake">
                  <span className="font-bold">{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Тип операции</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'income' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold text-center border transition-all duration-300 active:scale-95 select-none cursor-pointer ${formData.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800/50 shadow-sm' : 'bg-white/80 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-450 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    Доход (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'expense' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold text-center border transition-all duration-300 active:scale-95 select-none cursor-pointer ${formData.transaction_type === 'expense' ? 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800/50 shadow-sm' : 'bg-white/80 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-455 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    Расход (-)
                  </button>
                </div>
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Касса учета</label>
                <select 
                  value={formData.cash_register}
                  onChange={(e) => setFormData({...formData, cash_register: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs cursor-pointer font-medium"
                >
                  <option value="works">Касса: Работы</option>
                  <option value="materials">Касса: Товары и материалы</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Сумма (₽) *</label>
                <input 
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  placeholder="50 000"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Заказчик / Клиент</label>
                <select 
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value, object_id: ''})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs cursor-pointer font-medium"
                >
                  <option value="">-- Не связано с клиентом --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider">Проект / Объект</label>
                <select 
                  value={formData.object_id}
                  disabled={!formData.client_id}
                  onChange={(e) => setFormData({...formData, object_id: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs disabled:opacity-50 cursor-pointer font-medium"
                >
                  <option value="">-- Не связано с объектом --</option>
                  {filteredFormObjects.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider">Описание / Контрагент на стороне</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Иван (Авито) / Продажа краски"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider">Категория</label>
                  {formData.transaction_type === 'income' ? (
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs cursor-pointer font-medium"
                    >
                      <option value="Оплата от клиента">Оплата от клиента</option>
                      <option value="Продажа товаров">Продажа товаров</option>
                      <option value="Аванс">Аванс</option>
                      <option value="Инвестиции">Инвестиции</option>
                      <option value="Другое">Другое</option>
                    </select>
                  ) : (
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs cursor-pointer font-medium"
                    >
                      <option value="Закупка материалов">Закупка материалов</option>
                      <option value="ГСМ">ГСМ</option>
                      <option value="Суточные">Суточные</option>
                      <option value="Оплата труда">Оплата труда</option>
                      <option value="Аренда оборудования">Аренда оборудования</option>
                      <option value="Налоги и пошлины">Налоги и пошлины</option>
                      <option value="Другое">Другое</option>
                    </select>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">Способ оплаты</label>
                  <select 
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all text-xs cursor-pointer font-medium"
                  >
                    <option value="Безнал с НДС">Безнал с НДС</option>
                    <option value="Безнал без НДС">Безнал без НДС</option>
                    <option value="Наличный">Наличный</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-zinc-250 dark:border-zinc-700 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold active:scale-95 transition-all select-none cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl active:scale-95 transition-all font-bold text-xs shadow-md shadow-[#F95700]/15 select-none cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTransactionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-['Montserrat']">Удалить операцию?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Вы уверены, что хотите удалить эту финансовую операцию? Данное действие необратимо.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteTransactionId(null)}
                className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteTransaction}
                className="active:scale-95 transition-all px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/20 cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-['Montserrat']">Массовое удаление</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Вы уверены, что хотите удалить выбранные транзакции ({selectedIds.length} шт.)? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={confirmBulkDelete}
                className="active:scale-95 transition-all px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/20 cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
