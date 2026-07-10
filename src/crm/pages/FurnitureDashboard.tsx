import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, PackageSearch, LayoutTemplate, Plus, Trash2, RotateCcw, AlertCircle, Settings, Scissors, FileText, Image, CheckCircle, Clock, Factory, Wrench, Layers, Ruler, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export default function FurnitureDashboard() {
  const [activeTab, setActiveTab] = useState<'serial' | 'raskroy' | 'fittings'>('raskroy');
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

  // Modals for Fittings and Details
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Hammer className="w-8 h-8 text-[#E64D00]" />
            Мебельное производство
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">Модуль CAD/CAM управления раскроем и кромлением</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-zinc-800/60 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'raskroy', label: 'Мастер Раскроя', icon: LayoutTemplate },
            { id: 'serial', label: 'Серийное производство', icon: Factory },
            { id: 'fittings', label: '🪛 Фурнитура и Кромка', icon: Wrench }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-zinc-900 text-[#E64D00] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* RASKROY TAB */}
        {activeTab === 'raskroy' && (
          <motion.div 
            key="raskroy"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Panel: Settings & Parts List */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Sheet Settings */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-zinc-400" />
                      Параметры листа
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Материал</label>
                      <input 
                        type="text" value={sheet.material_name} onChange={e => setSheet({...sheet, material_name: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-semibold dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Длина (L)</label>
                        <input type="number" value={sheet.width} onChange={e => setSheet({...sheet, width: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-mono dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Ширина (W)</label>
                        <input type="number" value={sheet.height} onChange={e => setSheet({...sheet, height: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-mono dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Рез пилы (мм)</label>
                        <input type="number" value={sheet.kerf} onChange={e => setSheet({...sheet, kerf: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-mono dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Толщина</label>
                        <input type="number" value={sheet.thickness} onChange={e => setSheet({...sheet, thickness: Number(e.target.value)})} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-mono dark:text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Опиловка краев (Верх/Низ/Лев/Прав)</label>
                      <div className="flex gap-2">
                        <input type="number" value={sheet.trim_top} onChange={e => setSheet({...sheet, trim_top: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white text-center" />
                        <input type="number" value={sheet.trim_bottom} onChange={e => setSheet({...sheet, trim_bottom: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white text-center" />
                        <input type="number" value={sheet.trim_left} onChange={e => setSheet({...sheet, trim_left: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white text-center" />
                        <input type="number" value={sheet.trim_right} onChange={e => setSheet({...sheet, trim_right: Number(e.target.value)})} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white text-center" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parts List */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-480px)] min-h-[460px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#E64D00]" />
                      Деталировка ({parts.length})
                    </h3>
                    <button onClick={handleAddPart} className="text-xs font-bold text-[#E64D00] hover:text-[#ff6a1a] flex items-center gap-1 bg-[#E64D00]/10 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Добавить
                    </button>
                  </div>

                  {/* LIVE EDGE BANDING CALCULATOR BANNER */}
                  <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-[#E64D00]" /> Расчёт кромки: <span className="text-[#E64D00] font-black">{totalLiveEdgeMeters.toFixed(2)} пог.м</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Автоматически по периметру сторон деталей</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('fittings')}
                      className="px-2.5 py-1 bg-[#E64D00] text-white font-bold rounded-lg text-[11px] hover:bg-[#ff6a1a] transition-colors"
                    >
                      К фурнитуре →
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
                        <div key={p.id} className="p-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-950/50 relative group">
                          <button onClick={() => handleRemovePart(p.id)} className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-zinc-900 rounded-md shadow-sm border border-gray-100 dark:border-zinc-800">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="flex gap-2 mb-2 pr-8">
                            <input type="text" value={p.part_id} onChange={e => handlePartChange(p.id, 'part_id', e.target.value)} placeholder="ID" className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white" />
                            <input type="text" value={p.name} onChange={e => handlePartChange(p.id, 'name', e.target.value)} placeholder="Название" className="flex-1 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-xs font-semibold dark:text-white" />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input type="number" value={p.width} onChange={e => handlePartChange(p.id, 'width', e.target.value)} placeholder="Длина" title="Длина (L)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white" />
                            <span className="text-zinc-400 font-mono text-[10px]">x</span>
                            <input type="number" value={p.height} onChange={e => handlePartChange(p.id, 'height', e.target.value)} placeholder="Ширина" title="Ширина (W)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono dark:text-white" />
                            <span className="text-zinc-400 font-mono text-[10px] ml-1">шт:</span>
                            <input type="number" value={p.count} onChange={e => handlePartChange(p.id, 'count', e.target.value)} className="w-12 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-xs font-mono font-bold text-[#E64D00]" />
                          </div>
                          
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                            <label className="flex items-center gap-1.5 text-zinc-500 cursor-pointer">
                              <input type="checkbox" checked={p.can_rotate} onChange={e => handlePartChange(p.id, 'can_rotate', e.target.checked)} className="rounded border-gray-300 text-[#E64D00] focus:ring-[#E64D00]" />
                              <span>Вращение</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-400" title="Расход кромки на деталь">Кромка: <b className="text-[#E64D00]">{partEdgeMeters}м</b></span>
                              <input type="text" value={p.edge_banding} onChange={e => handlePartChange(p.id, 'edge_banding', e.target.value)} placeholder="2/0/2/0" title="Стороны кромки В/Н/Л/П (мм)" className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-[10px] font-mono dark:text-white text-center" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                    <button 
                      onClick={calculateRaskroy}
                      disabled={isCalculating || parts.length === 0}
                      className="w-full bg-[#E64D00] hover:bg-[#ff6a1a] text-white font-black py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCalculating ? (
                        <>
                          <RotateCcw className="w-5 h-5 animate-spin" /> Рассчитываем 2D алгоритм...
                        </>
                      ) : (
                        <>
                          <LayoutTemplate className="w-5 h-5" /> Оптимизировать Раскрой
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Visualization */}
              <div className="lg:col-span-8">
                {raskroyResult ? (
                  <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Листов</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{raskroyResult.total_sheets_used} шт</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Полезный Выход</div>
                        <div className="text-2xl font-black text-emerald-500">{raskroyResult.summary_yield_pct}%</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">Отходы</div>
                        <div className="text-2xl font-black text-rose-500">{raskroyResult.summary_waste_pct}%</div>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Деталей / Остатков</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">
                          {raskroyResult.total_parts_placed} <span className="text-zinc-400 font-normal">/</span> <span className="text-blue-500">{raskroyResult.total_reusable_offcuts}</span>
                        </div>
                      </div>
                    </div>

                    {raskroyResult.unplaced_parts?.length > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-4 rounded-xl text-rose-600 dark:text-rose-400 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-sm">Внимание! {raskroyResult.unplaced_parts.length} деталей не поместились (превышают габариты):</div>
                          <ul className="mt-1 text-xs list-disc pl-5">
                            {raskroyResult.unplaced_parts.map((up: any, i: number) => (
                              <li key={i}>{up.name} ({up.width} x {up.height})</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Sheets Map View */}
                    <div className="space-y-8">
                      {raskroyResult.sheets.map((s: any) => {
                        const sheetRatio = sheet.width / sheet.height;
                        const pxWidth = sheet.width;
                        const pxHeight = sheet.height;

                        return (
                          <div key={s.sheet_index} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-black font-['Montserrat'] text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <div className="w-6 h-6 rounded bg-[#E64D00] text-white flex items-center justify-center text-xs">{s.sheet_index}</div>
                                Карта {s.sheet_index} 
                              </h4>
                              <div className="flex gap-4 text-xs font-semibold text-zinc-500">
                                <span>Выход: <span className="text-emerald-500">{s.yield_percentage}%</span></span>
                                <span>Рез: {s.total_cut_length_mm} мм</span>
                              </div>
                            </div>
                            
                            {/* SVG / Canvas container for Wood Texture */}
                            <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-xl p-4 overflow-hidden flex justify-center items-center">
                                {/* The physical sheet representation */}
                                <div 
                                  className="relative shadow-xl mx-auto"
                                  style={{ 
                                    width: '100%', 
                                    maxWidth: '800px',
                                    aspectRatio: `${sheetRatio}`, 
                                    backgroundColor: '#e6d0b5', // Wood color
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
                                    border: '2px solid #8b5a2b'
                                  }}
                                >
                                  {/* Trim area visualized as darker border? No, parts are offset by trim. Let's just draw parts. */}
                                  
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
                                      title={`${p.name} - ${p.width}x${p.height} мм`}
                                    >
                                      <span className="text-[#8b5a2b] font-black text-[8px] md:text-[10px] uppercase truncate px-1 max-w-full drop-shadow-sm">{p.part_id}</span>
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
                                          ? 'bg-emerald-500/30 border-emerald-600 backdrop-blur-sm' 
                                          : 'bg-red-900/10 border-red-900/20 pattern-diagonal-lines pattern-red-900 pattern-bg-transparent pattern-size-4 pattern-opacity-10'
                                      } flex items-center justify-center overflow-hidden`}
                                      style={{
                                        left: `${(o.x / pxWidth) * 100}%`,
                                        top: `${(o.y / pxHeight) * 100}%`,
                                        width: `${(o.width / pxWidth) * 100}%`,
                                        height: `${(o.height / pxHeight) * 100}%`
                                      }}
                                    >
                                      {o.is_reusable && o.width > 200 && o.height > 200 && (
                                        <span className="text-emerald-800 font-black text-[10px] uppercase tracking-widest px-1 transform -rotate-45">♻️ ОСТАТОК</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-zinc-400">
                    <LayoutTemplate className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Нажмите «Оптимизировать Раскрой»</h3>
                    <p className="text-sm max-w-sm text-center leading-relaxed">Наш математический движок сгенерирует 2D-карты кроя с учетом толщины пропила и текстуры волокон за доли секунды.</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* SERIAL TAB */}
        {activeTab === 'serial' && (
          <motion.div key="serial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Products Registry */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xl flex items-center gap-2 dark:text-white"><PackageSearch className="w-6 h-6 text-[#E64D00]"/> Реестр изделий (BOM)</h3>
                  <button className="bg-[#E64D00] text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Создать</button>
                </div>
                
                <div className="space-y-4">
                  {products.map(p => (
                    <div key={p.id} className="p-4 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-950 flex gap-4">
                      <div className="w-20 h-20 bg-gray-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Image className="w-8 h-8 text-zinc-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg dark:text-white">{p.name}</h4>
                          <span className="font-mono text-sm bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">{p.weight} кг</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 mb-2 line-clamp-1">{p.description || 'Нет описания'}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex gap-2">
                            {p.pdf_url && <a href={p.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline"><FileText className="w-3 h-3"/> Чертеж PDF</a>}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-zinc-500 font-bold">Себестоимость ТМЦ</div>
                            <div className="font-black text-emerald-600 dark:text-emerald-400">{p.cost_price.toLocaleString()} ₽</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <div className="text-center text-zinc-500 py-8">Нет добавленных изделий</div>}
                </div>
              </div>
              
              {/* Orders Kanban / List */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xl flex items-center gap-2 dark:text-white"><Factory className="w-6 h-6 text-blue-500"/> Заказы в производстве</h3>
                  <button className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Запустить партию</button>
                </div>
                
                <div className="space-y-4">
                  {orders.map(o => {
                    const activeSub = orderSubtabs[o.id] || 'ops';
                    return (
                      <div key={o.id} className="p-5 border border-blue-200 dark:border-blue-900/40 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 px-2.5 py-1 rounded-lg">Заказ #{o.id}</span>
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                                {o.status === 'completed' ? 'Завершен' : 'В производстве'}
                              </span>
                            </div>
                            <h4 className="font-bold text-lg dark:text-white mt-1">{o.product_name} <span className="text-zinc-500 font-normal">x {o.quantity} шт</span></h4>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-semibold">
                            <div className="text-right">
                              <div className="text-zinc-400 text-[11px]">Кромление (пог.м)</div>
                              <div className="text-blue-600 dark:text-blue-400 font-bold">{o.total_edge_meters || 0} м</div>
                            </div>
                            <div className="text-right">
                              <div className="text-zinc-400 text-[11px]">Фурнитура (руб)</div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">{(o.total_fittings_cost || 0).toLocaleString()} ₽</div>
                            </div>
                          </div>
                        </div>

                        {/* Order Subtabs */}
                        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <button
                            onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'ops' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeSub === 'ops' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                          >
                            <Layers className="w-3.5 h-3.5" /> Маршрутный лист
                          </button>
                          <button
                            onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'fittings' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeSub === 'fittings' ? 'bg-[#E64D00] text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                          >
                            <Wrench className="w-3.5 h-3.5" /> Фурнитура ({o.fittings?.length || 0})
                          </button>
                          <button
                            onClick={() => setOrderSubtabs({ ...orderSubtabs, [o.id]: 'details' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeSub === 'details' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                          >
                            <Ruler className="w-3.5 h-3.5" /> Раскрой и Кромка ({o.details?.length || 0})
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
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex flex-col justify-between h-14 ${
                                    op.status === 'completed' 
                                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 cursor-default' 
                                      : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-blue-500 cursor-pointer'
                                  }`}
                                >
                                  <span className="font-semibold">{op.name}</span>
                                  <div className="flex items-center gap-1 mt-1">
                                    {op.status === 'completed' ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3 opacity-50"/>}
                                    <span className="text-[10px]">{op.status === 'completed' ? 'Готово' : 'Ожидает'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 2: Fittings (Фурнитура индивидуальная) */}
                        {activeSub === 'fittings' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-zinc-500">Комплектация заказа индивидуальной фурнитурой</span>
                              <button
                                onClick={() => setAddFittingOrderId(o.id)}
                                className="px-3 py-1.5 bg-[#E64D00] hover:bg-[#ff6a1a] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" /> Добавить фурнитуру
                              </button>
                            </div>

                            <div className="space-y-2">
                              {!o.fittings || o.fittings.length === 0 ? (
                                <div className="text-center py-6 text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                  Для данного заказа фурнитура еще не добавлена
                                </div>
                              ) : (
                                o.fittings.map((fit: any) => (
                                  <div key={fit.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                      <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                                        {fit.fitting_name}
                                        {fit.article && <span className="text-xs font-mono px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300">арт. {fit.article}</span>}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        Поставщик: {fit.supplier || 'Не указан'} · Кол-во: <span className="font-bold text-zinc-900 dark:text-white">{fit.quantity} шт</span> · {fit.unit_price} ₽/шт
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${fit.status === 'issued' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : fit.status === 'in_stock' ? 'bg-blue-100 text-blue-700' : fit.status === 'ordered' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-700'}`}>
                                        {fit.status === 'issued' ? 'Выдана в цех' : fit.status === 'in_stock' ? 'На складе' : fit.status === 'ordered' ? 'Заказана' : 'Не заказана'}
                                      </span>

                                      <select
                                        value={fit.status}
                                        onChange={e => handleUpdateFittingStatus(fit.id, e.target.value)}
                                        className="text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium"
                                      >
                                        <option value="pending">Не заказана</option>
                                        <option value="ordered">Заказана</option>
                                        <option value="in_stock">На складе</option>
                                        <option value="issued">Выдана в цех</option>
                                      </select>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 3: Details & Edge Calculation (Раскрой и кромка) */}
                        {activeSub === 'details' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-zinc-500">Деталировка и автоматический калькулятор погонных метров кромки</span>
                              <button
                                onClick={() => setAddDetailOrderId(o.id)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" /> Добавить деталь и кромку
                              </button>
                            </div>

                            <div className="space-y-2">
                              {!o.details || o.details.length === 0 ? (
                                <div className="text-center py-6 text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                  Детали для расчета кромки еще не внесены
                                </div>
                              ) : (
                                o.details.map((det: any) => (
                                  <div key={det.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                      <div className="font-bold text-sm dark:text-white">
                                        {det.detail_name} <span className="font-normal text-zinc-500">({det.length_mm} × {det.width_mm} мм, {det.quantity} шт)</span>
                                      </div>
                                      <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                                        <span>Верх: <b>{det.edge_top}</b></span>
                                        <span>Низ: <b>{det.edge_bottom}</b></span>
                                        <span>Лево: <b>{det.edge_left}</b></span>
                                        <span>Право: <b>{det.edge_right}</b></span>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-[10px] uppercase text-zinc-400 font-bold">Расход кромки</div>
                                      <div className="text-sm font-black text-blue-600 dark:text-blue-400">{det.calc_linear_meters} пог.м</div>
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
                  {orders.length === 0 && <div className="text-center text-zinc-500 py-8">Нет активных заказов</div>}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3: FITTINGS & EDGE BANDING DASHBOARD */}
        {activeTab === 'fittings' && (
          <motion.div
            key="fittings-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Сумма фурнитуры</span>
                  <div className="p-2 bg-orange-500/10 rounded-xl text-[#E64D00]">
                    <Wrench className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
                  {orders.reduce((acc, o) => acc + (o.total_fittings_cost || 0), 0).toLocaleString()} ₽
                </div>
                <div className="text-xs text-zinc-500 mt-1">По всем заказам в производстве</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Потребность кромки</span>
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                    <Ruler className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
                  {(
                    orders.reduce((acc, o) => acc + (o.total_edge_meters || 0), 0) + totalLiveEdgeMeters
                  ).toFixed(1)} пог. м
                </div>
                <div className="text-xs text-zinc-500 mt-1">ПВХ 0.4 мм / ПВХ 2.0 мм / АБС</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Позиций фурнитуры</span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <PackageSearch className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
                  {orders.reduce((acc, o) => acc + (o.fittings?.length || 0), 0) + 4} шт.
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">Комплектация под контроль</div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Расход клея EVA/PUR</span>
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                    <Factory className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-3">
                  {((orders.reduce((acc, o) => acc + (o.total_edge_meters || 0), 0) + totalLiveEdgeMeters) * 0.025).toFixed(2)} кг
                </div>
                <div className="text-xs text-zinc-500 mt-1">Норма 25 г на 1 пог. м кромки</div>
              </div>
            </div>

            {/* Fittings Catalog & Edge Banding Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 cols: All Fittings List */}
              <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-[#E64D00]" />
                      Сводный реестр фурнитуры и комплектующих
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Петли, направляющие, крепёж, эксцентрики и мебельные ручки</p>
                  </div>
                  <button
                    onClick={() => {
                      if (orders.length > 0) {
                        setAddFittingOrderId(orders[0].id);
                      } else {
                        showToast('Сначала создайте заказ в серийном производстве', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-[#E64D00] hover:bg-[#ff6a1a] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Добавить фурнитуру
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-zinc-800 text-xs font-bold text-zinc-400 uppercase">
                        <th className="pb-3 pr-4">Артикул</th>
                        <th className="pb-3 pr-4">Наименование</th>
                        <th className="pb-3 pr-4">Поставщик</th>
                        <th className="pb-3 pr-4">Кол-во</th>
                        <th className="pb-3 pr-4">Цена</th>
                        <th className="pb-3 pr-4">Сумма</th>
                        <th className="pb-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                      {/* Standard default inventory items */}
                      {[
                        { article: '71B3550', name: 'Петля Blum CLIP top 110° с доводчиком', supplier: 'Блум Рус', qty: 24, price: 420, status: 'in_stock' },
                        { article: '560H5000C', name: 'Направляющие Tandem 500мм с доводчиком', supplier: 'Блум Рус', qty: 6, price: 1850, status: 'ordered' },
                        { article: 'MDM-092', name: 'Ручка торцевая черная матовая 192мм', supplier: 'МДМ Комплект', qty: 12, price: 310, status: 'in_stock' },
                        { article: 'HAF-341', name: 'Стяжка эксцентриковая Minifix 15', supplier: 'Hafele', qty: 80, price: 15, status: 'issued' },
                      ].map((fit, idx) => (
                        <tr key={`default-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-xs font-bold text-[#E64D00]">{fit.article}</td>
                          <td className="py-3.5 pr-4 font-semibold text-gray-900 dark:text-white">{fit.name}</td>
                          <td className="py-3.5 pr-4 text-zinc-500 text-xs">{fit.supplier}</td>
                          <td className="py-3.5 pr-4 font-mono">{fit.qty} шт</td>
                          <td className="py-3.5 pr-4 font-mono text-zinc-400">{fit.price} ₽</td>
                          <td className="py-3.5 pr-4 font-mono font-bold text-gray-900 dark:text-white">{(fit.qty * fit.price).toLocaleString()} ₽</td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              fit.status === 'in_stock'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : fit.status === 'ordered'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }`}>
                              {fit.status === 'in_stock' ? 'На складе' : fit.status === 'ordered' ? 'Заказана' : 'Выдана в цех'}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* User order fitting items */}
                      {orders.flatMap(o => (o.fittings || []).map((fit: any) => (
                        <tr key={fit.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-xs font-bold text-[#E64D00]">{fit.article}</td>
                          <td className="py-3.5 pr-4 font-semibold text-gray-900 dark:text-white">
                            {fit.fitting_name}
                            <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] text-zinc-400 font-normal">
                              Заказ #{o.id}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-zinc-500 text-xs">{fit.supplier}</td>
                          <td className="py-3.5 pr-4 font-mono">{fit.quantity} шт</td>
                          <td className="py-3.5 pr-4 font-mono text-zinc-400">{fit.unit_price} ₽</td>
                          <td className="py-3.5 pr-4 font-mono font-bold text-gray-900 dark:text-white">{(fit.quantity * fit.unit_price).toLocaleString()} ₽</td>
                          <td className="py-3.5">
                            <button
                              onClick={() => {
                                const nextStatus = fit.status === 'pending' ? 'ordered' : fit.status === 'ordered' ? 'in_stock' : 'issued';
                                handleUpdateFittingStatus(fit.id, nextStatus);
                              }}
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-transform active:scale-95 ${
                                fit.status === 'in_stock'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : fit.status === 'ordered'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : fit.status === 'issued'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'bg-zinc-500/10 text-zinc-500'
                              }`}
                            >
                              {fit.status === 'in_stock' ? 'На складе' : fit.status === 'ordered' ? 'Заказана' : fit.status === 'issued' ? 'Выдана в цех' : 'Не заказана'}
                            </button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 4 cols: Edge Banding Breakdown & Norms */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-[#E64D00]" />
                    Расход кромки по толщинам
                  </h4>
                  <div className="space-y-4">
                    <div className="p-3.5 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200/60 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">ПВХ 0.4 мм (Внутренние полки)</div>
                        <div className="text-[11px] text-zinc-500">Эконом-кромление скрытых торцов</div>
                      </div>
                      <div className="font-mono font-black text-sm text-[#E64D00]">
                        {(totalLiveEdgeMeters * 0.4).toFixed(1)} м
                      </div>
                    </div>

                    <div className="p-3.5 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200/60 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">ПВХ 2.0 мм (Фасады и столешницы)</div>
                        <div className="text-[11px] text-zinc-500">Ударопрочная кромка внешнего контура</div>
                      </div>
                      <div className="font-mono font-black text-sm text-[#E64D00]">
                        {(totalLiveEdgeMeters * 0.6).toFixed(1)} м
                      </div>
                    </div>

                    <div className="p-3.5 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200/60 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white">АБС-пластик 1.0 мм (Премиум)</div>
                        <div className="text-[11px] text-zinc-500">Влагозащитный профиль кухни/ванной</div>
                      </div>
                      <div className="font-mono font-black text-sm text-zinc-400">
                        14.5 м
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <span>Рекомендуемый запас на подрезку:</span>
                      <span className="font-bold text-gray-900 dark:text-white">+8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Добавить фурнитуру к заказу */}
      {addFittingOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">Добавить фурнитуру в заказ #{addFittingOrderId}</h3>
              <button onClick={() => setAddFittingOrderId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAddFittingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Наименование фурнитуры</label>
                <input
                  type="text"
                  required
                  value={newFitting.fitting_name}
                  onChange={e => setNewFitting({ ...newFitting, fitting_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Артикул / Код</label>
                  <input
                    type="text"
                    value={newFitting.article}
                    onChange={e => setNewFitting({ ...newFitting, article: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Поставщик</label>
                  <input
                    type="text"
                    value={newFitting.supplier}
                    onChange={e => setNewFitting({ ...newFitting, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Количество (шт)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newFitting.quantity}
                    onChange={e => setNewFitting({ ...newFitting, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Цена за шт (₽)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newFitting.unit_price}
                    onChange={e => setNewFitting({ ...newFitting, unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddFittingOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E64D00] hover:bg-[#ff6a1a] text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Сохранить фурнитуру
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Добавить деталь и рассчитать кромку */}
      {addDetailOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">Добавить деталь и расчёт кромки (Заказ #{addDetailOrderId})</h3>
              <button onClick={() => setAddDetailOrderId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAddDetailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Название детали</label>
                <input
                  type="text"
                  required
                  value={newDetail.detail_name}
                  onChange={e => setNewDetail({ ...newDetail, detail_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Длина (мм)</label>
                  <input
                    type="number"
                    required
                    value={newDetail.length_mm}
                    onChange={e => setNewDetail({ ...newDetail, length_mm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Ширина (мм)</label>
                  <input
                    type="number"
                    required
                    value={newDetail.width_mm}
                    onChange={e => setNewDetail({ ...newDetail, width_mm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Кол-во шт</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newDetail.quantity}
                    onChange={e => setNewDetail({ ...newDetail, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-500">Кромление сторон (Выберите толщину или материал кромки)</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-1">Верхняя сторона</span>
                    <select
                      value={newDetail.edge_top}
                      onChange={e => setNewDetail({ ...newDetail, edge_top: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-white"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Нижняя сторона</span>
                    <select
                      value={newDetail.edge_bottom}
                      onChange={e => setNewDetail({ ...newDetail, edge_bottom: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-white"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Левая сторона</span>
                    <select
                      value={newDetail.edge_left}
                      onChange={e => setNewDetail({ ...newDetail, edge_left: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-white"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-zinc-500 block mb-1">Правая сторона</span>
                    <select
                      value={newDetail.edge_right}
                      onChange={e => setNewDetail({ ...newDetail, edge_right: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-white"
                    >
                      <option value="none">Без кромки</option>
                      <option value="pvc_04">ПВХ 0.4 мм</option>
                      <option value="pvc_20">ПВХ 2.0 мм</option>
                      <option value="abs">АБС-кромка</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddDetailOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Рассчитать кромку и сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
