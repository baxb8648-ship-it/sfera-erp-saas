import React, { useState, useEffect, useCallback } from 'react';
import { Package, Truck, ShieldCheck, CheckCircle2, FileText, Plus, Filter, AlertTriangle, Car, ClipboardCheck, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';

interface SupplyOrder {
    id: number;
    item_name: string;
    quantity: number;
    unit_price: number | null;
    total_price: number | null;
    supplier: string | null;
    status: string;
    priority: string;
    expected_date: string | null;
    service_ticket_id: number | null;
}

const COLUMNS = [
    { id: 'new', title: 'Новые заявки', icon: <Plus className="w-5 h-5 text-zinc-500" /> },
    { id: 'approved', title: 'Согласовано', icon: <CheckCircle2 className="w-5 h-5 text-blue-500" /> },
    { id: 'ordered', title: 'Заказано', icon: <FileText className="w-5 h-5 text-amber-500" /> },
    { id: 'in_transit', title: 'В пути', icon: <Truck className="w-5 h-5 text-indigo-500" /> },
    { id: 'vehicle_pass', title: 'Пропуск авто', icon: <Car className="w-5 h-5 text-purple-500" /> },
    { id: 'gate', title: 'Проходная', icon: <ShieldCheck className="w-5 h-5 text-rose-500" /> },
    { id: 'qc', title: 'Входной контроль', icon: <ClipboardCheck className="w-5 h-5 text-amber-600" /> },
    { id: 'received', title: 'Принято', icon: <Package className="w-5 h-5 text-emerald-500" /> }
];

export default function SupplyPipeline() {
    const { showToast } = useToast();
    const [orders, setOrders] = useState<SupplyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    
    const [newItemName, setNewItemName] = useState('');
    const [newQuantity, setNewQuantity] = useState('');
    const [newPriority, setNewPriority] = useState('Medium');

    const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            const data = await apiClient.get<SupplyOrder[]>('/supply/');
            if (data) {
                setOrders(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (!draggedOrderId) return;

        const order = orders.find(o => o.id === draggedOrderId);
        if (order && order.status !== newStatus) {
            setOrders(prev => prev.map(o => o.id === draggedOrderId ? { ...o, status: newStatus } : o));
            try {
                await apiClient.put(`/supply/${draggedOrderId}/status?status=${newStatus}`, {});
                showToast('Статус обновлен', 'success');
            } catch (err) {
                showToast('Ошибка обновления статуса', 'error');
                fetchOrders();
            }
        }
        setDraggedOrderId(null);
    };

    const handleCreateOrder = async () => {
        if (!newItemName || !newQuantity) {
            showToast('Заполните обязательные поля', 'error');
            return;
        }
        try {
            const data = await apiClient.post('/supply/', {
                item_name: newItemName,
                quantity: parseFloat(newQuantity),
                priority: newPriority,
                status: 'new'
            });
            if (data) {
                showToast('Заявка создана', 'success');
                setIsCreateModalOpen(false);
                setNewItemName('');
                setNewQuantity('');
                fetchOrders();
            }
        } catch (e) {
            showToast('Ошибка создания', 'error');
        }
    };

    const getPriorityColor = (p: string) => {
        if (p === 'High' || p === 'Critical') return 'border-l-rose-500';
        if (p === 'Low') return 'border-l-emerald-500';
        return 'border-l-amber-500';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F95700]"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6 pb-16">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm shrink-0">
                <div>
                    <h2 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-white flex items-center gap-2">
                        <Package className="w-7 h-7 text-[#F95700]" />
                        Снабжение и Логистика
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Управление цепочками поставок и закупками ТМЦ
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Канбан / Таблица переключатель */}
                    <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'kanban'
                                    ? 'bg-white dark:bg-zinc-900 text-[#F95700] shadow-sm'
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Канбан</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-zinc-900 text-[#F95700] shadow-sm'
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <TableIcon className="w-3.5 h-3.5" />
                            <span>Реестр (Таблица)</span>
                        </button>
                    </div>

                    <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95 cursor-pointer">
                        <Filter className="w-4 h-4" />
                        Фильтры
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-[#F95700] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95 shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Создать заявку
                    </button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
                    {COLUMNS.map(col => {
                        const columnOrders = orders.filter(o => o.status === col.id);
                        return (
                            <div 
                                key={col.id} 
                                className="min-w-[320px] w-[320px] bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-200 dark:border-zinc-800 flex flex-col max-h-full shrink-0"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 rounded-t-2xl shrink-0">
                                    <div className="flex items-center gap-2">
                                        {col.icon}
                                        <h3 className="font-bold text-gray-900 dark:text-white">{col.title}</h3>
                                    </div>
                                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-xs font-black px-2 py-1 rounded-full">
                                        {columnOrders.length}
                                    </span>
                                </div>
                                <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[160px] flex flex-col">
                                    {columnOrders.map(order => (
                                        <div 
                                            key={order.id}
                                            draggable
                                            onDragStart={() => setDraggedOrderId(order.id)}
                                            className={`bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 border-l-4 ${getPriorityColor(order.priority)} cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md transition-all select-none`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{order.item_name}</h4>
                                                <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">#{order.id}</span>
                                            </div>
                                            <div className="flex justify-between items-end mt-4">
                                                <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                                    Кол-во: <span className="text-gray-900 dark:text-white">{order.quantity}</span>
                                                </div>
                                                {order.service_ticket_id && (
                                                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-1 rounded-md border border-rose-200 dark:border-rose-500/20">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Для ТОиР
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {columnOrders.length === 0 && (
                                        <button 
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="w-full flex-1 min-h-[120px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-[#F95700] rounded-xl text-gray-400 hover:text-[#F95700] text-xs font-semibold uppercase tracking-wider p-6 text-center transition-all cursor-pointer gap-2 group"
                                        >
                                            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span>Создать заявку</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-zinc-300 font-extrabold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Наименование</th>
                                    <th className="px-6 py-4">Кол-во</th>
                                    <th className="px-6 py-4">Приоритет</th>
                                    <th className="px-6 py-4">Этап (Статус)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-semibold">
                                            Заявок в реестре пока нет
                                        </td>
                                    </tr>
                                ) : orders.map(order => {
                                    const col = COLUMNS.find(c => c.id === order.status);
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                                            <td className="px-6 py-4 font-mono text-zinc-400">#{order.id}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{order.item_name}</td>
                                            <td className="px-6 py-4 font-semibold">{order.quantity}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                                    order.priority === 'Critical' || order.priority === 'High'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                        : order.priority === 'Low'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {order.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 font-bold text-gray-700 dark:text-zinc-300">
                                                    {col?.icon}
                                                    <span>{col?.title || order.status}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Новая заявка ТМЦ</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-1">Наименование</label>
                                <input 
                                    type="text" 
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-[#F95700] outline-none"
                                    placeholder="Например: Масло моторное 5W40"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-1">Количество</label>
                                <input 
                                    type="number" 
                                    value={newQuantity}
                                    onChange={e => setNewQuantity(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-[#F95700] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-1">Приоритет</label>
                                <select 
                                    value={newPriority}
                                    onChange={e => setNewPriority(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-[#F95700] outline-none"
                                >
                                    <option value="Low">Низкий</option>
                                    <option value="Medium">Средний</option>
                                    <option value="High">Высокий</option>
                                    <option value="Critical">Критический (Простой)</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/50">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">Отмена</button>
                            <button onClick={handleCreateOrder} className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-md">Создать</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
