import { useState, useEffect } from 'react';
import { Map, Leaf, Tractor, Clock, CheckCircle2, PlayCircle, Plus, Beef, DollarSign, Activity, AlertTriangle, Tag, HeartPulse, Wheat } from 'lucide-react';
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
    rfid_chip?: string;
    breed?: string;
    gender?: string;
    origin?: string;
    herd_name?: string;
    quantity: number;
    current_weight: number;
    status: string;
}

interface AgroOffspring {
    id: number;
    mother_id: number;
    birth_date: string;
    sex: string;
    birth_weight: number;
    status: string;
}

interface AgroMortality {
    id: number;
    animal_id: number;
    date: string;
    cause: string;
    diagnosis?: string;
    vet_name?: string;
}

export default function AgroDashboard() {
    const { success, error } = useToast();
    const [fields, setFields] = useState<AgroField[]>([]);
    const [operations, setOperations] = useState<AgroOperation[]>([]);
    const [livestock, setLivestock] = useState<AgroLivestock[]>([]);
    const [offspringList, setOffspringList] = useState<AgroOffspring[]>([]);
    const [mortalityList, setMortalityList] = useState<AgroMortality[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'map' | 'operations' | 'livestock_cattle' | 'livestock_small' | 'livestock_horses' | 'feed' | 'vet'>('map');

    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [newFieldData, setNewFieldData] = useState({
        name: '',
        area_hectares: 100,
        current_crop: 'Пшеница озимая',
        soil_type: 'Чернозём'
    });

    const [isAddOperationModalOpen, setIsAddOperationModalOpen] = useState(false);
    const [newOperationData, setNewOperationData] = useState({
        field_id: 0,
        operation_type: 'Вспышка и культивация',
        equipment_name: 'John Deere 8R / Трактор',
        date: new Date().toISOString().split('T')[0],
        fuel_consumed: 150
    });

    // Livestock Enterprise Modals
    const [isAddLivestockModalOpen, setIsAddLivestockModalOpen] = useState(false);
    const [newLivestockData, setNewLivestockData] = useState({
        animal_type: 'КРС',
        tracking_type: 'individual',
        tag_number: '',
        rfid_chip: '',
        breed: 'Голштинская',
        gender: 'female',
        origin: 'farm_born',
        quantity: 1,
        current_weight: 420
    });

    const [isAddOffspringModalOpen, setIsAddOffspringModalOpen] = useState(false);
    const [newOffspringData, setNewOffspringData] = useState({
        mother_id: 0,
        sex: 'female',
        birth_weight: 34.5,
        status: 'alive',
        create_child_card: true
    });

    const [isAddMortalityModalOpen, setIsAddMortalityModalOpen] = useState(false);
    const [newMortalityData, setNewMortalityData] = useState({
        animal_id: 0,
        cause: 'disease',
        diagnosis: '',
        vet_name: 'Иванов А.С.',
        note: ''
    });

    // Load data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fieldsRes, opsRes, livestockRes, offRes, mortRes] = await Promise.all([
                apiClient.get('/agro/fields'),
                apiClient.get('/agro/operations'),
                apiClient.get('/agro/livestock'),
                apiClient.get('/agro/livestock/offspring').catch(() => []),
                apiClient.get('/agro/livestock/mortality').catch(() => [])
            ]);
            setFields(Array.isArray(fieldsRes) ? fieldsRes : []);
            setOperations(Array.isArray(opsRes) ? opsRes : []);
            setLivestock(Array.isArray(livestockRes) ? livestockRes : []);
            setOffspringList(Array.isArray(offRes) ? offRes : []);
            setMortalityList(Array.isArray(mortRes) ? mortRes : []);
        } catch (err) {
            console.error(err);
            error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLivestockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/agro/livestock', newLivestockData);
            success('Карточка животного создана');
            setIsAddLivestockModalOpen(false);
            fetchData();
        } catch (err: any) {
            error(err.response?.data?.detail || 'Ошибка создания карточки');
        }
    };

    const handleCreateOffspringSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/agro/livestock/offspring', newOffspringData);
            success('Приплод зарегистрирован, карточка молодняка создана');
            setIsAddOffspringModalOpen(false);
            fetchData();
        } catch (err: any) {
            error(err.response?.data?.detail || 'Ошибка регистрации приплода');
        }
    };

    const handleCreateMortalitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/agro/livestock/mortality', newMortalityData);
            success('Акт выбытия/падежа зарегистрирован');
            setIsAddMortalityModalOpen(false);
            fetchData();
        } catch (err: any) {
            error(err.response?.data?.detail || 'Ошибка регистрации акта');
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

    const handleAddFieldSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFieldData.name) return;
        try {
            await apiClient.post('/agro/fields', newFieldData);
            success('Поле успешно добавлено в реестр');
            setIsAddFieldModalOpen(false);
            setNewFieldData({ name: '', area_hectares: 100, current_crop: 'Пшеница озимая', soil_type: 'Чернозём' });
            fetchData();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.detail || 'Ошибка при добавлении поля');
        }
    };

    const handleAddOperationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/agro/operations', {
                field_id: Number(newOperationData.field_id) || (fields[0]?.id || 1),
                operation_type: newOperationData.operation_type,
                equipment_name: newOperationData.equipment_name,
                date: newOperationData.date,
                fuel_consumed: Number(newOperationData.fuel_consumed) || 0
            });
            success('Полевая операция запланирована');
            setIsAddOperationModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            error(err.response?.data?.detail || 'Ошибка при создании операции');
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
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setIsAddFieldModalOpen(true)}
                        className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-[#F95700]" /> Поле
                    </button>
                    <button
                        onClick={() => setIsAddOperationModalOpen(true)}
                        className="px-3.5 py-2 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Операция
                    </button>
                    <button
                        onClick={() => setIsAddLivestockModalOpen(true)}
                        className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-[#F95700]" /> Голова / Стадо
                    </button>
                    <button
                        onClick={() => setIsAddOffspringModalOpen(true)}
                        className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-[#F95700]" /> Приплод
                    </button>
                    <button
                        onClick={() => setIsAddMortalityModalOpen(true)}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all text-xs cursor-pointer"
                    >
                        <AlertTriangle className="w-4 h-4" /> Акт убыли
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 pb-px">
                <button 
                    onClick={() => setActiveTab('map')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'map' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Map className="w-4 h-4" /> Карта Полей (2GIS)
                </button>
                <button 
                    onClick={() => setActiveTab('operations')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'operations' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Tractor className="w-4 h-4" /> Канбан Операций
                </button>
                <button 
                    onClick={() => setActiveTab('livestock_cattle')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'livestock_cattle' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Beef className="w-4 h-4" /> Стадо КРС
                </button>
                <button 
                    onClick={() => setActiveTab('livestock_small')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'livestock_small' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Tag className="w-4 h-4" /> МРС (Овцы/Козы)
                </button>
                <button 
                    onClick={() => setActiveTab('livestock_horses')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'livestock_horses' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Activity className="w-4 h-4" /> Лошади
                </button>
                <button 
                    onClick={() => setActiveTab('feed')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'feed' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <Wheat className="w-4 h-4" /> Корма и Рационы
                </button>
                <button 
                    onClick={() => setActiveTab('vet')}
                    className={`pb-3 px-3 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ${activeTab === 'vet' ? 'border-[#F95700] text-[#F95700] font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                >
                    <HeartPulse className="w-4 h-4" /> Ветжурнал и Убыль
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

            {(activeTab === 'livestock_cattle' || activeTab === 'livestock_small' || activeTab === 'livestock_horses') && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500">Поголовье в категории</div>
                            <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
                                {livestock
                                    .filter(a => activeTab === 'livestock_cattle' ? a.animal_type === 'КРС' : activeTab === 'livestock_small' ? a.animal_type === 'МРС' : a.animal_type === 'Лошади')
                                    .reduce((acc, a) => acc + (a.status === 'active' ? a.quantity : 0), 0)} гол.
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500">Общая живая масса</div>
                            <div className="text-2xl font-bold mt-1 text-emerald-600">
                                {livestock
                                    .filter(a => activeTab === 'livestock_cattle' ? a.animal_type === 'КРС' : activeTab === 'livestock_small' ? a.animal_type === 'МРС' : a.animal_type === 'Лошади')
                                    .reduce((acc, a) => acc + (a.status === 'active' ? a.current_weight * a.quantity : 0), 0)} кг
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500">Зарегистрировано приплода</div>
                            <div className="text-2xl font-bold mt-1 text-blue-600">{offspringList.length} акт.</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <div className="text-xs text-zinc-500">Акты выбытия / падежа</div>
                            <div className="text-2xl font-bold mt-1 text-red-500">{mortalityList.length} зап.</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {livestock
                            .filter(animal => activeTab === 'livestock_cattle' ? animal.animal_type === 'КРС' : activeTab === 'livestock_small' ? animal.animal_type === 'МРС' : animal.animal_type === 'Лошади')
                            .map(animal => (
                            <div key={animal.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                                            <Beef className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">
                                                {animal.tracking_type === 'individual' ? `Бирка #${animal.tag_number}` : animal.herd_name}
                                            </h3>
                                            <p className="text-xs text-zinc-500">
                                                {animal.breed || 'Порода не указана'} · {animal.gender === 'male' ? 'Самец' : 'Самка'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${animal.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : animal.status === 'sold' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                        {animal.status === 'active' ? 'В стаде (Активен)' : animal.status === 'sold' ? 'Реализован' : 'Выбыл'}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                        <div className="text-[11px] text-zinc-500 mb-0.5">Поголовье</div>
                                        <div className="font-bold dark:text-white">{animal.quantity} гол.</div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                        <div className="text-[11px] text-zinc-500 mb-0.5">Вес гол.</div>
                                        <div className="font-bold dark:text-white">{animal.current_weight} кг</div>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                        <div className="text-[11px] text-zinc-500 mb-0.5">Происх.</div>
                                        <div className="font-bold text-xs dark:text-white">{animal.origin === 'purchased' ? 'Покупка' : 'своё'}</div>
                                    </div>
                                </div>
                                
                                {animal.status === 'active' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleSellLivestock(animal.id)}
                                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <DollarSign className="w-3.5 h-3.5" /> Продажа
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setNewMortalityData({ ...newMortalityData, animal_id: animal.id });
                                                setIsAddMortalityModalOpen(true);
                                            }}
                                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" /> Убыль
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'feed' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                                    <Wheat className="w-5 h-5 text-amber-500" />
                                    Нормы и рационы кормления скота (1С:Сельхозстандарт)
                                </h2>
                                <p className="text-sm text-zinc-500">Автоматический расчет потребности в кормах на сутки и сезон</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-sm dark:text-white mb-2">КРС Молочное направление</h3>
                                <div className="text-xs text-zinc-500 space-y-1">
                                    <div>• Сено разнотравное: <span className="font-semibold text-zinc-900 dark:text-white">6 кг/гол</span></div>
                                    <div>• Силос кукурузный: <span className="font-semibold text-zinc-900 dark:text-white">22 кг/гол</span></div>
                                    <div>• Комбикорм КК-60: <span className="font-semibold text-zinc-900 dark:text-white">4.5 кг/гол</span></div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-sm dark:text-white mb-2">КРС Мясной откорм</h3>
                                <div className="text-xs text-zinc-500 space-y-1">
                                    <div>• Сенаж бобовый: <span className="font-semibold text-zinc-900 dark:text-white">12 кг/гол</span></div>
                                    <div>• Зерносмесь плющеная: <span className="font-semibold text-zinc-900 dark:text-white">5.5 кг/гол</span></div>
                                    <div>• Премикс витаминный: <span className="font-semibold text-zinc-900 dark:text-white">0.15 кг/гол</span></div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-sm dark:text-white mb-2">МРС (Овцы матки)</h3>
                                <div className="text-xs text-zinc-500 space-y-1">
                                    <div>• Сено луговое: <span className="font-semibold text-zinc-900 dark:text-white">2.2 кг/гол</span></div>
                                    <div>• Ячмень дробленый: <span className="font-semibold text-zinc-900 dark:text-white">0.4 кг/гол</span></div>
                                    <div>• Солевой лизунец: <span className="font-semibold text-zinc-900 dark:text-white">по потребности</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'vet' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                                <HeartPulse className="w-5 h-5 text-blue-500" />
                                Журнал приплода (отел / окот)
                            </h2>
                            <div className="space-y-3">
                                {offspringList.length === 0 ? (
                                    <div className="text-sm text-zinc-500 py-4">Акты рождения пока отсутствуют</div>
                                ) : (
                                    offspringList.map(o => (
                                        <div key={o.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-sm dark:text-white">Приплод #{o.id} ({o.sex === 'male' ? 'Самец' : 'Самка'})</div>
                                                <div className="text-xs text-zinc-500">Мать ID: #{o.mother_id} · Вес при рожд.: {o.birth_weight} кг</div>
                                            </div>
                                            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-md">{o.status}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Журнал выбытия и падежа
                            </h2>
                            <div className="space-y-3">
                                {mortalityList.length === 0 ? (
                                    <div className="text-sm text-zinc-500 py-4">Акты выбытия/падежа отсутствуют</div>
                                ) : (
                                    mortalityList.map(m => (
                                        <div key={m.id} className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 flex justify-between items-center border border-red-200/50 dark:border-red-900/30">
                                            <div>
                                                <div className="font-semibold text-sm text-red-700 dark:text-red-400">Акт #{m.id} · Причина: {m.cause}</div>
                                                <div className="text-xs text-zinc-500">Животное ID: #{m.animal_id} · Диагноз: {m.diagnosis || '-'}</div>
                                            </div>
                                            <span className="text-xs text-zinc-500">{m.vet_name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ================= MODAL: ДОБАВИТЬ ПОЛЕ ================= */}
            {isAddFieldModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Добавить сельскохозяйственное поле</h3>
                        <form onSubmit={handleAddFieldSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Название поля *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Например: Поле №4 - Южный склон"
                                    value={newFieldData.name}
                                    onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Площадь (га)</label>
                                    <input
                                        type="number"
                                        value={newFieldData.area_hectares}
                                        onChange={(e) => setNewFieldData({ ...newFieldData, area_hectares: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Тип почвы</label>
                                    <input
                                        type="text"
                                        value={newFieldData.soil_type}
                                        onChange={(e) => setNewFieldData({ ...newFieldData, soil_type: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Текущая культура</label>
                                <input
                                    type="text"
                                    value={newFieldData.current_crop}
                                    onChange={(e) => setNewFieldData({ ...newFieldData, current_crop: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddFieldModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                >
                                    Сохранить поле
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: НОВАЯ ОПЕРАЦИЯ ================= */}
            {isAddOperationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Запланировать полевую операцию</h3>
                        <form onSubmit={handleAddOperationSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Поле</label>
                                <select
                                    value={newOperationData.field_id}
                                    onChange={(e) => setNewOperationData({ ...newOperationData, field_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value={0}>Выберите поле...</option>
                                    {fields.map(f => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.area_hectares} га)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Тип операции</label>
                                <input
                                    type="text"
                                    placeholder="Вспышка, Посев, Опрыскивание, Уборка"
                                    value={newOperationData.operation_type}
                                    onChange={(e) => setNewOperationData({ ...newOperationData, operation_type: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Назначенная техника / оператор</label>
                                <input
                                    type="text"
                                    placeholder="Например: Трактор John Deere 8R"
                                    value={newOperationData.equipment_name}
                                    onChange={(e) => setNewOperationData({ ...newOperationData, equipment_name: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Дата</label>
                                    <input
                                        type="date"
                                        value={newOperationData.date}
                                        onChange={(e) => setNewOperationData({ ...newOperationData, date: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Расход ГСМ (л)</label>
                                    <input
                                        type="number"
                                        value={newOperationData.fuel_consumed}
                                        onChange={(e) => setNewOperationData({ ...newOperationData, fuel_consumed: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOperationModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                                >
                                    Запланировать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ДОБАВИТЬ ЖИВОТНОЕ / СТАДО ================= */}
            {isAddLivestockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Регистрация животного / группы</h3>
                        <form onSubmit={handleCreateLivestockSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Вид скота</label>
                                    <select
                                        value={newLivestockData.animal_type}
                                        onChange={(e) => setNewLivestockData({ ...newLivestockData, animal_type: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    >
                                        <option value="КРС">КРС (Крупный рогатый скот)</option>
                                        <option value="МРС">МРС (Овцы, Козы)</option>
                                        <option value="Лошади">Лошади</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Пол</label>
                                    <select
                                        value={newLivestockData.gender}
                                        onChange={(e) => setNewLivestockData({ ...newLivestockData, gender: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    >
                                        <option value="female">Самка (Корова/Овца)</option>
                                        <option value="male">Самец (Бык/Баран)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Номер бирки / RFID</label>
                                <input
                                    type="text"
                                    placeholder="Например: RU-56-8841"
                                    value={newLivestockData.tag_number}
                                    onChange={(e) => setNewLivestockData({ ...newLivestockData, tag_number: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Порода</label>
                                    <input
                                        type="text"
                                        value={newLivestockData.breed}
                                        onChange={(e) => setNewLivestockData({ ...newLivestockData, breed: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Текущий вес (кг)</label>
                                    <input
                                        type="number"
                                        value={newLivestockData.current_weight}
                                        onChange={(e) => setNewLivestockData({ ...newLivestockData, current_weight: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddLivestockModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ПРИПЛОД ================= */}
            {isAddOffspringModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Регистрация приплода (отел / окот)</h3>
                        <form onSubmit={handleCreateOffspringSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">ID материнской особи *</label>
                                <input
                                    type="number"
                                    value={newOffspringData.mother_id || ''}
                                    onChange={(e) => setNewOffspringData({ ...newOffspringData, mother_id: Number(e.target.value) })}
                                    placeholder="ID коровы / матки"
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Пол новорождённого</label>
                                    <select
                                        value={newOffspringData.sex}
                                        onChange={(e) => setNewOffspringData({ ...newOffspringData, sex: e.target.value })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    >
                                        <option value="female">Тёлочка / Ярочка</option>
                                        <option value="male">Бычок / Баранчик</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Вес при рождении (кг)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={newOffspringData.birth_weight}
                                        onChange={(e) => setNewOffspringData({ ...newOffspringData, birth_weight: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOffspringModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                >
                                    Зарегистрировать приплод
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: АКТ УБЫЛИ / ПАДЕЖА ================= */}
            {isAddMortalityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold dark:text-white mb-4">Акт выбытия / падежа скота</h3>
                        <form onSubmit={handleCreateMortalitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">ID животного *</label>
                                <input
                                    type="number"
                                    value={newMortalityData.animal_id || ''}
                                    onChange={(e) => setNewMortalityData({ ...newMortalityData, animal_id: Number(e.target.value) })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Причина выбытия</label>
                                <select
                                    value={newMortalityData.cause}
                                    onChange={(e) => setNewMortalityData({ ...newMortalityData, cause: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                >
                                    <option value="disease">Заболевание / Падеж</option>
                                    <option value="trauma">Травма / Несчастный случай</option>
                                    <option value="forced_slaughter">Вынужденный убой</option>
                                    <option value="sold">Реализация на сторону</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Диагноз / Заключение ветеринара</label>
                                <input
                                    type="text"
                                    placeholder="Например: бронхопневмония телят"
                                    value={newMortalityData.diagnosis}
                                    onChange={(e) => setNewMortalityData({ ...newMortalityData, diagnosis: e.target.value })}
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddMortalityModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md"
                                >
                                    Провести акт
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
