import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Calendar, Archive } from 'lucide-react';
import { GodTierModal } from './GodTierModal';

interface KanbanTask {
  id: number;
  name: string;
  client: string;
  status: string;
  area?: string;
  surfaceType?: string;
  custom_fields?: Record<string, any>;
}

interface Column {
  id: string;
  title: string;
}

const COLUMNS: Column[] = [
  { id: 'Выезд на аудит', title: 'Аудит' },
  { id: 'КП отправлено', title: 'КП отправлено' },
  { id: 'Договор', title: 'Договор' },
  { id: 'В работе', title: 'В работе' },
  { id: 'Завершено', title: 'Завершено' },
];

export const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [consumeQuantity, setConsumeQuantity] = useState('');
  const [isConsuming, setIsConsuming] = useState(false);
  const [consumeError, setConsumeError] = useState('');
  const [isDeletingConsumptionId, setIsDeletingConsumptionId] = useState<number | null>(null);
  const [deleteConfirmObjectId, setDeleteConfirmObjectId] = useState<number | null>(null);
  const [deleteConfirmConsumptionId, setDeleteConfirmConsumptionId] = useState<number | null>(null);

  const fetchConsumptions = async (objId: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/objects/${objId}/consumptions`, {
        headers: {}
      });
      if (res.ok) {
        const data = await res.json();
        setConsumptions(data);
      }
    } catch (e) {
      console.error("Failed to fetch consumptions", e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/inventory/', {
        headers: {}
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
        if (data.length > 0) {
          setSelectedInventoryId(data[0].id.toString());
        }
      }
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    }
  };

  const handleTaskClick = async (task: KanbanTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    setConsumeError('');
    setSelectedInventoryId('');
    setConsumeQuantity('');
    await Promise.all([
      fetchConsumptions(task.id),
      fetchInventory()
    ]);
  };

  const handleConsumeMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!selectedInventoryId || !consumeQuantity) {
      setConsumeError("Выберите материал и укажите количество");
      return;
    }
    const qty = parseFloat(consumeQuantity);
    if (isNaN(qty) || qty <= 0) {
      setConsumeError("Укажите корректное количество (> 0)");
      return;
    }

    setIsConsuming(true);
    setConsumeError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/objects/${selectedTask.id}/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory_id: parseInt(selectedInventoryId),
          quantity: qty
        })
      });
      if (response.ok) {
        setConsumeQuantity('');
        await Promise.all([
          fetchConsumptions(selectedTask.id),
          fetchInventory()
        ]);
      } else {
        const err = await response.json();
        setConsumeError(err.detail || "Ошибка списания материала");
      }
    } catch (error) {
      setConsumeError("Ошибка подключения к серверу");
    } finally {
      setIsConsuming(false);
    }
  };

  const handleDeleteConsumption = async (consumptionId: number) => {
    if (!selectedTask) return;

    setIsDeletingConsumptionId(consumptionId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/objects/consumptions/${consumptionId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        await Promise.all([
          fetchConsumptions(selectedTask.id),
          fetchInventory()
        ]);
      } else {
        alert("Не удалось отменить списание");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    } finally {
      setIsDeletingConsumptionId(null);
    }
  };

  const handleDeleteObject = async (taskId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/objects/${taskId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        setIsDetailModalOpen(false);
        fetchObjects();
      } else {
        alert("Не удалось удалить объект");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при удалении объекта");
    }
  };

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    fetchObjects();
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const fetchObjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/objects/', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        // Подгоняем данные под интерфейс доски
        const formatted = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          client: d.client_name || `Клиент #${d.client_id || 'N/A'}`,
          status: d.status,
          area: d.area_sqm ? `${d.area_sqm} м²` : '',
          surfaceType: d.surface_type,
          custom_fields: d.custom_fields || {}
        }));
        setTasks(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch objects", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    // API request
    try {
      await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/objects/${taskId}/status?status=${encodeURIComponent(newStatus)}`, {
        method: 'PATCH',
        headers: {}
      });
    } catch (e) {
      console.error("Failed to update status", e);
      // Revert in real app if fails
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('taskId', id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    const id = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find(t => t.id === id);
    if (task && task.status !== statusId) {
      updateTaskStatus(id, statusId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4 h-full custom-scrollbar">
        {COLUMNS.map(column => (
          <div key={column.id} className="flex-shrink-0 w-80 bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/10 dark:border-zinc-800/20 rounded-xl flex flex-col animate-pulse h-[calc(100%-1rem)]">
            <div className="p-4 flex items-center justify-between border-b border-zinc-200/20 dark:border-zinc-800/20">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-8" />
            </div>
            <div className="p-3 flex-1 space-y-3">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="bg-white/60 dark:bg-zinc-900/40 p-4 rounded-lg border border-zinc-200/20 dark:border-zinc-800/20 space-y-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-850 rounded w-full" />
                  <div className="h-3 bg-zinc-150 dark:bg-zinc-900 rounded w-2/3" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-850 rounded w-16" />
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-850 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-full custom-scrollbar">
      {COLUMNS.map(column => (
        <div 
          key={column.id} 
          className="flex-shrink-0 w-80 glass-panel bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col shadow-sm pb-3 h-[calc(100%-1.5rem)]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="p-4 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-850">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-300 font-['Montserrat']">{column.title}</h3>
            <span className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {tasks.filter(t => t.status === column.id).length}
            </span>
          </div>
          
          <div className="p-3 flex-1 overflow-y-auto space-y-3.5 custom-scrollbar">
            {tasks.filter(t => t.status === column.id).map(task => (
              <div
                key={task.id}
                draggable={!isTouch}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => handleTaskClick(task)}
                className="bg-white/95 dark:bg-zinc-900/90 p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.015)] border border-zinc-200/60 dark:border-zinc-800/80 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:border-[#F95700]/30 hover:shadow-[0_8px_20px_rgba(249,87,0,0.04)] transition-all duration-300 select-none group relative"
              >
                {/* Delete button on hover */}
                <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex items-center gap-1 transition-opacity z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmObjectId(task.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                    title="Удалить объект"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-[#F95700] transition-colors text-sm font-['Montserrat']">{task.name}</div>
                <div className="text-xs text-zinc-550 dark:text-zinc-400 font-medium mb-3">{task.client}</div>
                
                <div className="flex flex-wrap gap-1.5">
                  {task.area && (
                    <span className="inline-block bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      {task.area}
                    </span>
                  )}
                  {task.surfaceType && (
                    <span className="inline-block bg-orange-500/10 text-[#F95700] dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      {task.surfaceType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* -------------------- МОДАЛЬНОЕ ОКНО ОБЪЕКТА (ДЕТАЛЬНО - РЕЖИМ 1) -------------------- */}
      <GodTierModal
        isOpen={isDetailModalOpen && !!selectedTask}
        onClose={() => setIsDetailModalOpen(false)}
        maxWidth="4xl"
        showCloseIcon={false}
      >
        {selectedTask && (
          <div className="flex flex-col h-[80vh] -m-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F95700]/10 text-[#F95700] dark:text-orange-400 border border-orange-500/20">
                  ID ОБЪЕКТА: {selectedTask.id}
                </span>
                <h2 className="text-2xl font-black font-['Montserrat'] text-zinc-900 dark:text-zinc-100 mt-2">
                  {selectedTask.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Заказчик:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {selectedTask.client}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Статус:</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      updateTaskStatus(selectedTask.id, newStatus);
                      setSelectedTask({ ...selectedTask, status: newStatus });
                    }}
                    className="bg-white dark:bg-zinc-800 text-[#F95700] dark:text-orange-450 font-bold border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex items-center justify-center p-2.5 w-10 h-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer"
                  title="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950 grid grid-cols-1 md:grid-cols-12 gap-6 custom-scrollbar">
              
              {/* Left Column: Specs & Consumption Form (col-span-5) */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Object specs card */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    Характеристики объекта
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-['Inter']">
                    <div>
                      <div className="text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Площадь работ</div>
                      <div className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-1 font-mono">
                        {selectedTask.area || 'Не указана'}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-455 dark:text-zinc-550 font-bold uppercase tracking-wider text-[9px]">Тип поверхности</div>
                      <div className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-1">
                        {selectedTask.surfaceType || 'Не указан'}
                      </div>
                    </div>
                  </div>

                  {/* Render Custom Fields if any */}
                  {selectedTask.custom_fields && Object.keys(selectedTask.custom_fields).length > 0 && (
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h4 className="text-[10px] font-bold text-[#F95700] uppercase tracking-widest mb-3">
                        Дополнительные параметры
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-['Inter']">
                        {Object.entries(selectedTask.custom_fields).map(([key, val]) => (
                          <div key={key}>
                            <div className="text-zinc-455 dark:text-zinc-550 font-bold uppercase tracking-wider text-[9px] truncate" title={key}>{key}</div>
                            <div className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-1">
                              {typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : (val?.toString() || '—')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmObjectId(selectedTask.id)}
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-350 flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить объект
                    </button>
                  </div>
                </div>

                {/* Material consumption form */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    Списать материал со склада
                  </h3>

                  {consumeError && (
                    <div className="p-4 rounded-xl text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-start gap-2 animate-shake">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="font-bold">{consumeError}</span>
                    </div>
                  )}

                  <form onSubmit={handleConsumeMaterial} className="space-y-4 text-left font-['Inter']">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">
                        Выберите материал на складе:
                      </label>
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => setSelectedInventoryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-xs cursor-pointer"
                        required
                      >
                        <option value="" disabled>-- Выберите из списка --</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                            {item.name} ({item.category || 'Без категории'}) — Остаток: {item.quantity} {item.unit}
                          </option>
                        ))}
                        {inventory.length === 0 && (
                          <option value="" disabled>Нет доступных материалов на складе</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">
                        Количество для списания:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={consumeQuantity}
                          onChange={(e) => setConsumeQuantity(e.target.value)}
                          placeholder="Например, 15.5"
                          className="flex-1 px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-xs"
                          required
                        />
                        <span className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl text-xs font-bold flex items-center justify-center min-w-[50px]">
                          {inventory.find(i => i.id.toString() === selectedInventoryId)?.unit || 'ед.'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isConsuming || inventory.length === 0}
                      className="w-full py-2.5 bg-[#F95700] hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#F95700]/15 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {isConsuming ? 'Списание...' : 'Списать материалы со склада'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Consumption History Log (col-span-7) */}
              <div className="md:col-span-7 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm flex flex-col h-full">
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-4">
                  История расхода материалов на объекте
                </h3>

                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[450px] pr-1 custom-scrollbar">
                  {consumptions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 py-12">
                      <Archive className="w-12 h-12 mb-3 text-zinc-350 dark:text-zinc-700" />
                      <p className="font-bold text-zinc-650 dark:text-zinc-400 text-sm">Расход еще не фиксировался</p>
                      <p className="text-xs text-zinc-400 mt-1">Используйте форму слева для списания материалов со склада</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {consumptions.map((item) => (
                        <div 
                          key={item.id}
                          className="flex justify-between items-center p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:border-[#F95700]/25 transition-all duration-200 group/log"
                        >
                          <div className="space-y-0.5 text-left font-['Inter']">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                              {item.inventory_name || 'Неизвестный материал'}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-650" />
                                {new Date(item.date).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm text-[#F95700] dark:text-orange-400">
                                -{item.quantity.toLocaleString('ru-RU')}
                              </span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                {item.inventory_unit}
                              </span>
                            </div>

                            <button
                              onClick={() => setDeleteConfirmConsumptionId(item.id)}
                              disabled={isDeletingConsumptionId === item.id}
                              className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-red-500/15 rounded-lg transition-colors cursor-pointer"
                              title="Отменить списание"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </GodTierModal>

      {/* Custom Delete Confirmation Modal (Object) */}
      <GodTierModal
        isOpen={deleteConfirmObjectId !== null}
        onClose={() => setDeleteConfirmObjectId(null)}
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
              onClick={() => setDeleteConfirmObjectId(null)}
              className="px-4 py-2 border border-zinc-250 dark:border-zinc-700 text-xs font-bold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmObjectId !== null) {
                  handleDeleteObject(deleteConfirmObjectId);
                  setDeleteConfirmObjectId(null);
                }
              }}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
          Вы действительно хотите удалить этот объект? Все списания материалов по нему будут удалены, а финансы и документы — отвязаны.
        </p>
      </GodTierModal>

      {/* Custom Delete Confirmation Modal (Consumption) */}
      <GodTierModal
        isOpen={deleteConfirmConsumptionId !== null}
        onClose={() => setDeleteConfirmConsumptionId(null)}
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
              onClick={() => setDeleteConfirmConsumptionId(null)}
              className="px-4 py-2 border border-zinc-250 dark:border-zinc-700 text-xs font-bold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmConsumptionId !== null) {
                  handleDeleteConsumption(deleteConfirmConsumptionId);
                  setDeleteConfirmConsumptionId(null);
                }
              }}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
          Вы действительно хотите отменить это списание? Материалы вернутся на склад.
        </p>
      </GodTierModal>
    </div>
  );
};

