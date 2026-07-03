import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, AlertTriangle, Play, Clock, CheckCircle2, Settings, ShoppingCart } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';

interface ServiceTicket {
    id: number;
    equipment_id: number | null;
    issue_description: string;
    audio_transcript: string | null;
    status: string;
    mechanic_id: number | null;
    resolution_notes: string | null;
}

const COLUMNS = [
    { id: 'open', title: 'Открытые заявки', icon: <AlertTriangle className="w-5 h-5 text-rose-500" /> },
    { id: 'in_progress', title: 'В ремонте', icon: <Play className="w-5 h-5 text-indigo-500" /> },
    { id: 'waiting_parts', title: 'Ожидание ЗЧ', icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { id: 'resolved', title: 'Завершено', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> }
];

export default function ServiceTickets() {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState<ServiceTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [partsName, setPartsName] = useState('');
    const [partsQty, setPartsQty] = useState('1');

    const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null);

    const fetchTickets = useCallback(async () => {
        try {
            const data = await apiClient.get<ServiceTicket[]>('/service/');
            if (data) {
                setTickets(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (!draggedTicketId) return;

        const ticket = tickets.find(t => t.id === draggedTicketId);
        if (ticket && ticket.status !== newStatus) {
            setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, status: newStatus } : t));
            try {
                await apiClient.put(`/service/${draggedTicketId}/status?status=${newStatus}`, {});
                showToast('Статус обновлен', 'success');
            } catch (err) {
                showToast('Ошибка обновления', 'error');
                fetchTickets();
            }
        }
        setDraggedTicketId(null);
    };

    const handleOrderParts = async () => {
        if (!partsName || !selectedTicketId) return;
        try {
            const data = await apiClient.post('/supply/', {
                item_name: partsName,
                quantity: parseFloat(partsQty),
                priority: 'Critical',
                status: 'new',
                service_ticket_id: selectedTicketId
            });
            if (data) {
                showToast('Запчасти заказаны в отдел снабжения', 'success');
                setIsPartsModalOpen(false);
                setPartsName('');
            } else {
                showToast('Ошибка заказа', 'error');
            }
        } catch (e) {
            showToast('Сбой при заказе', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm shrink-0">
                <div>
                    <h2 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-white flex items-center gap-2">
                        <Wrench className="w-7 h-7 text-amber-500" />
                        Рабочее место Механика (ТОиР)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Управление ремонтами техники и заявками на обслуживание
                    </p>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700">
                {COLUMNS.map(col => {
                    const colTickets = tickets.filter(t => t.status === col.id);
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
                                    {colTickets.length}
                                </span>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px]">
                                {colTickets.map(ticket => (
                                    <div 
                                        key={ticket.id}
                                        draggable
                                        onDragStart={() => setDraggedTicketId(ticket.id)}
                                        className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 border-l-4 border-l-amber-500 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md transition-all select-none"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Заявка #{ticket.id}</h4>
                                            <Settings className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4 min-h-[40px] line-clamp-2">
                                            {ticket.issue_description}
                                        </p>
                                        
                                        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
                                            <button 
                                                onClick={() => {
                                                    setSelectedTicketId(ticket.id);
                                                    setIsPartsModalOpen(true);
                                                }}
                                                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                Запчасти
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {colTickets.length === 0 && (
                                    <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl text-gray-400 text-xs font-semibold uppercase tracking-wider p-6 text-center">
                                        Перетащите сюда
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isPartsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Заказ запчастей (Ticket #{selectedTicketId})</h3>
                            <button onClick={() => setIsPartsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                Создаст заявку в отделе снабжения с наивысшим приоритетом (Critical).
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-1">Наименование детали</label>
                                <input 
                                    type="text" 
                                    value={partsName}
                                    onChange={e => setPartsName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-1">Количество</label>
                                <input 
                                    type="number" 
                                    value={partsQty}
                                    onChange={e => setPartsQty(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/50">
                            <button onClick={() => setIsPartsModalOpen(false)} className="px-4 py-2 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">Отмена</button>
                            <button onClick={handleOrderParts} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-md flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" /> Заказать
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
