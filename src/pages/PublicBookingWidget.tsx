import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, User as UserIcon, CheckCircle2, ChevronRight, Sparkles, Phone, Tag } from 'lucide-react';
import { apiClient } from '../api/client';

interface BookingService {
    id: number;
    name: string;
    price: number;
    duration_minutes: number;
    category_id?: number;
}

interface Master {
    id: number;
    username: string;
}

interface BusySlot {
    master_id: number;
    datetime_start: string;
    datetime_end: string;
}

export function PublicBookingWidget() {
    const [searchParams] = useSearchParams();
    const tenantId = Number(searchParams.get('tenant_id') || '1');

    // Data states
    const [services, setServices] = useState<BookingService[]>([]);
    const [masters, setMasters] = useState<Master[]>([]);
    const [busyAppointments, setBusyAppointments] = useState<BusySlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [successState, setSuccessState] = useState(false);
    const [tenantName, setTenantName] = useState('СФЕРУМ');

    // Form states
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState<BookingService | null>(null);
    const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientNotes, setClientNotes] = useState('');

    useEffect(() => {
        loadInitialData();
    }, [tenantId]);

    useEffect(() => {
        if (selectedMaster && selectedDate) {
            loadBusySlots();
        }
    }, [selectedMaster, selectedDate]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [svcRes, mastersRes, tenantRes] = await Promise.all([
                apiClient.get(`/booking/public/services?tenant_id=${tenantId}`),
                apiClient.get(`/booking/public/masters?tenant_id=${tenantId}`),
                apiClient.get(`/booking/public/tenant-info?tenant_id=${tenantId}`).catch(() => ({ name: 'СФЕРУМ' }))
            ]);
            setServices(Array.isArray(svcRes) ? svcRes : []);
            setMasters(Array.isArray(mastersRes) ? mastersRes : []);
            setTenantName(tenantRes && tenantRes.name ? tenantRes.name : 'СФЕРУМ');
        } catch (err) {
            console.error('Failed to load public booking data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadBusySlots = async () => {
        try {
            const res = await apiClient.get(`/booking/public/appointments?tenant_id=${tenantId}&date=${selectedDate}`);
            setBusyAppointments(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Failed to load busy slots:', err);
        }
    };

    // Calculate timeslots (09:00 to 20:00, step 30m)
    const timeSlots: string[] = [];
    for (let h = 9; h <= 20; h++) {
        timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
        if (h < 20) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const isSlotBusy = (time: string) => {
        if (!selectedMaster) return false;
        
        const slotStart = new Date(`${selectedDate}T${time}:00`);
        const duration = selectedService?.duration_minutes || 60;
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        return busyAppointments.some(app => {
            if (app.master_id !== selectedMaster.id) return false;
            const appStart = new Date(app.datetime_start);
            const appEnd = new Date(app.datetime_end);
            
            // Overlap check
            return slotStart < appEnd && slotEnd > appStart;
        });
    };

    const handleBooking = async () => {
        if (!clientName || !clientPhone) {
            alert('Пожалуйста, введите ваше имя и телефон');
            return;
        }

        const startDt = new Date(`${selectedDate}T${selectedTime}:00`);
        const duration = selectedService?.duration_minutes || 60;
        const endDt = new Date(startDt.getTime() + duration * 60000);

        try {
            await apiClient.post('/booking/public/appointments', {
                tenant_id: tenantId,
                service_id: selectedService?.id,
                master_id: selectedMaster?.id,
                client_name: clientName,
                client_phone: clientPhone,
                datetime_start: startDt.toISOString(),
                datetime_end: endDt.toISOString(),
                notes: clientNotes
            });
            
            setSuccessState(true);
        } catch (err) {
            console.error(err);
            alert('Не удалось совершить запись. Выберите другое время.');
        }
    };

    const dateList = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-[#F95700] dark:border-t-[#F95700] animate-spin mx-auto" />
                    <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest font-mono">Загрузка виджета...</p>
                </div>
            </div>
        );
    }

    if (successState) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
                {/* Внешний Double-Bezel контейнер успеха */}
                <div className="relative overflow-hidden p-1.5 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 w-full max-w-md">
                    <div className="w-full bg-white dark:bg-zinc-950 rounded-[calc(2.5rem-0.375rem)] p-8 text-center shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 relative z-10">
                            <CheckCircle2 className="w-10 h-10 animate-bounce" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white font-['Montserrat'] tracking-wide uppercase">Успешная запись</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                                Запись успешно подтверждена. Мастер и администратор уведомлены о вашем визите.
                            </p>
                        </div>

                        <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 text-left text-xs space-y-3 font-medium relative z-10">
                            <div className="flex justify-between border-b border-zinc-200/30 dark:border-zinc-800/20 pb-2">
                                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Услуга:</span>
                                <span className="text-zinc-900 dark:text-white font-semibold font-['Montserrat']">{selectedService?.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-200/30 dark:border-zinc-800/20 pb-2">
                                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Специалист:</span>
                                <span className="text-zinc-900 dark:text-white font-semibold font-['Montserrat']">{selectedMaster?.username}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400 font-mono text-[9px] uppercase tracking-wider">Дата и время:</span>
                                <span className="text-zinc-900 dark:text-white font-black font-mono">
                                    {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {selectedTime}
                                </span>
                            </div>
                        </div>

                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold font-mono tracking-widest uppercase relative z-10">Спасибо за доверие!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            {/* Внешний Double-Bezel контейнер виджета */}
            <div className="relative overflow-hidden p-1.5 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 w-full max-w-2xl">
                <div className="w-full bg-white dark:bg-zinc-950 rounded-[calc(2.5rem-0.375rem)] shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[550px] relative">
                    
                    {/* Левый информационный сайдбар */}
                    <div className="w-full md:w-64 bg-gradient-to-br from-[#F95700]/[0.06] via-transparent to-amber-500/[0.03] p-8 border-b md:border-b-0 md:border-r border-zinc-200/50 dark:border-zinc-800/40 flex flex-col justify-between shrink-0 relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#F95700]/[0.03] to-transparent pointer-events-none" />
                        <div className="space-y-6 relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F95700]/10 border border-[#F95700]/20 text-[#F95700] text-[9px] font-black uppercase tracking-widest font-mono">
                                <Sparkles className="w-3 h-3 text-[#F95700] animate-pulse" />
                                <span>Онлайн-Запись</span>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-xl font-black text-zinc-900 dark:text-white font-['Montserrat'] leading-tight tracking-wide">{tenantName}</h1>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">Быстрое бронирование услуг и времени специалистов онлайн.</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-zinc-200/40 dark:border-zinc-800/40 relative z-10">
                            {selectedService && (
                                <div className="text-xs font-medium space-y-1">
                                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">Выбранная услуга</span>
                                    <span className="text-zinc-900 dark:text-white block font-semibold">{selectedService.name}</span>
                                    <span className="text-[#F95700] font-black font-mono">{selectedService.price} ₽</span>
                                </div>
                            )}
                            {selectedMaster && (
                                <div className="text-xs font-medium space-y-1">
                                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">Специалист</span>
                                    <span className="text-zinc-900 dark:text-white block font-semibold">{selectedMaster.username}</span>
                                </div>
                            )}
                            {selectedTime && (
                                <div className="text-xs font-medium space-y-1">
                                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase tracking-wider font-mono">Дата и время</span>
                                    <span className="text-zinc-900 dark:text-white block font-semibold">
                                        {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в {selectedTime}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Interactive Panel */}
                    <div className="flex-1 p-8 flex flex-col justify-between relative">
                        <div>
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-4 mb-6">
                                <h2 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-['Montserrat']">
                                    {step === 1 && '1. Выберите услугу'}
                                    {step === 2 && '2. Выберите специалиста'}
                                    {step === 3 && '3. Выберите дату и время'}
                                    {step === 4 && '4. Ваши контакты'}
                                </h2>
                                <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-black uppercase">Шаг {step} / 4</span>
                            </div>

                            {/* Step 1: Services List */}
                            {step === 1 && (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar animate-fadeIn">
                                    {services.map(svc => (
                                        <div 
                                            key={svc.id}
                                            onClick={() => { setSelectedService(svc); setStep(2); }}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] flex items-center justify-between group/item ${
                                                selectedService?.id === svc.id 
                                                ? 'border-[#F95700] bg-[#F95700]/[0.04] dark:bg-[#F95700]/[0.02]' 
                                                : 'border-zinc-200/60 dark:border-zinc-800/60 hover:border-[#F95700]/40 dark:hover:border-[#F95700]/30 bg-zinc-50/50 dark:bg-zinc-900/20'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <span className="text-xs font-black text-zinc-900 dark:text-white block font-['Montserrat'] tracking-wide">{svc.name}</span>
                                                <span className="text-[9px] text-zinc-400 font-bold block flex items-center gap-1 font-mono tracking-wider uppercase">
                                                    <Clock className="w-3.5 h-3.5 text-[#F95700]" /> {svc.duration_minutes} мин
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-zinc-900 dark:text-white font-mono">{svc.price} ₽</span>
                                                <ChevronRight className="w-4 h-4 text-zinc-400 transition-transform duration-300 group-hover/item:translate-x-0.5" />
                                            </div>
                                        </div>
                                    ))}
                                    {services.length === 0 && (
                                        <p className="text-zinc-500 text-xs italic py-10 text-center font-mono">Нет доступных услуг для бронирования.</p>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Masters list */}
                            {step === 2 && (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar animate-fadeIn">
                                    {masters.map(m => (
                                        <div 
                                            key={m.id}
                                            onClick={() => { setSelectedMaster(m); setStep(3); }}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] flex items-center gap-3 group/item ${
                                                selectedMaster?.id === m.id 
                                                ? 'border-[#F95700] bg-[#F95700]/[0.04] dark:bg-[#F95700]/[0.02]' 
                                                : 'border-zinc-200/60 dark:border-zinc-800/60 hover:border-[#F95700]/40 dark:hover:border-[#F95700]/30 bg-zinc-50/50 dark:bg-zinc-900/20'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-[#F95700]/10 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                                                <span className="relative z-10 font-['Montserrat']">{m.username.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-black text-zinc-900 dark:text-white block font-['Montserrat'] tracking-wide">{m.username}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                    </span>
                                                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider">ДОСТУПЕН</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-400 transition-transform duration-300 group-hover/item:translate-x-0.5" />
                                        </div>
                                    ))}
                                    {masters.length === 0 && (
                                        <p className="text-zinc-500 text-xs italic py-10 text-center font-mono">Нет свободных мастеров.</p>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Date & Slots */}
                            {step === 3 && (
                                <div className="space-y-5 animate-fadeIn">
                                    {/* Date select slider */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar">
                                        {dateList.map((dateStr, idx) => {
                                            const d = new Date(dateStr);
                                            const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
                                            const dayNum = d.getDate();
                                            const isSel = selectedDate === dateStr;
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                                                    className={`px-4 py-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] shrink-0 min-w-[65px] ${
                                                        isSel
                                                        ? 'border-transparent bg-gradient-to-br from-orange-500 to-[#F95700] text-white shadow-md shadow-orange-500/20'
                                                        : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-400 hover:border-[#F95700]/30'
                                                    }`}
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider block opacity-75 font-mono">{dayName}</span>
                                                    <span className="text-sm block mt-0.5 font-mono font-black">{dayNum}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Time slots */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                        {timeSlots.map((time, idx) => {
                                            const isBusy = isSlotBusy(time);
                                            const isSel = selectedTime === time;
                                            return (
                                                <button
                                                    key={idx}
                                                    disabled={isBusy}
                                                    onClick={() => { setSelectedTime(time); setStep(4); }}
                                                    className={`py-2.5 rounded-xl border font-black text-xs font-mono transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                                                        isBusy 
                                                        ? 'border-zinc-100/30 dark:border-zinc-900/20 bg-zinc-50/20 dark:bg-zinc-950/20 text-zinc-300 dark:text-zinc-800 cursor-not-allowed line-through opacity-35'
                                                        : isSel
                                                        ? 'border-transparent bg-gradient-to-br from-orange-500 to-[#F95700] text-white shadow-md shadow-orange-500/15'
                                                        : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-400 hover:border-[#F95700]/45 dark:hover:border-[#F95700]/30 hover:bg-[#F95700]/[0.02]'
                                                    }`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Contact Form */}
                            {step === 4 && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                            <UserIcon className="w-3.5 h-3.5 text-[#F95700]" /> Ваше имя
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Иван Иванов"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-all duration-300 font-['Montserrat']"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                            <Phone className="w-3.5 h-3.5 text-[#F95700]" /> Номер телефона
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="+7 (999) 000-00-00"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-all duration-300 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                            <Tag className="w-3.5 h-3.5 text-[#F95700]" /> Пожелания / Комментарий
                                        </label>
                                        <textarea 
                                            placeholder="Например: хочу покрасить в темно-серый цвет..."
                                            value={clientNotes}
                                            onChange={(e) => setClientNotes(e.target.value)}
                                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-[#F95700] focus:ring-2 focus:ring-[#F95700]/20 transition-all duration-300 h-16 resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800/60 shrink-0">
                            {step > 1 ? (
                                <button 
                                    onClick={() => setStep(step - 1)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition active:scale-[0.98]"
                                >
                                    Назад
                                </button>
                            ) : (
                                <div />
                            )}

                            {step === 4 ? (
                                <button 
                                    onClick={handleBooking}
                                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-[#F95700] hover:shadow-lg hover:shadow-orange-500/15 text-white font-bold text-xs rounded-full hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 shadow-md shadow-orange-500/10 cursor-pointer"
                                >
                                    Записаться
                                </button>
                            ) : (
                                step < 4 && (
                                    <button 
                                        disabled={
                                            (step === 1 && !selectedService) || 
                                            (step === 2 && !selectedMaster) || 
                                            (step === 3 && !selectedTime)
                                        }
                                        onClick={() => setStep(step + 1)}
                                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Продолжить
                                    </button>
                                )
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
