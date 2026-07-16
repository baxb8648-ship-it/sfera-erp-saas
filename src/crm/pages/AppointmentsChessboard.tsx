import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Info, User as UserIcon, Phone, Clock, Trash2, Check, X, Sparkles } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { GodTierModal } from '../components/GodTierModal';
import { useAuth } from '../context/AuthContext';

interface Appointment {
    id: number;
    service_id: number;
    master_id: number;
    client_name: string;
    client_phone: string;
    datetime_start: string;
    datetime_end: string;
    status: string;
    service_name?: string;
    master_name?: string;
    notes?: string;
}

interface BookingService {
    id: number;
    name: string;
    duration_minutes: number;
    tech_cards?: any[];
}

interface Master {
    id: number;
    username: string;
}

export default function AppointmentsChessboard() {
    const { success, error, warning } = useToast();
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<BookingService[]>([]);
    const [masters, setMasters] = useState<Master[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Board state
    const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
    const [selectedTimeStr, setSelectedTimeStr] = useState<string>('10:00');
    
    // Form state
    const [formData, setFormData] = useState({
        client_name: '',
        client_phone: '',
        service_id: ''
    });

    // Manage Modal state
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [manageFormData, setManageFormData] = useState({
        master_id: 0,
        service_id: 0,
        datetime_start: '',
        datetime_end: '',
        client_name: '',
        client_phone: '',
        notes: '',
        status: ''
    });

    // Material deduction states
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
    const [activeCompleteAppId, setActiveCompleteAppId] = useState<number | null>(null);
    const [deductionItems, setDeductionItems] = useState<any[]>([]);

    const handleAppointmentClick = (app: Appointment) => {
        setSelectedAppointment(app);
        setManageFormData({
            master_id: app.master_id,
            service_id: app.service_id,
            datetime_start: app.datetime_start.split('.')[0], // clean ISO
            datetime_end: app.datetime_end.split('.')[0],
            client_name: app.client_name,
            client_phone: app.client_phone || '',
            notes: app.notes || '',
            status: app.status
        });
        setIsManageModalOpen(true);
    };

    const handleUpdateAppointment = async () => {
        if (!selectedAppointment) return;
        try {
            await apiClient.put(`/booking/appointments/${selectedAppointment.id}`, {
                master_id: Number(manageFormData.master_id),
                service_id: Number(manageFormData.service_id),
                client_name: manageFormData.client_name,
                client_phone: manageFormData.client_phone,
                datetime_start: new Date(manageFormData.datetime_start).toISOString(),
                datetime_end: new Date(manageFormData.datetime_end).toISOString(),
                notes: manageFormData.notes,
                status: manageFormData.status
            });
            success('Запись успешно обновлена');
            setIsManageModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось обновить запись');
        }
    };

    const handleConfirmAppointment = async (appId: number) => {
        try {
            await apiClient.post(`/booking/appointments/${appId}/confirm`);
            success('Запись подтверждена');
            setIsManageModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось подтвердить запись');
        }
    };

    const handleCancelAppointment = async (appId: number) => {
        try {
            await apiClient.post(`/booking/appointments/${appId}/cancel`);
            success('Запись отменена');
            setIsManageModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось отменить запись');
        }
    };

    const handleDeleteAppointment = async (appId: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту запись безвозвратно?')) return;
        try {
            await apiClient.delete(`/booking/appointments/${appId}`);
            success('Запись успешно удалена');
            setIsManageModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось удалить запись');
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users (masters), services, and appointments
            const [usersRes, svcRes, appRes] = await Promise.all([
                apiClient.get('/users/'),
                apiClient.get('/booking/services'),
                apiClient.get(`/booking/appointments?start_date=${currentDate}T00:00:00&end_date=${currentDate}T23:59:59`)
            ]);
            // For now, let's treat all active users as masters, or in a real app filter by role
            setMasters(Array.isArray(usersRes) ? usersRes.filter((u: any) => u.is_active === 1) : []);
            setServices(Array.isArray(svcRes) ? svcRes : []);
            setAppointments(Array.isArray(appRes) ? appRes : []);
        } catch (err) {
            console.error(err);
            error('Не удалось загрузить данные расписания');
        } finally {
            setLoading(false);
        }
    };

    // Build timeline columns: 09:00 to 20:00, every 30 mins
    const hours: string[] = [];
    for (let h = 9; h <= 20; h++) {
        hours.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 20) hours.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const handleCellClick = (masterId: number, timeStr: string) => {
        setSelectedMasterId(masterId);
        setSelectedTimeStr(timeStr);
        setIsModalOpen(true);
    };

    const handleCreateAppointment = async () => {
        if (!formData.client_name || !formData.service_id || !selectedMasterId) {
            warning('Заполните обязательные поля');
            return;
        }

        const svc = services.find(s => s.id === Number(formData.service_id));
        if (!svc) return;

        // Calculate end time
        const startDt = new Date(`${currentDate}T${selectedTimeStr}:00`);
        const endDt = new Date(startDt.getTime() + svc.duration_minutes * 60000);

        try {
            await apiClient.post('/booking/appointments', {
                service_id: svc.id,
                master_id: selectedMasterId,
                client_name: formData.client_name,
                client_phone: formData.client_phone,
                datetime_start: startDt.toISOString(),
                datetime_end: endDt.toISOString()
            });
            success('Клиент записан, мастер уведомлен');
            setIsModalOpen(false);
            setFormData({ client_name: '', client_phone: '', service_id: '' });
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось создать запись');
        }
    };

    const handleCompleteClick = (appId: number, serviceId: number) => {
        const svc = services.find(s => s.id === serviceId);
        const techCards = svc?.tech_cards || [];
        
        setDeductionItems(techCards.map((tc: any) => ({
            inventory_id: tc.inventory_id,
            name: tc.inventory_name || `Материал #${tc.inventory_id}`,
            unit: tc.inventory_unit || 'ед.',
            quantity: tc.quantity
        })));
        
        setActiveCompleteAppId(appId);
        setIsDeductionModalOpen(true);
    };

    const handleCompleteConfirm = async () => {
        if (!activeCompleteAppId) return;
        
        try {
            await apiClient.post(`/booking/appointments/${activeCompleteAppId}/complete`, {
                materials_override: deductionItems.map(item => ({
                    inventory_id: item.inventory_id,
                    quantity: Number(item.quantity)
                }))
            });
            success('Услуга завершена, ТМЦ успешно списаны со склада');
            setIsDeductionModalOpen(false);
            setIsManageModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.detail || 'Ошибка при завершении');
        }
    };

    // Map appointments to grid positions
    const getAppointmentsForMaster = (masterId: number) => {
        return appointments.filter(a => a.master_id === masterId);
    };

    return (
        <div className="p-8 max-w-full mx-auto space-y-6">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e4e4e7;
                    border-radius: 99px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #27272a;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d4d4d8;
                }
            `}</style>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white flex items-center gap-3 font-['Montserrat']">
                        <CalendarIcon className="w-8 h-8 text-[#F95700]" />
                        Шахматка смен
                    </h1>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        Управление записями клиентов, контроль времени мастеров и авто-списание ТМЦ.
                    </p>
                </div>
                
                {/* Селектор дат */}
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm shrink-0">
                    <button 
                        onClick={() => {
                            const d = new Date(currentDate); d.setDate(d.getDate() - 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-3.5 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-black text-xs transition"
                    >
                        ← Назад
                    </button>
                    <input 
                        type="date" 
                        className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl outline-none font-black text-zinc-950 dark:text-white px-3 py-1.5 text-xs cursor-pointer focus:border-orange-500"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                    />
                    <button 
                        onClick={() => {
                            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-3.5 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-black text-xs transition"
                    >
                        Вперед →
                    </button>
                </div>
            </div>

            {/* Персональный баннер онлайн-записи (Double-Bezel & Button-in-Button) */}
            <div className="relative overflow-hidden p-1.5 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300">
                <div className="relative overflow-hidden p-6 rounded-[calc(2rem-0.375rem)] bg-white dark:bg-zinc-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F95700]/5 to-[#F95700]/0 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="space-y-3 relative z-10 flex-1 w-full">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F95700]/10 border border-[#F95700]/20 text-[#F95700] text-[10px] font-black uppercase tracking-widest font-mono">
                            <Sparkles className="w-3.5 h-3.5 text-[#F95700] animate-pulse" />
                            <span>Онлайн-Запись</span>
                        </div>
                        <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider font-['Montserrat']">
                            Персональная ссылка для клиентов
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            Разместите эту ссылку в соцсетях, на картах или отправьте напрямую клиентам для самостоятельной записи:
                        </p>
                        <div className="w-full sm:w-auto bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 font-semibold select-all break-all inline-block shadow-inner">
                            {`${window.location.origin}/#/public-booking?tenant_id=${user?.tenant_id || 1}`}
                        </div>
                    </div>
                    
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/#/public-booking?tenant_id=${user?.tenant_id || 1}`);
                            success('Ссылка для онлайн-записи скопирована!');
                        }}
                        className="group flex items-center gap-4 pl-6 pr-3 py-3 bg-gradient-to-r from-orange-500 to-[#F95700] hover:shadow-lg hover:shadow-orange-500/15 hover:scale-[1.01] active:scale-[0.99] text-white text-xs font-black rounded-full transition-all duration-300 cursor-pointer relative z-10 shrink-0 w-full sm:w-auto justify-center"
                    >
                        <span>Копировать ссылку</span>
                        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-12 group-hover:scale-105 shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                        </span>
                    </button>
                </div>
            </div>

            {/* Сетка шахматки (Double-Bezel) */}
            <div className="relative overflow-hidden p-1.5 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300">
                <div className="custom-scrollbar bg-white dark:bg-zinc-950 rounded-[calc(2rem-0.375rem)] border border-zinc-200/60 dark:border-zinc-800/60 shadow-lg overflow-x-auto relative">
                    {/* Chessboard Grid */}
                    <div style={{ minWidth: '1300px' }}>
                        {/* Header: Time Slots */}
                        <div className="flex border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/75 dark:bg-zinc-900/75 backdrop-blur-md sticky top-0 z-10">
                            <div className="w-52 shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 p-4 font-black text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md font-['Montserrat']">
                                Специалисты
                            </div>
                            <div className="flex-1 flex">
                                {hours.map((time, idx) => (
                                    <div key={idx} className="flex-1 min-w-[90px] border-r border-zinc-200/40 dark:border-zinc-800/50 p-3 text-center text-[11px] font-bold font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                                        {time}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body: Masters and their timelines */}
                        <div className="relative">
                            {loading && <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 flex items-center justify-center z-20 font-black text-xs text-[#F95700] backdrop-blur-sm">Загрузка расписания...</div>}
                            
                            {masters.map(master => {
                                const masterApps = getAppointmentsForMaster(master.id);
                                
                                return (
                                    <div key={master.id} className="flex border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50/[0.1] dark:hover:bg-zinc-900/[0.1] transition-all duration-300 group relative min-h-[100px]">
                                        {/* Left Master Column */}
                                        <div className="w-52 shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 p-4 flex items-center gap-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky left-0 z-10 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-white border border-zinc-700 flex items-center justify-center font-black text-sm shadow-md shrink-0">
                                                {master.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="truncate space-y-1">
                                                <span className="font-black text-xs text-zinc-900 dark:text-white block truncate font-['Montserrat']">{master.username}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="relative flex h-2 w-2 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 font-mono tracking-wider">НА СМЕНЕ</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex relative">
                                            {/* Background Grid Cells */}
                                            {hours.map((time, idx) => (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => handleCellClick(master.id, time)}
                                                    className="flex-1 min-w-[90px] border-r border-zinc-200/30 dark:border-zinc-800/20 cursor-crosshair hover:bg-orange-500/[0.04] dark:hover:bg-[#F95700]/[0.02] transition-all duration-300 flex items-center justify-center group/cell"
                                                    title={`Записать на ${time}`}
                                                >
                                                <span className="text-[10px] font-black text-[#F95700] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    + Запись
                                                </span>
                                            </div>
                                        ))}

                                        {/* Placed Appointments */}
                                        {masterApps.map(app => {
                                            const start = new Date(app.datetime_start);
                                            const end = new Date(app.datetime_end);
                                            
                                            // Simple positioning calculation (assuming 9:00 start)
                                            const startHour = start.getHours() + start.getMinutes()/60;
                                            const endHour = end.getHours() + end.getMinutes()/60;
                                            
                                            // Bounds check
                                            if (endHour <= 9 || startHour >= 20.5) return null;
                                            
                                            const safeStart = Math.max(9, startHour);
                                            const safeEnd = Math.min(20.5, endHour);
                                            
                                            const leftPercent = ((safeStart - 9) / 11.5) * 100;
                                            const widthPercent = ((safeEnd - safeStart) / 11.5) * 100;

                                            const isCompleted = app.status === 'completed';
                                            const isConfirmed = app.status === 'confirmed';
                                            const isCancelled = app.status === 'cancelled';
                                            
                                            return (
                                                <div 
                                                    key={app.id}
                                                    onClick={() => handleAppointmentClick(app)}
                                                    className={`absolute top-2 bottom-2 rounded-2xl p-3 border backdrop-blur-sm overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer group/card flex flex-col justify-between hover:-translate-y-[2px] active:scale-[0.98] ${
                                                        isCompleted 
                                                        ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:shadow-md shadow-emerald-500/5' 
                                                        : isConfirmed
                                                        ? 'bg-gradient-to-br from-orange-500 to-[#F95700] border-[#F95700]/10 text-white hover:shadow-lg hover:shadow-orange-500/20 shadow-md shadow-orange-500/10'
                                                        : isCancelled
                                                        ? 'bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/40 text-zinc-450 dark:text-zinc-550 line-through opacity-50 hover:opacity-75'
                                                        : 'bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:shadow-md shadow-blue-500/5'
                                                    }`}
                                                    style={{ 
                                                        left: `${leftPercent}%`, 
                                                        width: `${widthPercent}%`,
                                                        minWidth: '95px'
                                                    }}
                                                >
                                                    <div className="flex flex-col h-full justify-between space-y-1">
                                                        <div>
                                                            <div className="truncate text-xs font-black leading-tight flex items-center gap-1.5 font-['Montserrat']">
                                                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
                                                                {isConfirmed && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                                                                <span className="truncate">{app.client_name}</span>
                                                            </div>
                                                            <div className={`truncate text-[9px] font-bold leading-tight mt-0.5 font-mono tracking-wide ${
                                                                isCompleted 
                                                                ? 'text-emerald-600 dark:text-emerald-400/80' 
                                                                : isConfirmed
                                                                ? 'text-white/80'
                                                                : isCancelled 
                                                                ? 'text-zinc-400 dark:text-zinc-600' 
                                                                : 'text-blue-600 dark:text-blue-400/80'
                                                            }`}>
                                                                {app.service_name}
                                                            </div>
                                                        </div>

                                                        {/* Hover button for completion */}
                                                        {!isCompleted && !isCancelled && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleCompleteClick(app.id, app.service_id); }}
                                                                className="opacity-0 group-hover/card:opacity-100 transition-opacity w-full flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl py-1.5 text-[9px] font-black uppercase tracking-wider"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {masters.length === 0 && !loading && (
                            <div className="p-10 text-center text-zinc-500">Нет доступных мастеров.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

            <GodTierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Новая запись (${currentDate} в ${selectedTimeStr})`}
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Имя клиента</label>
                        <input
                            type="text"
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                            placeholder="Например: Иван Иванов"
                            value={formData.client_name}
                            onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Телефон</label>
                        <input
                            type="text"
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-[#F95700] transition-colors"
                            placeholder="+7 (999) 000-00-00"
                            value={formData.client_phone}
                            onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Услуга</label>
                        <select
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-[#F95700] transition-colors"
                            value={formData.service_id}
                            onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                        >
                            <option value="" disabled>Выберите услугу...</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} мин)</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-500/10 text-[#F95700] dark:text-orange-400 p-4 rounded-xl text-xs font-semibold flex gap-3 border border-orange-200/20">
                        <Info className="w-5 h-5 shrink-0 text-[#F95700]" />
                        <p>После создания записи администратору и мастеру будет отправлено <b>Telegram-уведомление</b>.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreateAppointment}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#F95700] hover:bg-orange-600 text-white transition hover:shadow-lg hover:shadow-orange-500/10 active:scale-[0.98]"
                        >
                            Записать клиента
                        </button>
                    </div>
                </div>
            </GodTierModal>

            {/* Модальное окно управления записью */}
            <GodTierModal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                title="Управление записью клиента"
            >
                {selectedAppointment && (
                    <div className="space-y-6">
                        {/* Статусные плашки */}
                        <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                                selectedAppointment.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                : selectedAppointment.status === 'confirmed'
                                ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-[#F95700]'
                                : selectedAppointment.status === 'cancelled'
                                ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                            }`}>
                                {selectedAppointment.status === 'new' && 'Новая запись'}
                                {selectedAppointment.status === 'confirmed' && 'Подтверждена'}
                                {selectedAppointment.status === 'completed' && 'Завершена'}
                                {selectedAppointment.status === 'cancelled' && 'Отменена'}
                            </span>
                        </div>

                        {/* Кнопки быстрых действий со статусом */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                            {selectedAppointment.status !== 'confirmed' && selectedAppointment.status !== 'completed' && (
                                <button
                                    onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                                    className="flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-xs font-bold transition shadow-sm shadow-orange-500/10 cursor-pointer"
                                >
                                    <Check className="w-3.5 h-3.5" /> Подтвердить
                                </button>
                            )}
                            {selectedAppointment.status !== 'completed' && (
                                <button
                                    onClick={() => handleCompleteClick(selectedAppointment.id, selectedAppointment.service_id)}
                                    className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-xs font-bold transition shadow-sm shadow-emerald-600/10 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Завершить
                                </button>
                            )}
                            {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                                <button
                                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                                    className="flex items-center justify-center gap-1 bg-zinc-250 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl py-2 text-xs font-bold transition cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" /> Отменить
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                                className="flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2 text-xs font-bold transition shadow-sm shadow-rose-600/10 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Удалить
                            </button>
                        </div>

                        {/* Форма редактирования/переноса */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5 text-zinc-400" /> Клиент
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.client_name}
                                        onChange={(e) => setManageFormData({...manageFormData, client_name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-zinc-400" /> Телефон
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.client_phone}
                                        onChange={(e) => setManageFormData({...manageFormData, client_phone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300">Специалист</label>
                                    <select
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.master_id}
                                        onChange={(e) => setManageFormData({...manageFormData, master_id: Number(e.target.value)})}
                                    >
                                        {masters.map(m => (
                                            <option key={m.id} value={m.id}>{m.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300">Услуга</label>
                                    <select
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.service_id}
                                        onChange={(e) => setManageFormData({...manageFormData, service_id: Number(e.target.value)})}
                                    >
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} мин)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-zinc-400" /> Время начала
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.datetime_start}
                                        onChange={(e) => setManageFormData({...manageFormData, datetime_start: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-zinc-400" /> Время окончания
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-colors"
                                        value={manageFormData.datetime_end}
                                        onChange={(e) => setManageFormData({...manageFormData, datetime_end: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={() => setIsManageModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleUpdateAppointment}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 transition"
                            >
                                Сохранить изменения
                            </button>
                        </div>
                    </div>
                )}
            </GodTierModal>

            {/* Модальное окно интерактивного списания ТМЦ */}
            <GodTierModal
                isOpen={isDeductionModalOpen}
                onClose={() => setIsDeductionModalOpen(false)}
                title="Списание материалов"
                maxWidth="md"
            >
                <div className="space-y-5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        Ниже указан список расходных материалов, привязанных к данной услуге. Вы можете изменить объём списания ТМЦ или удалить материал из списка перед подтверждением.
                    </p>

                    {deductionItems.length > 0 ? (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                            {deductionItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate font-['Montserrat']">
                                            {item.name}
                                        </span>
                                        <span className="text-[9px] text-[#F95700] font-bold font-mono tracking-wider uppercase">
                                            Расходник
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="any"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const updated = [...deductionItems];
                                                updated[idx].quantity = val;
                                                setDeductionItems(updated);
                                            }}
                                            className="w-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-black font-mono text-zinc-950 dark:text-white text-center focus:outline-none focus:border-[#F95700] focus:ring-1 focus:ring-[#F95700]/20"
                                        />
                                        <span className="text-xs text-zinc-400 font-bold min-w-[24px]">
                                            {item.unit}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const updated = deductionItems.filter((_, i) => i !== idx);
                                                setDeductionItems(updated);
                                            }}
                                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                                            title="Не списывать этот ТМЦ"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold block">
                                Для этой услуги нет привязанных материалов в техкарте.
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-1 font-mono">
                                Запись завершится без автоматического списания ТМЦ.
                            </span>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={() => setIsDeductionModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        >
                            Назад
                        </button>
                        <button
                            onClick={handleCompleteConfirm}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10 text-white font-bold text-xs rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Завершить и списать
                        </button>
                    </div>
                </div>
            </GodTierModal>
        </div>
    );
}
