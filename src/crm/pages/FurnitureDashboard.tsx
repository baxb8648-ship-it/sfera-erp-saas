import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hammer, PackageSearch, LayoutTemplate, Plus, Trash2, RotateCcw, 
  Settings, Scissors, FileText, Image, CheckCircle, 
  Clock, Factory, Wrench, Layers, Ruler, X, CalendarDays, Bot, Sparkles, Users
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export default function FurnitureDashboard() {
  const [activeTab, setActiveTab] = useState<'serial' | 'raskroy' | 'fittings' | 'schedule'>('raskroy');
  const { showToast } = useToast();

  // Raskroy State
  const [sheet, setSheet] = useState({
    width: 2800, height: 2070, thickness: 16, kerf: 4, trim_top: 10, trim_bottom: 10, trim_left: 10, trim_right: 10, material_name: 'ЛДСП 16мм Белый влагостойкий (Egger W1000)'
  });

  const [parts, setParts] = useState([
    { id: '1', part_id: 'P01', name: 'Боковина шкафа', width: 2400, height: 600, count: 2, can_rotate: false, edge_banding: '2/0/2/0' },
    { id: '2', part_id: 'P02', name: 'Крышка / Дно', width: 1800, height: 600, count: 2, can_rotate: false, edge_banding: '2/2/0/0' },
    { id: '3', part_id: 'P03', name: 'Полка съемная', width: 870, height: 550, count: 6, can_rotate: true, edge_banding: '2/0/0/0' },
  ]);

  const totalLiveEdgeMeters = parts.reduce((acc, p) => {
    const sides = (p.edge_banding || '0/0/0/0').split('/');
    const topEdge = Number(sides[0]) > 0 ? (Number(p.width) / 1000) : 0;
    const bottomEdge = Number(sides[1]) > 0 ? (Number(p.width) / 1000) : 0;
    const leftEdge = Number(sides[2]) > 0 ? (Number(p.height) / 1000) : 0;
    const rightEdge = Number(sides[3]) > 0 ? (Number(p.height) / 1000) : 0;
    return acc + (topEdge + bottomEdge + leftEdge + rightEdge) * Number(p.count || 1);
  }, 0);

  const [raskroyResult, setRaskroyResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSubtabs, setOrderSubtabs] = useState<Record<number, 'ops' | 'fittings' | 'details'>>({});

  // Scheduler / Events State
  const [events, setEvents] = useState<any[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    type: 'measurement',
    client_name: '',
    client_phone: '',
    address: '',
    master_name: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00'
  });

  // Bot Config State
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [botConfig, setBotConfig] = useState({
    is_active: true,
    auto_assign: true,
    reminders: true,
    bot_token: '',
    bot_name: ''
  });

  // Модалка импорта спецификаций (Базис/PRO100)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Калькулятор КП и наценки State
  const [pricing, setPricing] = useState({
    priceSheet: 4500,        // Цена листа ЛДСП (руб)
    priceEdge: 120,          // Цена погонного метра кромки (руб)
    priceCut: 55,            // Стоимость реза пилы за 1 м (руб)
    priceBanding: 80,        // Стоимость кромления за 1 м (руб)
    priceAssembly: 6000,     // Стоимость сборки (руб)
    markupPct: 120           // Торговая наценка (%)
  });

  // Модалки изделий
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    description: '',
    weight: 0,
    cost_price: 0,
  });

  const [isLaunchBatchModalOpen, setIsLaunchBatchModalOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    product_id: 0,
    quantity: 1,
    client_name: '',
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  const [addFittingOrderId, setAddFittingOrderId] = useState<number | null>(null);
  const [newFitting, setNewFitting] = useState({
    fitting_name: 'Петля Blum CLIP top 110° с доводчиком',
    article: '71B3550',
    supplier: 'Блум Рус / МДМ',
    quantity: 8,
    unit_price: 380
  });

  const [addDetailOrderId, setAddDetailOrderId] = useState<number | null>(null);
  const [newDetail, setNewDetail] = useState({
    detail_name: 'Боковина левая',
    length_mm: 2200,
    width_mm: 600,
    quantity: 2,
    edge_top: 'pvc_20',
    edge_bottom: 'none',
    edge_left: 'pvc_04',
    edge_right: 'pvc_04'
  });

  useEffect(() => {
    if (activeTab === 'serial') {
      fetchSerialData();
    } else if (activeTab === 'schedule') {
      fetchEventsData();
    }
  }, [activeTab]);

  const fetchSerialData = async () => {
    try {
      const [prodRes, ordRes] = await Promise.all([
        apiClient.get('/furniture/products'),
        apiClient.get('/furniture/orders')
      ]);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setOrders(Array.isArray(ordRes) ? ordRes : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEventsData = async () => {
    try {
      const res = await apiClient.get('/furniture/events');
      setEvents(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBotConfig = async () => {
    try {
      const res = await apiClient.get('/furniture/bot-config');
      if (res) {
        setBotConfig(res);
      }
    } catch (e) {
      console.error(e);
    }
    setIsBotModalOpen(true);
  };

  const handleSaveBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/furniture/bot-config', botConfig);
      showToast('Настройки ИИ-бота успешно сохранены!', 'success');
      setIsBotModalOpen(false);
    } catch (err: any) {
      showToast('Не удалось сохранить конфигурацию ИИ-бота', 'error');
    }
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.client_name || !newEvent.address || !newEvent.master_name) {
      showToast('Заполните обязательные поля!', 'warning');
      return;
    }
    try {
      await apiClient.post('/furniture/events', newEvent);
      showToast('Событие добавлено в планировщик!', 'success');
      setIsEventModalOpen(false);
      setNewEvent({
        type: 'measurement',
        client_name: '',
        client_phone: '',
        address: '',
        master_name: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00'
      });
      fetchEventsData();
    } catch (err: any) {
      showToast('Ошибка при сохранении события', 'error');
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductData.name) return;
    try {
      await apiClient.post('/furniture/products', newProductData);
      showToast('Изделие добавлено в реестр BOM!', 'success');
      setIsCreateProductModalOpen(false);
      setNewProductData({ name: '', description: '', weight: 0, cost_price: 0 });
      fetchSerialData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Ошибка создания изделия', 'error');
    }
  };

  const handleLaunchBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchData.product_id || newBatchData.quantity < 1) return;
    try {
      await apiClient.post('/furniture/orders', newBatchData);
      showToast('Производственная партия запущена!', 'success');
      setIsLaunchBatchModalOpen(false);
      setNewBatchData({ product_id: 0, quantity: 1, client_name: '', deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] });
      fetchSerialData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Ошибка запуска партии', 'error');
    }
  };

  const handleCompleteOp = async (opId: number) => {
    try {
      await apiClient.post(`/furniture/operations/${opId}/complete`);
      showToast('Операция завершена. ТМЦ списаны со склада.', 'success');
      fetchSerialData();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Ошибка', 'error');
    }
  };

  const handleAddFittingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFittingOrderId) return;
    try {
      await apiClient.post(`/furniture/orders/${addFittingOrderId}/fittings`, newFitting);
      showToast('Фурнитура добавлена в комплектацию заказа!', 'success');
      setAddFittingOrderId(null);
      fetchSerialData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Ошибка при добавлении фурнитуры', 'error');
    }
  };

  const handleUpdateFittingStatus = async (fittingId: number, status: string) => {
    try {
      await apiClient.patch(`/furniture/fittings/${fittingId}/status?status=${status}`);
      showToast('Статус фурнитуры обновлён', 'success');
      fetchSerialData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Ошибка обновления статуса', 'error');
    }
  };

  const handleAddDetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDetailOrderId) return;
    try {
      const res = await apiClient.post(`/furniture/orders/${addDetailOrderId}/details`, newDetail);
      showToast(`Деталь и кромка рассчитана! Погонных метров: ${res.calc_linear_meters} м`, 'success');
      setAddDetailOrderId(null);
      fetchSerialData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Ошибка добавления детали', 'error');
    }
  };

  const handleAddPart = () => {
    setParts([...parts, { 
      id: Date.now().toString(), 
      part_id: `P0${parts.length + 1}`, 
      name: 'Новая деталь', 
      width: 500, height: 500, count: 1, can_rotate: true, edge_banding: '' 
    }]);
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const handlePartChange = (id: string, field: string, value: any) => {
    setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const calculateRaskroy = async () => {
    setIsCalculating(true);
    setRaskroyResult(null);
    try {
      const res = await apiClient.post('/furniture/raskroy', {
        sheet,
        parts: parts.map(p => ({
          ...p,
          width: Number(p.width) || 0,
          height: Number(p.height) || 0,
          count: Number(p.count) || 1
        })),
        min_reusable_side: 400
      });
      setRaskroyResult(res);
      showToast('Карты кроя успешно сгенерированы!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.detail || 'Ошибка при расчете раскроя', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Парсинг спецификации
  const handleImportSpecs = (textToParse: string) => {
    const lines = textToParse.split('\n');
    const newParts: any[] = [];
    let countImported = 0;

    lines.forEach((line, idx) => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) return;

      // Определение разделителя
      let delimiter = ';';
      if (cleanLine.includes('\t')) delimiter = '\t';
      else if (cleanLine.includes(',')) delimiter = ',';

      const cols = cleanLine.split(delimiter);
      if (cols.length >= 3) {
        const name = cols[0].trim();
        const width = Number(cols[1].trim());
        const height = Number(cols[2].trim());
        const count = cols[3] ? Number(cols[3].trim()) : 1;
        const edge = cols[4] ? cols[4].trim() : '';

        if (!isNaN(width) && !isNaN(height)) {
          newParts.push({
            id: (Date.now() + idx).toString(),
            part_id: `I${String(countImported + 1).padStart(2, '0')}`,
            name: name || 'Импортированная деталь',
            width: width,
            height: height,
            count: isNaN(count) ? 1 : count,
            can_rotate: true,
            edge_banding: edge
          });
          countImported++;
        }
      }
    });

    if (newParts.length > 0) {
      setParts(newParts);
      showToast(`Успешно импортировано деталей: ${newParts.length}!`, 'success');
      setIsImportModalOpen(false);
      setImportText('');
    } else {
      showToast('Не удалось распознать формат. Проверьте разделители (длина;ширина;кол-во).', 'error');
    }
  };

  // Файловый импорт
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleImportSpecs(text);
    };
    reader.readAsText(file);
  };

  // Экономические вычисления
  const sheetsUsed = raskroyResult ? raskroyResult.total_sheets_used : 1;
  const cutLengthMeters = raskroyResult 
    ? (raskroyResult.sheets.reduce((acc: number, s: any) => acc + s.total_cut_length_mm, 0) / 1000) 
    : 0;

  const costMaterials = (sheetsUsed * pricing.priceSheet) + (totalLiveEdgeMeters * pricing.priceEdge);
  const costWorks = (cutLengthMeters * pricing.priceCut) + (totalLiveEdgeMeters * pricing.priceBanding) + pricing.priceAssembly;
  const totalCostPrice = costMaterials + costWorks;
  const clientPrice = totalCostPrice * (1 + pricing.markupPct / 100);
  const netProfit = clientPrice - totalCostPrice;

  // Формирование КП
  const handleCopyProposal = () => {
    const textProposal = `
========================================
КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ: СФЕРУМ МЕБЕЛЬ
========================================
Материал: ${sheet.material_name}
Габариты листа: ${sheet.width} x ${sheet.height} мм

РАСЧЁТ СТОИМОСТИ ИЗДЕЛИЯ:
----------------------------------------
1. Материалы (ЛДСП, кромка, фурнитура): ${costMaterials.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
2. Производство (распил, кромление, сборка): ${costWorks.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
----------------------------------------
Полная себестоимость ТМЦ + Работы: ${totalCostPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
Конечная стоимость для клиента (наценка ${pricing.markupPct}%): ${clientPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽

Срок изготовления: 10-14 рабочих дней.
========================================
СФЕРУМ SaaS — Управление мебельным бизнесом.
`;
    navigator.clipboard.writeText(textProposal.trim());
    showToast('Коммерческое предложение скопировано в буфер обмена!', 'success');
  };

  const calendarDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('ru-RU', { month: 'short' })
    };
  });

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 p-1">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-zinc-950 p-6 rounded-[2rem] shadow-sm border border-zinc-200/60 dark:border-zinc-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5 tracking-wide uppercase font-sans">
            <Hammer className="w-7 h-7 text-[#F95700]" />
            Мебельное производство
          </h1>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold font-mono tracking-wider uppercase">Модуль CAD/CAM управления раскроем, кромлением и заказами</p>
        </div>
        
        {/* Navigation & AI Button */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto relative z-10">
          <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'raskroy', label: 'Мастер Раскроя', icon: LayoutTemplate },
              { id: 'serial', label: 'Серийное производство', icon: Factory },
              { id: 'fittings', label: '🪛 Фурнитура и Кромка', icon: Wrench },
              { id: 'schedule', label: '📅 Замеры и Монтаж', icon: CalendarDays }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-white dark:bg-zinc-955 text-[#F95700] shadow-sm border border-zinc-200/40 dark:border-zinc-800/40' 
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <button 
            onClick={fetchBotConfig}
            className="px-4.5 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-2xl font-bold text-xs shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer uppercase tracking-wider font-mono active:scale-[0.98]"
          >
            <Bot className="w-4 h-4 text-[#F95700]" /> ИИ-Ассистент
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* RASKROY TAB */}
        {activeTab === 'raskroy' && (
          <motion.div 
            key="raskroy"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Panel: Settings & Parts List */}
              <div className="lg:col-span-4 space-y-6">
                {/* Sheet Settings */}
                <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 font-sans">
                        <Settings className="w-4 h-4 text-[#F95700]" />
                        Параметры листа
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Материал</label>
                        <input 
                          type="text" value={sheet.material_name} onChange={e => setSheet({...sheet, material_name: e.target.value})}
                          className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:border-[#F95700]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Длина (L, мм)</label>
                          <input type="number" value={sheet.width} onChange={e => setSheet({...sheet, width: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:border-[#F95700]" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Ширина (W, мм)</label>
                          <input type="number" value={sheet.height} onChange={e => setSheet({...sheet, height: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:border-[#F95700]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Рез пилы (мм)</label>
                          <input type="number" value={sheet.kerf} onChange={e => setSheet({...sheet, kerf: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:border-[#F95700]" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Толщина (мм)</label>
                          <input type="number" value={sheet.thickness} onChange={e => setSheet({...sheet, thickness: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:border-[#F95700]" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 font-mono">Опиловка краев (Верх/Низ/Лев/Прав)</label>
                        <div className="flex gap-2">
                          <input type="number" value={sheet.trim_top} onChange={e => setSheet({...sheet, trim_top: Number(e.target.value)})} className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg text-xs font-mono dark:text-white text-center font-bold" />
                          <input type="number" value={sheet.trim_bottom} onChange={e => setSheet({...sheet, trim_bottom: Number(e.target.value)})} className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg text-xs font-mono dark:text-white text-center font-bold" />
                          <input type="number" value={sheet.trim_left} onChange={e => setSheet({...sheet, trim_left: Number(e.target.value)})} className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg text-xs font-mono dark:text-white text-center font-bold" />
                          <input type="number" value={sheet.trim_right} onChange={e => setSheet({...sheet, trim_right: Number(e.target.value)})} className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg text-xs font-mono dark:text-white text-center font-bold" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parts List */}
                <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm flex flex-col h-[calc(100vh-480px)] min-h-[460px]">
                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] h-full flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2 font-sans">
                          <Scissors className="w-4 h-4 text-[#F95700]" />
                          Деталировка ({parts.length})
                        </h3>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="text-[10px] font-black text-blue-500 hover:text-blue-600 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition-colors uppercase tracking-widest font-mono cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Импорт
                          </button>
                          <button onClick={handleAddPart} className="text-[10px] font-black text-[#F95700] hover:text-orange-600 flex items-center gap-1 bg-[#F95700]/10 px-2.5 py-1.5 rounded-lg transition-colors uppercase tracking-widest font-mono cursor-pointer">
                            <Plus className="w-3.5 h-3.5" /> Добавить
                          </button>
                        </div>
                      </div>

                      {/* LIVE EDGE BANDING CALCULATOR BANNER */}
                      <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Ruler className="w-4 h-4 text-[#F95700]" /> Расчёт кромки: <span className="text-[#F95700] font-black font-mono">{totalLiveEdgeMeters.toFixed(2)} пог.м</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">Автоматически по периметру сторон деталей</div>
                        </div>
                        <button
                          onClick={() => setActiveTab('fittings')}
                          className="px-2.5 py-1 bg-[#F95700] text-white font-bold rounded-lg text-[10px] hover:bg-orange-600 transition-colors cursor-pointer font-mono uppercase tracking-wider"
                        >
                          Кромка →
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                        {parts.map((p) => {
                          const sides = (p.edge_banding || '0/0/0/0').split('/');
                          const pTop = Number(sides[0]) > 0 ? (Number(p.width) / 1000) : 0;
                          const pBottom = Number(sides[1]) > 0 ? (Number(p.width) / 1000) : 0;
                          const pLeft = Number(sides[2]) > 0 ? (Number(p.height) / 1000) : 0;
                          const pRight = Number(sides[3]) > 0 ? (Number(p.height) / 1000) : 0;
                          const partEdgeMeters = ((pTop + pBottom + pLeft + pRight) * Number(p.count || 1)).toFixed(2);

                          return (
                            <div key={p.id} className="p-3 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 relative group">
                              <button onClick={() => handleRemovePart(p.id)} className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-zinc-900 rounded-md shadow-sm border border-zinc-200/40 dark:border-zinc-800/40 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="flex gap-2 mb-2 pr-8">
                                <input type="text" value={p.part_id} onChange={e => handlePartChange(p.id, 'part_id', e.target.value)} placeholder="ID" className="w-16 px-2 py-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold dark:text-white text-center" />
                                <input type="text" value={p.name} onChange={e => handlePartChange(p.id, 'name', e.target.value)} placeholder="Название" className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-bold dark:text-white" />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <input type="number" value={p.width} onChange={e => handlePartChange(p.id, 'width', e.target.value)} placeholder="Длина" title="Длина (L)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold dark:text-white text-center" />
                                <span className="text-zinc-400 font-mono text-[10px]">x</span>
                                <input type="number" value={p.height} onChange={e => handlePartChange(p.id, 'height', e.target.value)} placeholder="Ширина" title="Ширина (W)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold dark:text-white text-center" />
                                <span className="text-zinc-400 font-mono text-[10px] ml-1">шт:</span>
                                <input type="number" value={p.count} onChange={e => handlePartChange(p.id, 'count', e.target.value)} className="w-12 px-2 py-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-black text-[#F95700] text-center" />
                              </div>
                              
                              <div className="mt-2.5 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-xs">
                                <label className="flex items-center gap-1.5 text-zinc-500 cursor-pointer">
                                  <input type="checkbox" checked={p.can_rotate} onChange={e => handlePartChange(p.id, 'can_rotate', e.target.checked)} className="rounded border-zinc-300 text-[#F95700] focus:ring-[#F95700]" />
                                  <span className="font-bold text-[10px] uppercase font-mono">Вращение</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-zinc-400 uppercase font-mono">Кромка: <b className="text-[#F95700] font-mono">{partEdgeMeters}м</b></span>
                                  <input type="text" value={p.edge_banding} onChange={e => handlePartChange(p.id, 'edge_banding', e.target.value)} placeholder="2/0/2/0" title="Стороны кромки В/Н/Л/П (мм)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded text-[9px] font-mono dark:text-white text-center font-bold" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40">
                      <button 
                        onClick={calculateRaskroy}
                        disabled={isCalculating || parts.length === 0}
                        className="w-full bg-[#F95700] hover:bg-orange-600 text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs font-mono uppercase tracking-wider"
                      >
                        {isCalculating ? (
                          <>
                            <RotateCcw className="w-4 h-4 animate-spin" /> Движок 2D раскроя...
                          </>
                        ) : (
                          <>
                            <LayoutTemplate className="w-4 h-4" /> Рассчитать Раскрой
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Visualization & Premium Calculator */}
              <div className="lg:col-span-8 space-y-6">
                {raskroyResult ? (
                  <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-950 p-4 rounded-[calc(1rem-0.125rem)]">
                          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Листов</div>
                          <div className="text-xl font-black text-gray-900 dark:text-white font-mono mt-1">{raskroyResult.total_sheets_used} шт</div>
                        </div>
                      </div>
                      
                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-950 p-4 rounded-[calc(1rem-0.125rem)]">
                          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest font-mono">Полезный Выход</div>
                          <div className="text-xl font-black text-emerald-500 font-mono mt-1">{raskroyResult.summary_yield_pct}%</div>
                        </div>
                      </div>

                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-950 p-4 rounded-[calc(1rem-0.125rem)]">
                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-mono">Отходы</div>
                          <div className="text-xl font-black text-rose-500 font-mono mt-1">{raskroyResult.summary_waste_pct}%</div>
                        </div>
                      </div>

                      <div className="relative overflow-hidden p-1 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                        <div className="bg-white dark:bg-zinc-950 p-4 rounded-[calc(1rem-0.125rem)]">
                          <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest font-mono">Деталей / Остатков</div>
                          <div className="text-xl font-black text-gray-900 dark:text-white font-mono mt-1">
                            {raskroyResult.total_parts_placed} / <span className="text-blue-500 font-mono">{raskroyResult.total_reusable_offcuts}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sheets Map View */}
                    <div className="space-y-8">
                      {raskroyResult.sheets.map((s: any) => {
                        const sheetRatio = sheet.width / sheet.height;
                        const pxWidth = sheet.width;
                        const pxHeight = sheet.height;

                        return (
                          <div key={s.sheet_index} className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                            <div className="bg-white dark:bg-zinc-955 p-6 rounded-[calc(2rem-0.25rem)]">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-gray-900 dark:text-white font-sans">
                                  <div className="w-6 h-6 rounded bg-[#F95700] text-white flex items-center justify-center text-xs font-mono font-bold">{s.sheet_index}</div>
                                  Карта раскроя листа {s.sheet_index} 
                                </h4>
                                <div className="flex gap-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                                  <span>Выход: <span className="text-emerald-500">{s.yield_percentage}%</span></span>
                                  <span>Рез: {s.total_cut_length_mm} мм</span>
                                </div>
                              </div>
                              
                              <div className="w-full bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl overflow-hidden flex justify-center items-center border border-zinc-200/50 dark:border-zinc-800/50">
                                  <div 
                                    className="relative shadow-xl mx-auto"
                                    style={{ 
                                      width: '100%', 
                                      maxWidth: '800px',
                                      aspectRatio: `${sheetRatio}`, 
                                      backgroundColor: '#e6d0b5',
                                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
                                      border: '2px solid #8b5a2b'
                                    }}
                                  >
                                    {s.placed_parts.map((p: any, idx: number) => (
                                      <div
                                        key={`p-${idx}`}
                                        className="absolute border border-[#8b5a2b]/80 bg-[#ffeed6] hover:bg-orange-200 transition-colors flex flex-col items-center justify-center cursor-crosshair group shadow-sm"
                                        style={{
                                          left: `${(p.x / pxWidth) * 100}%`,
                                          top: `${(p.y / pxHeight) * 100}%`,
                                          width: `${(p.width / pxWidth) * 100}%`,
                                          height: `${(p.height / pxHeight) * 100}%`
                                        }}
                                      >
                                        <span className="text-[#8b5a2b] font-black text-[8px] md:text-[10px] uppercase truncate px-1 max-w-full font-mono">{p.part_id}</span>
                                        <span className="text-[#8b5a2b] font-mono text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                          {p.width}x{p.height}
                                        </span>
                                      </div>
                                    ))}

                                    {s.offcuts.map((o: any, idx: number) => (
                                      <div
                                        key={`o-${idx}`}
                                        className={`absolute border ${
                                          o.is_reusable 
                                            ? 'bg-emerald-500/30 border-emerald-600' 
                                            : 'bg-red-900/10 border-red-900/20'
                                        } flex items-center justify-center overflow-hidden`}
                                        style={{
                                          left: `${(o.x / pxWidth) * 100}%`,
                                          top: `${(o.y / pxHeight) * 100}%`,
                                          width: `${(o.width / pxWidth) * 100}%`,
                                          height: `${(o.height / pxHeight) * 100}%`
                                        }}
                                      >
                                        {o.is_reusable && o.width > 200 && o.height > 200 && (
                                          <span className="text-emerald-800 font-black text-[9px] uppercase tracking-widest px-1 transform -rotate-45 font-mono">♻️ ОСТАТОК</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900/20 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
                    <LayoutTemplate className="w-16 h-16 mb-4 opacity-50 text-[#F95700]" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest font-sans">Карта раскроя пуста</h3>
                    <p className="text-xs max-w-sm text-center leading-relaxed font-bold">Нажмите «Рассчитать Раскрой» для визуализации листов ЛДСП и полезного выхода.</p>
                  </div>
                )}

                {/* PREMIUM PRICING CALCULATOR */}
                <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-md">
                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2.5rem-0.25rem)]">
                    <div className="flex justify-between items-center mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#F95700]" /> Экономика заказа & Калькулятор КП
                      </h4>
                      <button
                        onClick={handleCopyProposal}
                        className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-mono shadow-sm cursor-pointer"
                      >
                        Сформировать КП
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Лист ЛДСП (₽)</label>
                        <input
                          type="number"
                          value={pricing.priceSheet}
                          onChange={e => setPricing({ ...pricing, priceSheet: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Кромка м (₽)</label>
                        <input
                          type="number"
                          value={pricing.priceEdge}
                          onChange={e => setPricing({ ...pricing, priceEdge: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Распил м (₽)</label>
                        <input
                          type="number"
                          value={pricing.priceCut}
                          onChange={e => setPricing({ ...pricing, priceCut: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Кромление м (₽)</label>
                        <input
                          type="number"
                          value={pricing.priceBanding}
                          onChange={e => setPricing({ ...pricing, priceBanding: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Сборка (₽)</label>
                        <input
                          type="number"
                          value={pricing.priceAssembly}
                          onChange={e => setPricing({ ...pricing, priceAssembly: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Наценка (%)</label>
                        <input
                          type="number"
                          value={pricing.markupPct}
                          onChange={e => setPricing({ ...pricing, markupPct: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] text-center"
                        />
                      </div>
                    </div>

                    {/* Costing Summary Dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60">
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Себестоимость ТМЦ</div>
                        <div className="text-base font-black text-gray-900 dark:text-white font-mono mt-1">
                          {costMaterials.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Себестоимость Работ</div>
                        <div className="text-base font-black text-gray-900 dark:text-white font-mono mt-1">
                          {costWorks.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono font-black text-emerald-500">Цена для клиента</div>
                        <div className="text-lg font-black text-emerald-500 font-mono mt-1">
                          {clientPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono font-black text-[#F95700]">Чистая прибыль</div>
                        <div className="text-lg font-black text-[#F95700] font-mono mt-1">
                          {netProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* SERIAL TAB */}
        {activeTab === 'serial' && (
          <motion.div 
            key="serial" 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Products Registry */}
              <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2.5rem-0.25rem)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                      <PackageSearch className="w-5 h-5 text-[#F95700]"/> Реестр изделий (BOM)
                    </h3>
                    <button onClick={() => setIsCreateProductModalOpen(true)} className="bg-[#F95700] hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer font-mono uppercase tracking-wider"><Plus className="w-4 h-4"/> Создать</button>
                  </div>
                  
                  <div className="space-y-4">
                    {products.map(p => (
                      <div key={p.id} className="p-4 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 flex gap-4">
                        <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-850 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                          {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Image className="w-8 h-8 text-zinc-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white font-sans">{p.name}</h4>
                            <span className="font-mono text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-300">{p.weight} кг</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 mb-2 line-clamp-1">{p.description || 'Нет описания'}</p>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex gap-2">
                              {p.pdf_url && <a href={p.pdf_url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 flex items-center gap-1 hover:underline font-mono uppercase tracking-wider"><FileText className="w-3 h-3"/> Чертеж PDF</a>}
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] uppercase text-zinc-400 dark:text-zinc-500 font-bold font-mono">Себестоимость</div>
                              <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">{p.cost_price.toLocaleString()} ₽</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && <div className="text-center text-zinc-500 py-8 text-xs font-mono">Нет изделий в BOM.</div>}
                  </div>
                </div>
              </div>
              
              {/* Orders Kanban / List */}
              <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
                <div className="bg-white dark:bg-zinc-955 p-6 rounded-[calc(2.5rem-0.25rem)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                      <Factory className="w-5 h-5 text-blue-500"/> Заказы в производстве
                    </h3>
                    <button onClick={() => setIsLaunchBatchModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer font-mono uppercase tracking-wider"><Plus className="w-4 h-4"/> Запустить партию</button>
                  </div>
                  
                  <div className="space-y-4">
                    {orders.map(o => {
                      const activeSub = orderSubtabs[o.id] || 'ops';
                      return (
                        <div key={o.id} className="p-5 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl bg-zinc-50/20 dark:bg-zinc-900/10 shadow-sm space-y-4">
                          <div className="flex flex-wrap justify-between items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-lg font-mono">Заказ #{o.id}</span>
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase font-mono tracking-wider ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-500/20' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-500/20'}`}>
                                  {o.status === 'completed' ? 'Завершен' : 'В производстве'}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-white mt-1.5 font-sans">{o.product_name} <span className="text-zinc-400 dark:text-zinc-500 font-normal">x {o.quantity} шт</span></h4>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] font-black uppercase font-mono tracking-wider">
                              <div className="text-right">
                                <div className="text-zinc-400">Кромка</div>
                                <div className="text-blue-500 font-bold font-mono">{o.total_edge_meters || 0} м</div>
                              </div>
                              <div className="text-right">
                                <div className="text-zinc-400">Фурнитура</div>
                                <div className="text-emerald-500 font-bold font-mono">{(o.total_fittings_cost || 0).toLocaleString()} ₽</div>
                              </div>
                            </div>
                          </div>

                          {/* Order Subtabs */}
                          <div className="flex gap-2 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                            <button
                              onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'ops' })}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${activeSub === 'ops' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                              <Layers className="w-3.5 h-3.5" /> Маршрутный лист
                            </button>
                            <button
                              onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'fittings' })}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${activeSub === 'fittings' ? 'bg-[#F95700] text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                              <Wrench className="w-3.5 h-3.5" /> Фурнитура ({o.fittings?.length || 0})
                            </button>
                            <button
                              onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'details' })}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${activeSub === 'details' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                            >
                              <Ruler className="w-3.5 h-3.5" /> Распил и Кромка ({o.details?.length || 0})
                            </button>
                          </div>

                          {/* SUBTAB 1: Operations */}
                          {activeSub === 'ops' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {o.operations.map((op: any) => (
                                  <button 
                                    key={op.id}
                                    onClick={() => { if(op.status !== 'completed') handleCompleteOp(op.id); }}
                                    disabled={op.status === 'completed'}
                                    className={`p-2.5 rounded-xl border text-left text-[10px] transition-colors flex flex-col justify-between h-14 ${
                                      op.status === 'completed' 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default' 
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-blue-500 cursor-pointer'
                                    }`}
                                  >
                                    <span className="font-bold font-sans">{op.name}</span>
                                    <div className="flex items-center gap-1 mt-1 font-mono uppercase tracking-wider text-[8px]">
                                      {op.status === 'completed' ? <CheckCircle className="w-3 h-3 text-emerald-500"/> : <Clock className="w-3 h-3 opacity-50"/>}
                                      <span>{op.status === 'completed' ? 'Готово' : 'Ожидает'}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* SUBTAB 2: Fittings */}
                          {activeSub === 'fittings' && (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono uppercase">Фурнитура заказа</span>
                                <button
                                  onClick={() => setAddFittingOrderId(o.id)}
                                  className="px-3 py-1.5 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Добавить
                                </button>
                              </div>

                              <div className="space-y-2">
                                {!o.fittings || o.fittings.length === 0 ? (
                                  <div className="text-center py-6 text-[10px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl font-mono uppercase">
                                    Фурнитура не добавлена
                                  </div>
                                ) : (
                                  o.fittings.map((fit: any) => (
                                    <div key={fit.id} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs">
                                      <div>
                                        <div className="font-bold text-zinc-900 dark:text-white font-sans">{fit.fitting_name}</div>
                                        <div className="text-[9px] text-zinc-400 mt-0.5 font-mono">Арт: {fit.article} | Поставщик: {fit.supplier}</div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="font-mono text-right">
                                          <div className="font-bold text-zinc-900 dark:text-white">{fit.quantity} шт</div>
                                          <div className="text-[9px] text-zinc-400">{fit.unit_price} ₽ / шт</div>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const nextStatus = fit.status === 'pending' ? 'ordered' : fit.status === 'ordered' ? 'in_stock' : 'issued';
                                            handleUpdateFittingStatus(fit.id, nextStatus);
                                          }}
                                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider cursor-pointer ${
                                            fit.status === 'in_stock' ? 'bg-emerald-500/10 text-emerald-600' :
                                            fit.status === 'ordered' ? 'bg-blue-500/10 text-blue-500' :
                                            fit.status === 'issued' ? 'bg-purple-500/10 text-purple-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                          }`}
                                        >
                                          {fit.status === 'in_stock' ? 'На складе' : fit.status === 'ordered' ? 'Заказана' : fit.status === 'issued' ? 'Выдана' : 'Ожидает'}
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* SUBTAB 3: Details */}
                          {activeSub === 'details' && (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono uppercase">Карта деталей и кромка</span>
                                <button
                                  onClick={() => setAddDetailOrderId(o.id)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Добавить деталь
                                </button>
                              </div>

                              <div className="space-y-2">
                                {!o.details || o.details.length === 0 ? (
                                  <div className="text-center py-6 text-[10px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl font-mono uppercase">
                                    Детали для этого заказа не созданы
                                  </div>
                                ) : (
                                  o.details.map((det: any) => (
                                    <div key={det.id} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs space-y-2">
                                      <div className="flex justify-between items-center">
                                        <div className="font-bold text-zinc-900 dark:text-white font-sans">{det.detail_name}</div>
                                        <div className="font-mono font-bold text-[#F95700] text-[10px] bg-orange-500/10 px-2 py-0.5 rounded">Кромка: {det.calc_linear_meters} м</div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2 text-[9px] font-bold font-mono text-zinc-400 dark:text-zinc-500 uppercase">
                                        <div>Размер: <span className="text-zinc-900 dark:text-white font-mono">{det.length_mm}x{det.width_mm}</span></div>
                                        <div>Кол-во: <span className="text-zinc-900 dark:text-white font-mono">{det.quantity} шт</span></div>
                                        <div className="col-span-2 truncate">Кромка: <span className="text-[#F95700] font-mono">{det.edge_top}/{det.edge_bottom}/{det.edge_left}/{det.edge_right}</span></div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                    {orders.length === 0 && <div className="text-center text-zinc-500 py-8 text-xs font-mono">Активные заказы отсутствуют.</div>}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FITTINGS TAB */}
        {activeTab === 'fittings' && (
          <motion.div 
            key="fittings" 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Fittings Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Общая кромка пог. м</span>
                  <div className="p-2 bg-orange-500/10 rounded-xl text-[#F95700]">
                    <Ruler className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3 font-mono">
                  {(
                    orders.reduce((acc, o) => acc + (o.total_edge_meters || 0), 0) + totalLiveEdgeMeters
                  ).toFixed(1)} м
                </div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-1">ПВХ 0.4 мм / ПВХ 2.0 мм / АБС</div>
              </div>

              <div className="bg-white dark:bg-zinc-955 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Позиций фурнитуры</span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <PackageSearch className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3 font-mono">
                  {orders.reduce((acc, o) => acc + (o.fittings?.length || 0), 0) + 4} шт.
                </div>
                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider font-mono mt-1">Комплектация под контроль</div>
              </div>

              <div className="bg-white dark:bg-zinc-955 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Расход клея EVA/PUR</span>
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                    <Factory className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3 font-mono">
                  {((orders.reduce((acc, o) => acc + (o.total_edge_meters || 0), 0) + totalLiveEdgeMeters) * 0.025).toFixed(2)} кг
                </div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-1">Норма 25 г на 1 пог. м кромки</div>
              </div>
            </div>

            {/* Fittings Catalog */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-[#F95700]" />
                      Сводный реестр фурнитуры
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (orders.length > 0) {
                        setAddFittingOrderId(orders[0].id);
                      } else {
                        showToast('Сначала создайте заказ в серийном производстве', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider">
                        <th className="pb-3 pr-4">Артикул</th>
                        <th className="pb-3 pr-4">Наименование</th>
                        <th className="pb-3 pr-4">Поставщик</th>
                        <th className="pb-3 pr-4">Кол-во</th>
                        <th className="pb-3 pr-4">Цена</th>
                        <th className="pb-3 pr-4">Сумма</th>
                        <th className="pb-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40 text-xs">
                      {[
                        { article: '71B3550', name: 'Петля Blum CLIP top 110° с доводчиком', supplier: 'Блум Рус', qty: 24, price: 420, status: 'in_stock' },
                        { article: '560H5000C', name: 'Направляющие Tandem 500мм с доводчиком', supplier: 'Блум Рус', qty: 6, price: 1850, status: 'ordered' },
                        { article: 'MDM-092', name: 'Ручка торцевая черная матовая 192мм', supplier: 'МДМ Комплект', qty: 12, price: 310, status: 'in_stock' },
                        { article: 'HAF-341', name: 'Стяжка эксцентриковая Minifix 15', supplier: 'Hafele', qty: 80, price: 15, status: 'issued' },
                      ].map((fit, idx) => (
                        <tr key={`default-${idx}`} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-[10px] font-black text-[#F95700]">{fit.article}</td>
                          <td className="py-3.5 pr-4 font-bold text-gray-900 dark:text-white font-sans">{fit.name}</td>
                          <td className="py-3.5 pr-4 text-zinc-500 text-xs">{fit.supplier}</td>
                          <td className="py-3.5 pr-4 font-mono font-bold">{fit.qty} шт</td>
                          <td className="py-3.5 pr-4 font-mono text-zinc-400">{fit.price} ₽</td>
                          <td className="py-3.5 pr-4 font-mono font-black text-gray-900 dark:text-white">{(fit.qty * fit.price).toLocaleString()} ₽</td>
                          <td className="py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              На складе
                            </span>
                          </td>
                        </tr>
                      ))}

                      {orders.flatMap(o => (o.fittings || []).map((fit: any) => (
                        <tr key={fit.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-[10px] font-black text-[#F95700]">{fit.article}</td>
                          <td className="py-3.5 pr-4 font-bold text-gray-900 dark:text-white font-sans">
                            {fit.fitting_name}
                            <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px] text-zinc-400 font-mono font-normal">
                              Заказ #{o.id}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-zinc-500 text-xs">{fit.supplier}</td>
                          <td className="py-3.5 pr-4 font-mono font-bold">{fit.quantity} шт</td>
                          <td className="py-3.5 pr-4 font-mono text-zinc-400">{fit.unit_price} ₽</td>
                          <td className="py-3.5 pr-4 font-mono font-black text-gray-900 dark:text-white">{(fit.quantity * fit.unit_price).toLocaleString()} ₽</td>
                          <td className="py-3.5">
                            <button
                              onClick={() => {
                                const nextStatus = fit.status === 'pending' ? 'ordered' : fit.status === 'ordered' ? 'in_stock' : 'issued';
                                handleUpdateFittingStatus(fit.id, nextStatus);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase font-mono tracking-wider cursor-pointer transition-all active:scale-[0.98] ${
                                fit.status === 'in_stock' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                fit.status === 'ordered' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                fit.status === 'issued' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {fit.status === 'in_stock' ? 'На складе' : fit.status === 'ordered' ? 'Заказана' : fit.status === 'issued' ? 'Выдана' : 'Ожидает'}
                            </button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 4 cols: Edge Banding Breakdown */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 shadow-sm">
                  <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans mb-4 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-[#F95700]" />
                    Расход кромки по толщинам
                  </h4>
                  <div className="space-y-4">
                    <div className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white font-sans">ПВХ 0.4 мм (Внутренние полки)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Скрытые торцы деталей</div>
                      </div>
                      <div className="font-mono font-black text-sm text-[#F95700]">
                        {(totalLiveEdgeMeters * 0.4).toFixed(1)} м
                      </div>
                    </div>

                    <div className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white font-sans">ПВХ 2.0 мм (Фасады и торец)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Ударопрочный внешний контур</div>
                      </div>
                      <div className="font-mono font-black text-sm text-[#F95700]">
                        {(totalLiveEdgeMeters * 0.6).toFixed(1)} м
                      </div>
                    </div>

                    <div className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white font-sans">АБС-пластик 1.0 мм (Премиум)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Влагозащитный кухонный профиль</div>
                      </div>
                      <div className="font-mono font-black text-sm text-zinc-400 font-mono">{totalLiveEdgeMeters > 0 ? '14.5' : '0.0'} м</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/30">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500">
                      <span>Рекомендуемый запас:</span>
                      <span className="font-bold text-[#F95700] font-mono">+8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <motion.div 
            key="schedule"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
              <div className="bg-white dark:bg-zinc-950 p-8 rounded-[calc(2.5rem-0.25rem)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 dark:border-zinc-850 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#F95700]" /> Календарь Замеров и Монтажей
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-1 font-bold font-mono uppercase tracking-wider">График выездов конструкторов и сборочных бригад</p>
                  </div>
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="px-5 py-2.5 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10 flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" /> Назначить выезд
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDate(day.dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === day.dateStr;

                    return (
                      <div key={idx} className="flex flex-col min-h-[300px] bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/60 dark:border-zinc-850/60 rounded-2xl p-3">
                        <div className="text-center pb-2.5 mb-3 border-b border-zinc-200/30 dark:border-zinc-800/30 flex justify-between items-center px-1">
                          <span className="text-[9px] uppercase font-mono font-black text-zinc-400 dark:text-zinc-500">{day.dayName}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-mono font-black ${isToday ? 'w-5 h-5 rounded-full bg-[#F95700] text-white flex items-center justify-center font-bold shadow-sm' : 'text-zinc-950 dark:text-white'}`}>
                              {day.dayNum}
                            </span>
                            <span className="text-[8px] uppercase font-mono font-bold text-zinc-400 dark:text-zinc-500">{day.monthName}</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2.5">
                          {dayEvents.map((evt: any) => {
                            const isMeasure = evt.type === 'measurement';
                            const isDelivery = evt.type === 'delivery';
                            return (
                              <div 
                                key={evt.id} 
                                className={`p-3 rounded-xl border text-[10px] font-semibold space-y-1.5 shadow-sm transition-transform hover:-translate-y-[1px] ${
                                  isMeasure 
                                    ? 'bg-orange-500/[0.04] border-orange-500/20 text-[#F95700]' 
                                    : isDelivery
                                    ? 'bg-blue-500/[0.04] border-blue-500/20 text-blue-500'
                                    : 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                <div className="flex justify-between items-center font-mono font-black text-[9px] border-b border-zinc-200/10 pb-1 uppercase tracking-wider">
                                  <span>{isMeasure ? '📐 Замер' : isDelivery ? '🚚 Доставка' : '🔧 Монтаж'}</span>
                                  <span>{evt.time}</span>
                                </div>
                                <div className="font-bold text-zinc-900 dark:text-white font-sans leading-tight">{evt.client_name}</div>
                                <div className="text-zinc-500 dark:text-zinc-400 leading-normal truncate" title={evt.address}>{evt.address}</div>
                                <div className="text-[9px] font-mono opacity-80 pt-1 flex items-center gap-1 font-bold">
                                  <Users className="w-3 h-3 text-[#F95700]" /> {evt.master_name}
                                </div>
                              </div>
                            );
                          })}
                          {dayEvents.length === 0 && (
                            <div className="h-full flex items-center justify-center py-10 text-center text-zinc-400 dark:text-zinc-600 text-[9px] font-black uppercase tracking-widest font-mono">
                              Свободно
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== MODAL: НАСТРОЙКА ИИ-БОТА ====== */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#F95700]" /> Настройка ИИ-Ассистента
              </h3>
              <button onClick={() => setIsBotModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveBotConfig} className="space-y-4">
              <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-855/60">
                <label className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <span className="font-sans">Автоприем заявок из Telegram</span>
                  <input 
                    type="checkbox" 
                    checked={botConfig.is_active} 
                    onChange={e => setBotConfig({ ...botConfig, is_active: e.target.checked })} 
                    className="rounded border-zinc-300 text-[#F95700] focus:ring-[#F95700] w-4 h-4 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <span className="font-sans">Автоназначение замеров</span>
                  <input 
                    type="checkbox" 
                    checked={botConfig.auto_assign} 
                    onChange={e => setBotConfig({ ...botConfig, auto_assign: e.target.checked })} 
                    className="rounded border-zinc-300 text-[#F95700] focus:ring-[#F95700] w-4 h-4 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <span className="font-sans">Напоминания о монтаже</span>
                  <input 
                    type="checkbox" 
                    checked={botConfig.reminders} 
                    onChange={e => setBotConfig({ ...botConfig, reminders: e.target.checked })} 
                    className="rounded border-zinc-300 text-[#F95700] focus:ring-[#F95700] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Токен Telegram Бота</label>
                <input
                  type="text"
                  placeholder="748392019:AAFnXj83920..."
                  value={botConfig.bot_token}
                  onChange={e => setBotConfig({ ...botConfig, bot_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Имя Бота</label>
                <input
                  type="text"
                  placeholder="SpheraFurnitureBot"
                  value={botConfig.bot_name}
                  onChange={e => setBotConfig({ ...botConfig, bot_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsBotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Сохранить настройки
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: НАСТРОЙКА ИМПОРТА ДЕТАЛЕЙ ====== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> Импорт из Базис / PRO100 / Excel
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[10px] text-zinc-500 leading-relaxed font-bold">
                <p className="uppercase text-blue-500 font-black mb-1">Инструкция по формату:</p>
                Вставьте строки деталировки в текстовое поле или выберите файл CSV/TXT. Формат строк:<br />
                <code className="text-[#F95700] font-mono font-black">Название_детали ; Длина ; Ширина ; Количество ; Кромка_В/Н/Л/П</code><br />
                Пример:<br />
                <code className="font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded">Боковина левая ; 2200 ; 600 ; 2 ; 2/0/0/0</code>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-2">Загрузить файл детализации (.csv, .txt)</label>
                <input 
                  type="file" 
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20 file:cursor-pointer cursor-pointer"
                />
              </div>

              <div className="flex items-center my-3 text-zinc-400 text-xs">
                <div className="flex-1 border-t border-zinc-200 dark:border-zinc-850" />
                <span className="px-3 font-mono font-bold text-[9px] uppercase tracking-wider">Или вставьте текст</span>
                <div className="flex-1 border-t border-zinc-200 dark:border-zinc-850" />
              </div>

              <div>
                <textarea
                  rows={6}
                  placeholder="Боковина;2200;600;2;2/0/0/0&#10;Полка;870;550;6;2/0/2/0"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button 
                  type="button"
                  onClick={() => handleImportSpecs(importText)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider"
                >
                  Импортировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: НАЗНАЧИТЬ ВЫЕЗД (SCHEDULE) ====== */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#F95700]" /> Назначить новый выезд
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEventSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Тип выезда *</label>
                <select
                  required
                  value={newEvent.type}
                  onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-sans cursor-pointer"
                >
                  <option value="measurement">📐 Замер помещения</option>
                  <option value="delivery">🚚 Доставка мебели</option>
                  <option value="installation">🔧 Монтаж / Установка</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Дата *</label>
                  <input
                    type="date" required
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Время *</label>
                  <input
                    type="time" required
                    value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Имя Клиента *</label>
                <input
                  type="text" required
                  placeholder="Иван Петров"
                  value={newEvent.client_name}
                  onChange={e => setNewEvent({ ...newEvent, client_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Телефон клиента</label>
                  <input
                    type="text"
                    placeholder="+7 (999) 777-66-55"
                    value={newEvent.client_phone}
                    onChange={e => setNewEvent({ ...newEvent, client_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Исполнитель *</label>
                  <input
                    type="text" required
                    placeholder="Конструктор / Монтажники"
                    value={newEvent.master_name}
                    onChange={e => setNewEvent({ ...newEvent, master_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Адрес объекта *</label>
                <input
                  type="text" required
                  placeholder="ул. Пушкина, д. 8, кв. 14"
                  value={newEvent.address}
                  onChange={e => setNewEvent({ ...newEvent, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Назначить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: ДОБАВИТЬ ФУРНИТУРУ ====== */}
      {addFittingOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white font-sans uppercase tracking-wider">Фурнитура к заказу #{addFittingOrderId}</h3>
              <button onClick={() => setAddFittingOrderId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAddFittingSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Наименование фурнитуры</label>
                <input
                  type="text" required
                  value={newFitting.fitting_name}
                  onChange={e => setNewFitting({ ...newFitting, fitting_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Артикул / Код</label>
                  <input
                    type="text"
                    value={newFitting.article}
                    onChange={e => setNewFitting({ ...newFitting, article: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Поставщик</label>
                  <input
                    type="text"
                    value={newFitting.supplier}
                    onChange={e => setNewFitting({ ...newFitting, supplier: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Количество (шт)</label>
                  <input
                    type="number" required min={1}
                    value={newFitting.quantity}
                    onChange={e => setNewFitting({ ...newFitting, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Цена за шт (₽)</label>
                  <input
                    type="number" required min={0}
                    value={newFitting.unit_price}
                    onChange={e => setNewFitting({ ...newFitting, unit_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setAddFittingOrderId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: ДОБАВИТЬ ДЕТАЛЬ ====== */}
      {addDetailOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white font-sans uppercase tracking-wider">Деталь и кромка к заказу #{addDetailOrderId}</h3>
              <button onClick={() => setAddDetailOrderId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAddDetailSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Название детали</label>
                <input
                  type="text" required
                  value={newDetail.detail_name}
                  onChange={e => setNewDetail({ ...newDetail, detail_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Длина (мм)</label>
                  <input
                    type="number" required
                    value={newDetail.length_mm}
                    onChange={e => setNewDetail({ ...newDetail, length_mm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Ширина (мм)</label>
                  <input
                    type="number" required
                    value={newDetail.width_mm}
                    onChange={e => setNewDetail({ ...newDetail, width_mm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Кол-во шт</label>
                  <input
                    type="number" required min={1}
                    value={newDetail.quantity}
                    onChange={e => setNewDetail({ ...newDetail, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Кромление сторон (Выберите материал кромки)</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Верх</span>
                    <select
                      value={newDetail.edge_top}
                      onChange={e => setNewDetail({ ...newDetail, edge_top: e.target.value })}
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold dark:text-white font-sans"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Низ</span>
                    <select
                      value={newDetail.edge_bottom}
                      onChange={e => setNewDetail({ ...newDetail, edge_bottom: e.target.value })}
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold dark:text-white font-sans"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Левая</span>
                    <select
                      value={newDetail.edge_left}
                      onChange={e => setNewDetail({ ...newDetail, edge_left: e.target.value })}
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold dark:text-white font-sans"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Правая</span>
                    <select
                      value={newDetail.edge_right}
                      onChange={e => setNewDetail({ ...newDetail, edge_right: e.target.value })}
                      className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold dark:text-white font-sans"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setAddDetailOrderId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: СОЗДАТЬ ИЗДЕЛИЕ BOM ====== */}
      {isCreateProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-[#F95700]" /> Новое изделие (BOM)
              </h3>
              <button onClick={() => setIsCreateProductModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProductSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Название изделия *</label>
                <input
                  type="text" required
                  placeholder="Шкаф-купе двухдверный..."
                  value={newProductData.name}
                  onChange={e => setNewProductData({ ...newProductData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Описание / Спецификация</label>
                <textarea
                  rows={2} placeholder="Параметры, чертежи, спецификации..."
                  value={newProductData.description}
                  onChange={e => setNewProductData({ ...newProductData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-955 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Масса изделия (кг)</label>
                  <input
                    type="number" min={0} step={0.1}
                    value={newProductData.weight}
                    onChange={e => setNewProductData({ ...newProductData, weight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 bg-zinc-50 dark:bg-zinc-955 text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Себестоимость ТМЦ (₽)</label>
                  <input
                    type="number" min={0}
                    value={newProductData.cost_price}
                    onChange={e => setNewProductData({ ...newProductData, cost_price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 bg-zinc-50 dark:bg-zinc-955 text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsCreateProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: ЗАПУСТИТЬ ПАРТИЮ ====== */}
      {isLaunchBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-500" /> Запуск партии в цех
              </h3>
              <button onClick={() => setIsLaunchBatchModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleLaunchBatchSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Изделие из реестра BOM *</label>
                <select
                  required
                  value={newBatchData.product_id}
                  onChange={e => setNewBatchData({ ...newBatchData, product_id: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
                >
                  <option value={0} disabled>— Выберите изделие —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="text-[10px] text-[#F95700] mt-1 font-mono uppercase tracking-wider font-bold">Сначала создайте изделие в BOM</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Количество (шт)</label>
                  <input
                    type="number" required min={1}
                    value={newBatchData.quantity}
                    onChange={e => setNewBatchData({ ...newBatchData, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 bg-zinc-50 dark:bg-zinc-955 text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Дата готовности</label>
                  <input
                    type="date"
                    value={newBatchData.deadline}
                    onChange={e => setNewBatchData({ ...newBatchData, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-855 bg-zinc-50 dark:bg-zinc-955 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Клиент / Заказчик</label>
                <input
                  type="text" placeholder="ООО МебельГрупп..."
                  value={newBatchData.client_name}
                  onChange={e => setNewBatchData({ ...newBatchData, client_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsLaunchBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Отмена
                </button>
                <button type="submit" disabled={products.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  🚀 Запустить в цех
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
