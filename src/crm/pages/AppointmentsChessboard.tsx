import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { GodTierModal } from '../components/GodTierModal';

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
}

interface BookingService {
    id: number;
    name: string;
    duration_minutes: number;
}

interface Master {
    id: number;
    username: string;
}

export default function AppointmentsChessboard() {
    const { success, error, warning } = useToast();
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

    const handleComplete = async (appId: number) => {
        if (!window.confirm("Завершить услугу? Это автоматически спишет материалы со склада по техкарте.")) return;
        
        try {
            await apiClient.post(`/booking/appointments/${appId}/complete`);
            success('Услуга завершена, ТМЦ успешно списаны со склада');
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-blue-500" />
                        Шахматка расписания
                    </h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                        Управление записями клиентов, контроль времени мастеров и авто-списание материалов
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-sm">
                    <button 
                        onClick={() => {
                            const d = new Date(currentDate); d.setDate(d.getDate() - 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium"
                    >
                        ← Назад
                    </button>
                    <input 
                        type="date" 
                        className="bg-transparent border-none outline-none font-bold text-zinc-900 dark:text-white px-2 cursor-pointer"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                    />
                    <button 
                        onClick={() => {
                            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
                            setCurrentDate(d.toISOString().split('T')[0]);
                        }}
                        className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium"
                    >
                        Вперед →
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto relative">
                {/* Chessboard Grid */}
                <div style={{ minWidth: '1200px' }}>
                    {/* Header: Time Slots */}
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                        <div className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 font-semibold text-zinc-500 dark:text-zinc-400 flex items-center">
                            Специалисты
                        </div>
                        <div className="flex-1 flex">
                            {hours.map((time, idx) => (
                                <div key={idx} className="flex-1 min-w-[80px] border-r border-zinc-200 dark:border-zinc-800 p-2 text-center text-xs font-medium text-zinc-400">
                                    {time}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body: Masters and their timelines */}
                    <div className="relative">
                        {loading && <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center z-20">Загрузка...</div>}
                        
                        {masters.map(master => {
                            const masterApps = getAppointmentsForMaster(master.id);
                            
                            return (
                                <div key={master.id} className="flex border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                    <div className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                            {master.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-zinc-900 dark:text-white truncate">{master.username}</span>
                                    </div>
                                    <div className="flex-1 flex relative">
                                        {/* Background Grid Cells */}
                                        {hours.map((time, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => handleCellClick(master.id, time)}
                                                className="flex-1 min-w-[80px] border-r border-zinc-100 dark:border-zinc-800/50 cursor-crosshair opacity-0 group-hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                                                title={`Записать на ${time}`}
                                            ></div>
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
                                            
                                            return (
                                                <div 
                                                    key={app.id}
                                                    className={`absolute top-1 bottom-1 rounded-lg p-2 shadow-sm border overflow-hidden transition-all ${
                                                        isCompleted 
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 opacity-70' 
                                                        : 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500 text-white hover:shadow-md hover:z-10'
                                                    }`}
                                                    style={{ 
                                                        left: `${leftPercent}%`, 
                                                        width: `${widthPercent}%`,
                                                        minWidth: '80px'
                                                    }}
                                                >
                                                    <div className="flex flex-col h-full justify-between">
                                                        <div className="truncate text-xs font-bold leading-tight">
                                                            {app.client_name}
                                                        </div>
                                                        <div className={`truncate text-[10px] leading-tight ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-100'}`}>
                                                            {app.service_name}
                                                        </div>
                                                        {!isCompleted && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleComplete(app.id); }}
                                                                className="mt-1 w-full flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 text-white rounded py-1 text-[10px] font-medium transition-colors"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Завершить
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
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                            placeholder="+7 (999) 000-00-00"
                            value={formData.client_phone}
                            onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Услуга</label>
                        <select
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                            value={formData.service_id}
                            onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                        >
                            <option value="" disabled>Выберите услугу...</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} мин)</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 p-4 rounded-xl text-sm flex gap-3">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>После создания записи, администратору и мастеру будет отправлено <b>Telegram-уведомление</b>.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreateAppointment}
                            className="px-5 py-2.5 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                        >
                            Записать клиента
                        </button>
                    </div>
                </div>
            </GodTierModal>
        </div>
    );
}
