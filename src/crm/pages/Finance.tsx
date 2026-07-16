import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Plus, Trash2, X, Wallet, 
  ArrowUpRight, ArrowDownRight, Search, Filter, Loader2, Calendar, 
  PieChart, Settings
} from 'lucide-react';
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

  // Интерактивные лимиты бюджета
  const [budgetRevenue, setBudgetRevenue] = useState<number>(() => {
    return Number(localStorage.getItem('sphera_budget_revenue') || '8000000');
  });
  const [budgetSalary, setBudgetSalary] = useState<number>(() => {
    return Number(localStorage.getItem('sphera_budget_salary') || '1500000');
  });
  const [budgetMaterials, setBudgetMaterials] = useState<number>(() => {
    return Number(localStorage.getItem('sphera_budget_materials') || '500000');
  });

  const [isEditingBudget, setIsEditingBudget] = useState(false);

  useEffect(() => {
    localStorage.setItem('sphera_budget_revenue', budgetRevenue.toString());
    localStorage.setItem('sphera_budget_salary', budgetSalary.toString());
    localStorage.setItem('sphera_budget_materials', budgetMaterials.toString());
  }, [budgetRevenue, budgetSalary, budgetMaterials]);

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

  // P&L Аналитика
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

  // Вычисления бюджета
  const pctRevenue = Math.min(150, Math.round((pnlAnalytics.actualIncome / budgetRevenue) * 100));
  const opexSMR = pnlAnalytics.expenseList.find(e => e.category === 'Закупка материалов')?.amount || 0;
  const pctMaterials = Math.min(150, Math.round((opexSMR / budgetMaterials) * 100));
  const opexSalary = pnlAnalytics.expenseList.find(e => e.category === 'Оплата труда')?.amount || 0;
  const pctSalary = Math.min(150, Math.round((opexSalary / budgetSalary) * 100));

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1600px] mx-auto p-1">
      <Helmet>
        <title>Финансы | СФЕРУМ</title>
      </Helmet>
      
      {/* Header Panel */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-[2rem] shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5 tracking-wide uppercase font-sans">
            <Wallet className="w-7 h-7 text-[#F95700]" />
            Финансовый учет
          </h1>
          <p className="text-[11px] text-zinc-405 dark:text-zinc-500 mt-1 font-bold font-mono tracking-wider uppercase">Движение денежных средств, бюджетирование P&L и первичная документация</p>
        </div>
        
        {activeTab === 'finance' && (
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center px-4.5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-2xl font-bold text-xs shadow-md transition-all duration-300 gap-2 cursor-pointer uppercase tracking-wider font-mono active:scale-[0.98]"
          >
            <Download className="w-4 h-4 mr-1 text-[#F95700]" /> Экспорт в CSV
          </button>
        )}
      </div>

      {/* Statistics Cards Row - DOUBLE BEZEL & GEIST MONO */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Income card */}
          <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-emerald-500/5 hover:border-emerald-500/20 group">
            <div className="bg-white dark:bg-zinc-950 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-black font-mono">Всего Доходов</p>
                <h3 className="text-xl lg:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-450 font-mono mt-2">
                  +{totalIncome.toLocaleString('ru-RU')} ₽
                </h3>
              </div>
              <div className="p-3 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-500 dark:text-emerald-450 bg-emerald-500/5 dark:bg-emerald-500/10 transition-all duration-300">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Expense card */}
          <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-rose-500/5 hover:border-rose-500/20 group">
            <div className="bg-white dark:bg-zinc-955 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-black font-mono">Всего Расходов</p>
                <h3 className="text-xl lg:text-2xl font-black tracking-tight text-rose-600 dark:text-rose-450 font-mono mt-2">
                  -{totalExpense.toLocaleString('ru-RU')} ₽
                </h3>
              </div>
              <div className="p-3 rounded-xl border border-rose-500/10 dark:border-rose-500/20 text-rose-500 dark:text-rose-450 bg-rose-500/5 dark:bg-rose-500/10 transition-all duration-300">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Balance card */}
          {(() => {
            const isPos = balance >= 0;
            return (
              <div className={`relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 group ${isPos ? 'hover:shadow-blue-500/5 hover:border-blue-500/20' : 'hover:shadow-orange-500/5 hover:border-[#F95700]/20'}`}>
                <div className="bg-white dark:bg-zinc-950 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-black font-mono">Чистый баланс</p>
                    <h3 className={`text-xl lg:text-2xl font-black tracking-tight font-mono mt-2 ${isPos ? 'text-blue-600 dark:text-blue-450' : 'text-[#F95700]'}`}>
                      {isPos ? '+' : ''}{balance.toLocaleString('ru-RU')} ₽
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl border transition-all duration-300 ${isPos ? 'border-blue-500/10 dark:border-blue-500/20 text-blue-500 dark:text-blue-450 bg-blue-500/5 dark:bg-blue-500/10' : 'border-orange-500/10 dark:border-orange-500/20 text-[#F95700] dark:text-orange-400 bg-orange-500/5 dark:bg-orange-500/10'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Switchers Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'finance', label: 'Транзакции DДС', icon: Wallet },
            { id: 'documents', label: '🖨 Документы', icon: FileText },
            { id: 'pnl', label: '📊 Отчет P&L и Бюджет', icon: PieChart }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-zinc-950 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'finance' && (
          <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveCashRegister('works')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 select-none cursor-pointer font-mono uppercase tracking-wider ${activeCashRegister === 'works' ? 'bg-white dark:bg-zinc-950 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              Касса: Работы
            </button>
            <button 
              onClick={() => setActiveCashRegister('materials')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 select-none cursor-pointer font-mono uppercase tracking-wider ${activeCashRegister === 'materials' ? 'bg-white dark:bg-zinc-950 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              Касса: Товары
            </button>
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2.5rem-0.25rem)]">
          <AnimatePresence mode="wait">
            
            {activeTab === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 dark:border-zinc-850 pb-4">
                  <h2 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans">
                    Реестр транзакций ({activeCashRegister === 'works' ? 'Касса: Работы' : 'Касса: Товары и материалы'})
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {selectedIds.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-1 inline" /> Удалить ({selectedIds.length})
                      </button>
                    )}
                    <button 
                      onClick={handleExportExcel}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-1 inline" /> Excel Экспорт
                    </button>
                    <button 
                      onClick={handleOpenModal}
                      className="px-4.5 py-2.5 bg-[#F95700] hover:bg-orange-600 text-white active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black shadow-md shadow-orange-500/15 cursor-pointer"
                    >
                      <Plus className="w-4.5 h-4.5 mr-1 inline" /> Записать операцию
                    </button>
                  </div>
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center space-x-2 bg-white dark:bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Поиск по клиенту, объекту..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150 focus:ring-0 font-sans font-bold"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-white dark:bg-zinc-955 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Filter className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-100 cursor-pointer focus:ring-0 font-bold"
                    >
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 bg-white dark:bg-zinc-955 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Calendar className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150 font-bold"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-white dark:bg-zinc-955 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400 dark:text-zinc-550 text-xs font-bold">—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs text-zinc-800 dark:text-zinc-150 font-bold"
                    />
                  </div>
                </div>

                {/* Desktop Table View - GEIST MONO */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider">
                        <th className="pb-3.5 w-10 text-center">
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
                            className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="pb-3.5 px-4">Дата</th>
                        <th className="pb-3.5 px-4">Направление</th>
                        <th className="pb-3.5 px-4">Контрагент / Назначение</th>
                        <th className="pb-3.5 px-4">Категория</th>
                        <th className="pb-3.5 px-4">Метод оплаты</th>
                        <th className="pb-3.5 px-4 text-right">Сумма (₽)</th>
                        <th className="pb-3.5 text-center">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40 text-xs">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-zinc-400 font-mono text-[10px] uppercase">
                              <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#F95700]" />
                              Синхронизация с реестром...
                            </div>
                          </td>
                        </tr>
                      ) : filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-[10px] uppercase">
                            Записи в данной кассе отсутствуют
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="py-3.5 text-center">
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
                                className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                              {new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {t.transaction_type === 'income' 
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20">Доход</span>
                                : <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Расход</span>
                              }
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate">
                              <div className="font-bold text-zinc-900 dark:text-white font-sans">{t.client_name || t.description || '—'}</div>
                              {t.object_name && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-bold">{t.object_name}</div>}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-zinc-650 dark:text-zinc-400">{t.category}</td>
                            <td className="py-3.5 px-4 font-mono text-[10px] uppercase text-zinc-500">{t.payment_method}</td>
                            <td className={`py-3.5 px-4 text-right font-mono font-black text-xs whitespace-nowrap ${t.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {t.transaction_type === 'income' ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="py-3.5 text-center">
                              <button 
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3 pb-4">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-400 font-mono text-[10px]">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#F95700]" /> Загрузка...
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 font-mono text-[10px] uppercase">Транзакции отсутствуют</div>
                  ) : (
                    filteredTransactions.map(t => (
                      <div key={t.id} className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-900/10 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            {new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {t.transaction_type === 'income' 
                            ? <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-emerald-500/10 text-emerald-600">Доход</span>
                            : <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-rose-500/10 text-rose-600">Расход</span>
                          }
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-white">{t.client_name || t.description || '—'}</div>
                          {t.object_name && <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{t.object_name}</div>}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 text-xs">
                          <span className="font-bold text-zinc-500">{t.category}</span>
                          <span className={`font-mono font-black ${t.transaction_type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.transaction_type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Customer & Object Select */}
                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-500 uppercase tracking-wider font-mono">1. Выберите заказчика *</label>
                    <select 
                      value={docClientId} 
                      onChange={(e) => {
                        setDocClientId(e.target.value);
                        setDocObjectId('');
                      }}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 text-xs cursor-pointer font-bold"
                    >
                      <option value="">-- Выберите клиента из базы --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-500 uppercase tracking-wider font-mono">2. Выберите проект / объект (опционально)</label>
                    <select 
                      value={docObjectId} 
                      disabled={!docClientId}
                      onChange={(e) => setDocObjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-955 text-zinc-800 dark:text-zinc-100 text-xs disabled:opacity-50 cursor-pointer font-bold"
                    >
                      <option value="">-- Без объекта --</option>
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
                      <div key={doc.id} className="border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-5 hover:border-[#F95700]/40 transition-all duration-300 bg-white dark:bg-zinc-900/20 flex flex-col justify-between h-[210px] group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#F95700]/5 to-transparent rounded-full pointer-events-none" />
                        <div>
                          <FileText className="w-8 h-8 text-[#F95700] mb-3" />
                          <h3 className="font-extrabold text-[10px] uppercase tracking-widest font-sans text-zinc-900 dark:text-white mb-2">{doc.title}</h3>
                          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mb-4 line-clamp-3 leading-relaxed">{doc.desc}</p>
                        </div>
                        <button 
                          onClick={() => handleGeneratePDF(doc.id)}
                          disabled={!docClientId || isGenerating}
                          className="w-full flex items-center justify-center py-2.5 bg-zinc-100 dark:bg-zinc-900 group-hover:bg-[#F95700] group-hover:text-white text-zinc-800 dark:text-zinc-300 font-black rounded-xl text-[9px] uppercase tracking-wider font-mono transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {isGenerating ? 'Генерация...' : 'PDF документ'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Disclaimer template editor */}
                <form onSubmit={handleSaveDisclaimers} className="mt-8 pt-8 border-t border-zinc-250/40 dark:border-zinc-800/80 space-y-6 text-left">
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-wider font-sans">
                      Примечания для финансовых документов
                    </h3>
                    <p className="text-[11px] text-zinc-405 dark:text-zinc-500 mt-1 font-bold uppercase tracking-wider font-mono">
                      Этот текст автоматически подгружается и печатается в нижней части генерируемых счетов и актов.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest font-mono block">
                        В Счете на оплату
                      </label>
                      <textarea
                        value={invoiceDisclaimer}
                        onChange={(e) => setInvoiceDisclaimer(e.target.value)}
                        rows={4}
                        placeholder="Введите примечание для Счета..."
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F95700] bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-mono block">
                        В Счет-фактуре
                      </label>
                      <textarea
                        value={facturaDisclaimer}
                        onChange={(e) => setFacturaDisclaimer(e.target.value)}
                        rows={4}
                        placeholder="Введите примечание для Счет-фактуры..."
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F95700] bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-455 dark:text-zinc-500 uppercase tracking-widest font-mono block">
                        В УПД (Универсальный документ)
                      </label>
                      <textarea
                        value={updDisclaimer}
                        onChange={(e) => setUpdDisclaimer(e.target.value)}
                        rows={4}
                        placeholder="Введите примечание для УПД..."
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F95700] bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 text-xs leading-relaxed resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-5 py-3 bg-[#F95700] hover:bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase tracking-wider font-mono shadow-md shadow-orange-500/10 active:scale-[0.97] transition-all disabled:opacity-50 select-none cursor-pointer"
                    >
                      {isSavingSettings && <Loader2 className="w-4 h-4 mr-1.5 animate-spin inline" />}
                      Сохранить шаблоны
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'pnl' && (
              <motion.div
                key="pnl"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 text-left"
              >
                {/* P&L Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white font-sans uppercase">
                      Консолидированный Отчёт о Прибылях и Убытках (ОПиУ)
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-bold font-mono uppercase tracking-wider">
                      Сводный финансовый результат по стандарту IFRS с контролем выполнения бюджета
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-850 dark:text-zinc-200 cursor-pointer">
                      <option>Текущий месяц (Июль 2026)</option>
                      <option>III Квартал (Q3 2026)</option>
                      <option>С начала года (YTD 2026)</option>
                    </select>
                    <button
                      onClick={() => toast.success('P&L Отчёт сформирован и готов к скачиванию в PDF')}
                      className="px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 rounded-xl font-black text-[10px] uppercase tracking-wider font-mono shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#F95700]" /> Скачать ОПиУ
                    </button>
                  </div>
                </div>

                {/* Mode Switcher & Budget Settings Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl w-fit">
                    <button
                      onClick={() => setPnlMode('actual')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${pnlMode === 'actual' ? 'bg-white dark:bg-zinc-955 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                      📊 Фактический P&L
                    </button>
                    <button
                      onClick={() => setPnlMode('budget')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${pnlMode === 'budget' ? 'bg-white dark:bg-zinc-955 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                      📋 Контроль бюджета (План-Факт)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingBudget(!isEditingBudget)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${isEditingBudget ? 'bg-[#F95700] text-white border-[#F95700]' : 'border-zinc-250 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                  >
                    <Settings className="w-3.5 h-3.5" /> Настройка лимитов
                  </button>
                </div>

                {/* BUDGET EDITING MODULE */}
                {isEditingBudget && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-orange-500/[0.03] border border-orange-500/20 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div>
                      <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">План Выручки (₽)</label>
                      <input 
                        type="number" 
                        value={budgetRevenue} 
                        onChange={e => setBudgetRevenue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Лимит бюджета ФОТ (₽)</label>
                      <input 
                        type="number" 
                        value={budgetSalary} 
                        onChange={e => setBudgetSalary(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Лимит на сырье/ГСМ (₽)</label>
                      <input 
                        type="number" 
                        value={budgetMaterials} 
                        onChange={e => setBudgetMaterials(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-800 dark:text-white"
                      />
                    </div>
                  </motion.div>
                )}

                {pnlMode === 'actual' ? (
                  <div className="space-y-6">
                    {/* 4 Bento Cards for Actual P&L - DOUBLE BEZEL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-955 p-4 rounded-[calc(1rem-0.125rem)]">
                          <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400 font-mono">Доходы (Факт)</span>
                          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                            +{pnlAnalytics.actualIncome.toLocaleString('ru-RU')} ₽
                          </div>
                          <span className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-1 block">Все кассы и реестры</span>
                        </div>
                      </div>

                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-955 p-4 rounded-[calc(1rem-0.125rem)]">
                          <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400 font-mono">Расходы (Факт)</span>
                          <div className="text-xl font-black text-rose-600 dark:text-rose-450 font-mono mt-1">
                            -{pnlAnalytics.actualExpense.toLocaleString('ru-RU')} ₽
                          </div>
                          <span className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-1 block">Материалы, ФОТ, налоги</span>
                        </div>
                      </div>

                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-955 p-4 rounded-[calc(1rem-0.125rem)]">
                          <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400 font-mono">Операционная прибыль</span>
                          <div className={`text-xl font-black font-mono mt-1 ${pnlAnalytics.actualNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
                            {pnlAnalytics.actualNetProfit >= 0 ? '+' : ''}{pnlAnalytics.actualNetProfit.toLocaleString('ru-RU')} ₽
                          </div>
                          <span className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-1 block">Сальдо за период</span>
                        </div>
                      </div>

                      {/* DONUT / RING margin meter */}
                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-955 p-4 rounded-[calc(1rem-0.125rem)] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-wider text-[#F95700] font-mono">Маржинальность</span>
                            <div className="text-xl font-black text-[#F95700] font-mono mt-1">
                              {pnlAnalytics.actualMargin}%
                            </div>
                            <span className="text-[10px] text-zinc-550 mt-1 block">Доля чистой прибыли</span>
                          </div>

                          {/* SVG Ring Progress */}
                          <div className="relative w-11 h-11 shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-zinc-200 dark:text-zinc-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-[#F95700]" strokeDasharray={`${Math.max(0, Math.min(100, Number(pnlAnalytics.actualMargin)))}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actual Breakdown Table by Categories */}
                    <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                      <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] space-y-4">
                        <div className="flex justify-between items-center text-xs font-black uppercase font-sans text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-850">
                          <span>Статья финансового учета</span>
                          <span className="font-mono">Сумма / Удельный вес</span>
                        </div>

                        <div className="space-y-4">
                          {/* Income List */}
                          <div className="space-y-3">
                            <div className="text-[10px] font-black text-emerald-600 uppercase font-mono tracking-wider flex justify-between bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                              <span>Доходы по статьям</span>
                              <span className="font-mono">+{pnlAnalytics.actualIncome.toLocaleString()} ₽</span>
                            </div>
                            {pnlAnalytics.incomeList.map(inc => (
                              <div key={inc.category} className="space-y-1.5 px-2">
                                <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                                  <span>{inc.category}</span>
                                  <span className="font-mono text-emerald-600 font-black">+{inc.amount.toLocaleString()} ₽ ({inc.percentage}%)</span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${inc.percentage}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Expense List */}
                          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                            <div className="text-[10px] font-black text-rose-500 uppercase font-mono tracking-wider flex justify-between bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                              <span>Расходы по статьям</span>
                              <span className="font-mono">-{pnlAnalytics.actualExpense.toLocaleString()} ₽</span>
                            </div>
                            {pnlAnalytics.expenseList.map(exp => (
                              <div key={exp.category} className="space-y-1.5 px-2">
                                <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                                  <span>{exp.category}</span>
                                  <span className="font-mono text-rose-500 font-black">-{exp.amount.toLocaleString()} ₽ ({exp.percentage}%)</span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${exp.percentage}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* P&L Bento Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-black text-zinc-400 font-mono tracking-wider">Выручка (План)</span>
                        <div className="text-xl font-black text-gray-900 dark:text-white font-mono mt-1">
                          {budgetRevenue.toLocaleString('ru-RU')} ₽
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono font-bold mt-1 block">Целевой лимит периода</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-55 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-black text-zinc-400 font-mono tracking-wider">Выручка (Факт)</span>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-450 font-mono mt-1">
                          {pnlAnalytics.actualIncome.toLocaleString('ru-RU')} ₽
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold mt-1 block">▲ {pctRevenue}% выполнения</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-black text-zinc-400 font-mono tracking-wider">Лимит ФОТ (План)</span>
                        <div className="text-xl font-black text-rose-500 font-mono mt-1">
                          {budgetSalary.toLocaleString('ru-RU')} ₽
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono font-bold mt-1 block">Макс. зарплатный фонд</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30">
                        <span className="text-[9px] uppercase font-black text-[#F95700] font-mono tracking-wider">Лимит ТМЦ (План)</span>
                        <div className="text-xl font-black text-[#F95700] font-mono mt-1">
                          {budgetMaterials.toLocaleString('ru-RU')} ₽
                        </div>
                        <span className="text-[10px] text-zinc-650 dark:text-zinc-350 font-mono font-bold mt-1 block">Макс. закуп материалов</span>
                      </div>
                    </div>

                    {/* Detailed Statement Table */}
                    <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                      <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] space-y-5">
                        <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans border-b border-zinc-100 dark:border-zinc-850 pb-3">
                          План-Факт анализ исполнения бюджетов и лимитов
                        </h4>
                        
                        <div className="space-y-5">
                          {/* Progress Item 1 */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                              <span>Выручка от реализации услуг/заказов</span>
                              <span className="font-mono font-black text-emerald-600">{pnlAnalytics.actualIncome.toLocaleString()} ₽ из {budgetRevenue.toLocaleString()} ₽ ({pctRevenue}%)</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, pctRevenue)}%` }} />
                            </div>
                          </div>

                          {/* Progress Item 2 */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                              <span>Лимит выплат фонда оплаты труда (ФОТ)</span>
                              <span className={`font-mono font-black ${pctSalary > 100 ? 'text-red-500' : 'text-blue-500'}`}>{opexSalary.toLocaleString()} ₽ из {budgetSalary.toLocaleString()} ₽ ({pctSalary}%)</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pctSalary > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, pctSalary)}%` }} />
                            </div>
                          </div>

                          {/* Progress Item 3 */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                              <span>Лимит закупки сырья и товаров</span>
                              <span className={`font-mono font-black ${pctMaterials > 100 ? 'text-red-500' : 'text-amber-500'}`}>{opexSMR.toLocaleString()} ₽ из {budgetMaterials.toLocaleString()} ₽ ({pctMaterials}%)</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pctMaterials > 100 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, pctMaterials)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ====== MODAL: ЗАПИСАТЬ ОПЕРАЦИЮ ====== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#F95700]" /> Новая транзакция
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-xl">{formError}</div>
              )}

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Направление платежа</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'income' })}
                    className={`py-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer font-mono uppercase tracking-wider ${formData.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'}`}
                  >
                    Доход (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'expense' })}
                    className={`py-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer font-mono uppercase tracking-wider ${formData.transaction_type === 'expense' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-sm' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'}`}
                  >
                    Расход (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Касса учета</label>
                <select 
                  value={formData.cash_register}
                  onChange={(e) => setFormData({...formData, cash_register: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#F95700] text-xs cursor-pointer font-bold"
                >
                  <option value="works">Касса: Работы</option>
                  <option value="materials">Касса: Товары и материалы</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Сумма операции (₽) *</label>
                <input 
                  type="number" required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="50 000"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#F95700] font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Заказчик / Контрагент</label>
                <select 
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value, object_id: ''})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#F95700] text-xs cursor-pointer font-bold"
                >
                  <option value="">-- Вне базы клиентов --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {formData.client_id && (
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Проект / Объект</label>
                  <select 
                    value={formData.object_id}
                    onChange={(e) => setFormData({...formData, object_id: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#F95700] text-xs cursor-pointer font-bold"
                  >
                    <option value="">-- Не связано с объектом --</option>
                    {filteredFormObjects.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Назначение платежа</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Оплата по договору №48..."
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#F95700] text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Статья (Категория)</label>
                  {formData.transaction_type === 'income' ? (
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F95700]"
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
                      className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F95700]"
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
                
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Форма оплаты</label>
                  <select 
                    value={formData.payment_method}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  >
                    <option value="Безнал с НДС">Безнал с НДС</option>
                    <option value="Безнал без НДС">Безнал без НДС</option>
                    <option value="Наличный">Наличный</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider disabled:opacity-50">
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin inline" />} Записать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTransactionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-sans uppercase tracking-wider">Удалить операцию?</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-bold">
              Вы действительно хотите удалить эту транзакцию? Данное действие спишет сумму с баланса и очистит историю проводок.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteTransactionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                Отмена
              </button>
              <button onClick={confirmDeleteTransaction}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer font-mono uppercase tracking-wider">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-sans uppercase tracking-wider">Удалить выбранные</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-bold">
              Вы хотите безвозвратно удалить {selectedIds.length} транзакций? Это действие скорректирует общую финансовую статистику.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                Отмена
              </button>
              <button onClick={confirmBulkDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer font-mono uppercase tracking-wider">
                Удалить все
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
