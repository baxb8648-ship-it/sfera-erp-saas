import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hammer, PackageSearch, LayoutTemplate, Plus, Trash2, RotateCcw, AlertCircle, Settings, Scissors, FileText, Image, CheckCircle, Clock, Factory } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export default function FurnitureDashboard() {
  const [activeTab, setActiveTab] = useState<'serial' | 'raskroy'>('raskroy');
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

  const [raskroyResult, setRaskroyResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
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
            { id: 'serial', label: 'Серийное производство', icon: Factory }
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
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-480px)] min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-zinc-400" />
                      Деталировка ({parts.length})
                    </h3>
                    <button onClick={handleAddPart} className="text-xs font-bold text-[#E64D00] hover:text-[#ff6a1a] flex items-center gap-1 bg-[#E64D00]/10 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Добавить
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {parts.map((p) => (
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
                        
                        <div className="mt-2 flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                            <input type="checkbox" checked={p.can_rotate} onChange={e => handlePartChange(p.id, 'can_rotate', e.target.checked)} className="rounded border-gray-300 text-[#E64D00] focus:ring-[#E64D00]" />
                            <span>Вращение</span>
                          </label>
                          <input type="text" value={p.edge_banding} onChange={e => handlePartChange(p.id, 'edge_banding', e.target.value)} placeholder="Кромка 2/0/2/0" className="w-24 px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded text-[10px] font-mono dark:text-white text-center" />
                        </div>
                      </div>
                    ))}
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
                  {orders.map(o => (
                    <div key={o.id} className="p-4 border border-blue-200 dark:border-blue-900/30 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400 px-2 py-1 rounded">Заказ #{o.id}</span>
                          <h4 className="font-bold text-lg dark:text-white mt-1">{o.product_name} <span className="text-zinc-500 font-normal">x {o.quantity} шт</span></h4>
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{o.status === 'completed' ? 'Завершен' : 'В работе'}</span>
                      </div>
                      
                      {/* Routing sheet (operations) */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-zinc-500 uppercase">Маршрутный лист:</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {o.operations.map((op: any) => (
                            <button 
                              key={op.id}
                              onClick={() => { if(op.status !== 'completed') handleCompleteOp(op.id); }}
                              disabled={op.status === 'completed'}
                              className={`p-2 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between h-14 ${
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
                    </div>
                  ))}
                  {orders.length === 0 && <div className="text-center text-zinc-500 py-8">Нет активных заказов</div>}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
