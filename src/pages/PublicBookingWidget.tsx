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
            const [svcRes, mastersRes] = await Promise.all([
                apiClient.get(`/booking/public/services?tenant_id=${tenantId}`),
                apiClient.get(`/booking/public/masters?tenant_id=${tenantId}`)
            ]);
            setServices(Array.isArray(svcRes) ? svcRes : []);
            setMasters(Array.isArray(mastersRes) ? mastersRes : []);
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
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin mx-auto" />
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">Загрузка виджета записи...</p>
                </div>
            </div>
        );
    }

    if (successState) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl space-y-6 animate-scaleUp">
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/25">
                        <CheckCircle2 className="w-10 h-10 animate-bounce" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-zinc-950 dark:text-white font-['Montserrat']">Вы успешно записаны!</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                            Запись создана в CRM. Мастер и администратор уведомлены о вашем визите.
                        </p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-left text-xs space-y-3 font-semibold">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Услуга:</span>
                            <span className="text-zinc-900 dark:text-white">{selectedService?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Специалист:</span>
                            <span className="text-zinc-900 dark:text-white">{selectedMaster?.username}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Дата и время:</span>
                            <span className="text-zinc-950 dark:text-white font-bold">
                                {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {selectedTime}
                            </span>
                        </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-bold">Спасибо, что пользуетесь нашими услугами!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">
                
                {/* Left informational sidebar */}
                <div className="w-full md:w-64 bg-gradient-to-br from-orange-500/10 via-[#F95700]/5 to-amber-500/10 p-8 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shrink-0">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#F95700] text-[10px] font-black uppercase tracking-wider">
                            <Sparkles className="w-3 h-3" />
                            <span>Онлайн-Запись</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black text-zinc-900 dark:text-white font-['Montserrat'] leading-tight">СФЕРА</h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">Быстрое бронирование услуг и времени специалистов онлайн.</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        {selectedService && (
                            <div className="text-xs font-bold space-y-1">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Выбранная услуга</span>
                                <span className="text-zinc-900 dark:text-white block">{selectedService.name}</span>
                                <span className="text-[#F95700] font-black">{selectedService.price} ₽</span>
                            </div>
                        )}
                        {selectedMaster && (
                            <div className="text-xs font-bold space-y-1">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Специалист</span>
                                <span className="text-zinc-900 dark:text-white block">{selectedMaster.username}</span>
                            </div>
                        )}
                        {selectedTime && (
                            <div className="text-xs font-bold space-y-1">
                                <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Дата и время</span>
                                <span className="text-zinc-900 dark:text-white block">
                                    {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в {selectedTime}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Interactive Panel */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
                            <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                                {step === 1 && '1. Выберите услугу'}
                                {step === 2 && '2. Выберите специалиста'}
                                {step === 3 && '3. Выберите дату и время'}
                                {step === 4 && '4. Ваши контакты'}
                            </h2>
                            <span className="text-xs text-zinc-400 font-black">Шаг {step} из 4</span>
                        </div>

                        {/* Step 1: Services List */}
                        {step === 1 && (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {services.map(svc => (
                                    <div 
                                        key={svc.id}
                                        onClick={() => { setSelectedService(svc); setStep(2); }}
                                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                                            selectedService?.id === svc.id 
                                            ? 'border-orange-500 bg-orange-500/5' 
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500/30 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <span className="text-xs font-black text-zinc-900 dark:text-white block">{svc.name}</span>
                                            <span className="text-[10px] text-zinc-400 font-bold block flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> {svc.duration_minutes} минут
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{svc.price} ₽</span>
                                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <p className="text-zinc-500 text-xs italic py-10 text-center">Нет доступных услуг для бронирования.</p>
                                )}
                            </div>
                        )}

                        {/* Step 2: Masters list */}
                        {step === 2 && (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {masters.map(m => (
                                    <div 
                                        key={m.id}
                                        onClick={() => { setSelectedMaster(m); setStep(3); }}
                                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3 ${
                                            selectedMaster?.id === m.id 
                                            ? 'border-orange-500 bg-orange-500/5' 
                                            : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500/30 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950 text-[#F95700] flex items-center justify-center font-bold text-sm shrink-0 border border-orange-500/10">
                                            {m.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-black text-zinc-900 dark:text-white block">{m.username}</span>
                                            <span className="text-[10px] text-zinc-400 font-bold block">Специалист компании</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                                    </div>
                                ))}
                                {masters.length === 0 && (
                                    <p className="text-zinc-500 text-xs italic py-10 text-center">Нет свободных мастеров.</p>
                                )}
                            </div>
                        )}

                        {/* Step 3: Date & Slots */}
                        {step === 3 && (
                            <div className="space-y-5">
                                {/* Date select slider */}
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {dateList.map((dateStr, idx) => {
                                        const d = new Date(dateStr);
                                        const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
                                        const dayNum = d.getDate();
                                        const isSel = selectedDate === dateStr;
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                                                className={`px-4 py-2.5 rounded-xl border text-center font-bold cursor-pointer transition shrink-0 min-w-[65px] ${
                                                    isSel
                                                    ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400'
                                                }`}
                                            >
                                                <span className="text-[9px] uppercase tracking-wider block opacity-75">{dayName}</span>
                                                <span className="text-sm block mt-0.5">{dayNum}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Time slots */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                                    {timeSlots.map((time, idx) => {
                                        const isBusy = isSlotBusy(time);
                                        const isSel = selectedTime === time;
                                        return (
                                            <button
                                                key={idx}
                                                disabled={isBusy}
                                                onClick={() => { setSelectedTime(time); setStep(4); }}
                                                className={`py-2 rounded-xl border font-bold text-xs transition ${
                                                    isBusy 
                                                    ? 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50'
                                                    : isSel
                                                    ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-orange-500/30'
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
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5" /> Ваше имя
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Иван Иванов"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5" /> Номер телефона
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="+7 (999) 000-00-00"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-orange-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" /> Пожелания / Комментарий
                                    </label>
                                    <textarea 
                                        placeholder="Например: хочу покрасить в темно-серый цвет..."
                                        value={clientNotes}
                                        onChange={(e) => setClientNotes(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white text-xs font-bold outline-none focus:border-orange-500 h-16 resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                        {step > 1 ? (
                            <button 
                                onClick={() => setStep(step - 1)}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Назад
                            </button>
                        ) : (
                            <div />
                        )}

                        {step === 4 ? (
                            <button 
                                onClick={handleBooking}
                                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-[#F95700] hover:shadow-orange-500/20 shadow-md text-white font-bold text-xs rounded-xl hover:scale-[1.01] transition"
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
                                    className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs rounded-xl hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Продолжить
                                </button>
                            )
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
