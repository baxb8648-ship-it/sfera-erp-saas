import { useState, useEffect } from 'react';
import { Map, Leaf, Tractor, Clock, CheckCircle2, PlayCircle, Plus, Beef, Syringe, DollarSign } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';

interface AgroField {
    id: number;
    name: string;
    area_hectares: number;
    soil_type: string;
    geo_json: string;
}

interface AgroOperation {
    id: number;
    field_id: number;
    operation_type: string;
    date: string;
    equipment_name?: string;
    fuel_consumed: number;
    status: string;
    field_name?: string;
}

interface AgroLivestock {
    id: number;
    animal_type: string;
    tracking_type: string;
    tag_number?: string;
    herd_name?: string;
    quantity: number;
    current_weight: number;
    status: string;
}

export default function AgroDashboard() {
    const { success, error } = useToast();
    const [fields, setFields] = useState<AgroField[]>([]);
    const [operations, setOperations] = useState<AgroOperation[]>([]);
    const [livestock, setLivestock] = useState<AgroLivestock[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'map' | 'operations' | 'livestock'>('map');

    // Load data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fieldsRes, opsRes, livestockRes] = await Promise.all([
                apiClient.get('/agro/fields'),
                apiClient.get('/agro/operations'),
                apiClient.get('/agro/livestock')
            ]);
            setFields(Array.isArray(fieldsRes) ? fieldsRes : []);
            setOperations(Array.isArray(opsRes) ? opsRes : []);
            setLivestock(Array.isArray(livestockRes) ? livestockRes : []);
        } catch (err) {
            console.error(err);
            error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    // 2GIS Map Logic
    useEffect(() => {
        if (activeTab !== 'map') return;
        
        let map: any = null;
        
        const initMap = () => {
            if (!(window as any).DG) return;
            const container = document.getElementById('agro-map');
            if (!container) return;
            
            container.innerHTML = '';
            
            map = (window as any).DG.map('agro-map', {
                center: [51.76, 55.10], // Оренбург default
                zoom: 10,
                fullscreenControl: false
            });
            
            // Draw fields
            fields.forEach(f => {
                if (f.geo_json) {
                    try {
                        const coords = JSON.parse(f.geo_json);
                        const poly = (window as any).DG.polygon(coords, {
                            color: '#3b82f6',
                            weight: 2,
                            opacity: 0.8,
                            fillOpacity: 0.2
                        }).addTo(map);
                        poly.bindPopup(`<b>${f.name}</b><br/>Площадь: ${f.area_hectares} га<br/>Почва: ${f.soil_type || '-'}`);
                    } catch (e) {
                        console.error('Invalid geo_json for field', f.id);
                    }
                }
            });
        };

        if ((window as any).DG) {
            initMap();
        } else {
            const script = document.createElement('script');
            script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
            script.id = '2gis-script';
            script.onload = () => {
                (window as any).DG.then(initMap);
            };
            document.head.appendChild(script);
        }

        return () => {
            if (map) map.remove();
        };
    }, [activeTab, fields]);

    const handleCompleteOp = async (opId: number) => {
        if (!window.confirm("Завершить операцию? ГСМ и семена/удобрения будут списаны со склада.")) return;
        try {
            await apiClient.post(`/agro/operations/${opId}/complete`);
            success('Операция завершена, склад обновлен');
            fetchData();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.detail || 'Ошибка при завершении');
        }
    };

    const handleSellLivestock = async (id: number) => {
        const amount = prompt("Укажите сумму продажи (руб):");
        if (!amount) return;
        try {
            await apiClient.post(`/agro/livestock/${id}/sell?amount=${amount}`);
            success('Животное реализовано! Деньги зачислены в Кассу: Товары и материалы.');
            fetchData();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.detail || 'Ошибка при реализации');
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                        <Leaf className="w-8 h-8 text-emerald-500" />
                        Агро-Модуль (SaaS)
                    </h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                        Управление полями, севооборот, канбан полевых операций и учет урожая.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Новая операция
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-px">
                <button 
                    onClick={() => setActiveTab('map')}
                    className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'map' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Map className="w-4 h-4" /> Карта Полей (2GIS)
                </button>
                <button 
                    onClick={() => setActiveTab('operations')}
                    className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'operations' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Tractor className="w-4 h-4" /> Канбан Операций
                </button>
                <button 
                    onClick={() => setActiveTab('livestock')}
                    className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'livestock' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Beef className="w-4 h-4" /> Животноводство
                </button>
            </div>

            {/* Content */}
            {activeTab === 'map' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 h-[600px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm relative">
                        {loading && <div className="absolute inset-0 z-10 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center">Загрузка...</div>}
                        <div id="agro-map" className="w-full h-full" style={{ background: '#f4f4f5' }}></div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg dark:text-white">Реестр полей</h3>
                        <div className="space-y-3">
                            {fields.map(f => (
                                <div key={f.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:border-blue-500 transition-colors cursor-pointer">
                                    <div className="font-bold dark:text-white">{f.name}</div>
                                    <div className="text-sm text-zinc-500 mt-1">{f.area_hectares} га • {f.soil_type || 'Тип почвы не указан'}</div>
                                </div>
                            ))}
                            {fields.length === 0 && !loading && <div className="text-zinc-500 text-sm">Нет добавленных полей</div>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'operations' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
                    {/* Planned */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 min-w-[300px]">
                        <h3 className="font-bold flex items-center gap-2 mb-4 dark:text-white"><Clock className="w-5 h-5 text-zinc-400" /> Планируется</h3>
                        <div className="space-y-3">
                            {operations.filter(o => o.status === 'planned').map(op => (
                                <div key={op.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                                            {op.operation_type}
                                        </span>
                                        <span className="text-xs text-zinc-500">{new Date(op.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-medium dark:text-white mb-2">{op.field_name || 'Поле не указано'}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Tractor className="w-3 h-3" /> {op.equipment_name || 'Техника не назначена'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* In Progress */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 min-w-[300px]">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-blue-900 dark:text-blue-400"><PlayCircle className="w-5 h-5 text-blue-500" /> В процессе</h3>
                        <div className="space-y-3">
                            {operations.filter(o => o.status === 'in_progress').map(op => (
                                <div key={op.id} className="p-4 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800/50 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                                            {op.operation_type}
                                        </span>
                                    </div>
                                    <div className="font-medium dark:text-white mb-2">{op.field_name}</div>
                                    <div className="text-xs text-zinc-500 mb-3 flex items-center gap-1"><Tractor className="w-3 h-3" /> {op.equipment_name}</div>
                                    
                                    <button 
                                        onClick={() => handleCompleteOp(op.id)}
                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Завершить (Списать ГСМ)
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Completed */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 min-w-[300px]">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-emerald-900 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Завершено</h3>
                        <div className="space-y-3">
                            {operations.filter(o => o.status === 'completed').map(op => (
                                <div key={op.id} className="p-4 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/50 rounded-xl shadow-sm opacity-70">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">
                                            {op.operation_type}
                                        </span>
                                    </div>
                                    <div className="font-medium dark:text-white mb-1">{op.field_name}</div>
                                    <div className="text-xs text-zinc-500 line-through">Списано ГСМ: {op.fuel_consumed} л</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'livestock' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {livestock.map(animal => (
                        <div key={animal.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                        <Beef className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white">
                                            {animal.tracking_type === 'individual' ? `Бирка #${animal.tag_number}` : animal.herd_name}
                                        </h3>
                                        <p className="text-sm text-zinc-500">{animal.animal_type}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-md ${animal.status === 'active' ? 'bg-emerald-100 text-emerald-700' : animal.status === 'sold' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                    {animal.status === 'active' ? 'Активен' : animal.status === 'sold' ? 'Реализован' : animal.status}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                    <div className="text-xs text-zinc-500 mb-1">Количество</div>
                                    <div className="font-semibold dark:text-white">{animal.quantity} гол.</div>
                                </div>
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                    <div className="text-xs text-zinc-500 mb-1">Общий вес</div>
                                    <div className="font-semibold dark:text-white">{animal.current_weight} кг</div>
                                </div>
                            </div>
                            
                            {animal.status === 'active' && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleSellLivestock(animal.id)}
                                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <DollarSign className="w-4 h-4" /> Реализация
                                    </button>
                                    <button className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                        <Syringe className="w-4 h-4" /> Вакцина
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {livestock.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <Beef className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold dark:text-white">Нет животных в базе</h3>
                            <p className="text-zinc-500 text-sm mt-1">Добавьте КРС или МРС для ведения учета.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
