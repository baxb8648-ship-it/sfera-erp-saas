import { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, FileText, AlertTriangle, Package, Scissors, Wrench } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { GodTierModal } from '../components/GodTierModal';

interface InventoryItem {
    id: number;
    name: string;
    unit: string;
    quantity: number;
}

interface TechCardItem {
    id?: number;
    inventory_id: number;
    inventory_name?: string;
    inventory_unit?: string;
    quantity: number;
}

interface BookingService {
    id: number;
    name: string;
    price: number;
    duration_minutes: number;
    tech_cards: TechCardItem[];
}



export default function ServicesTechCards() {
    const { success, error, warning } = useToast();
    const [services, setServices] = useState<BookingService[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<{name: string, price: number, duration: number, category_id: number | ''}>({
        name: '', price: 0, duration: 60, category_id: ''
    });
    
    const [techCards, setTechCards] = useState<TechCardItem[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [svcRes, invRes] = await Promise.all([
                apiClient.get('/booking/services'),
                apiClient.get('/inventory/')
            ]);
            setServices(svcRes.data);
            setInventory(invRes.data);
        } catch (err) {
            console.error(err);
            error('Не удалось загрузить каталог услуг');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveService = async () => {
        if (!formData.name) {
            warning('Введите название услуги');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                price: Number(formData.price),
                duration_minutes: Number(formData.duration),
                category_id: formData.category_id ? Number(formData.category_id) : null,
                tech_cards: techCards.map(tc => ({
                    inventory_id: tc.inventory_id,
                    quantity: Number(tc.quantity)
                }))
            };

            await apiClient.post('/booking/services', payload);
            success('Услуга и техкарта сохранены');
            setIsModalOpen(false);
            setFormData({ name: '', price: 0, duration: 60, category_id: '' });
            setTechCards([]);
            fetchData();
        } catch (err) {
            console.error(err);
            error('Не удалось сохранить услугу');
        }
    };

    const addTechCardRow = () => {
        setTechCards([...techCards, { inventory_id: 0, quantity: 1 }]);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                        <Scissors className="w-8 h-8 text-blue-500" />
                        Услуги и Техкарты
                    </h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                        Настройка каталога услуг и нормативов автоматического списания ТМЦ со склада
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Новая услуга
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-zinc-500">Загрузка каталога...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => (
                        <div key={service.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">{service.name}</h3>
                                <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                                    {service.price} ₽
                                </span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                Длительность: {service.duration_minutes} мин
                            </p>

                            <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Техкарта (авто-списание)
                                </h4>
                                {service.tech_cards.length > 0 ? (
                                    <ul className="space-y-2">
                                        {service.tech_cards.map((tc, idx) => (
                                            <li key={idx} className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-zinc-400" />
                                                    {tc.inventory_name}
                                                </span>
                                                <span className="font-medium text-zinc-900 dark:text-white">
                                                    {tc.quantity} {tc.inventory_unit}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-zinc-400 italic">Списание ТМЦ не настроено</p>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {services.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                            <Wrench className="w-12 h-12 text-zinc-300 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Каталог услуг пуст</h3>
                            <p className="text-zinc-500 max-w-md mt-2">Добавьте услуги и настройте нормы списания материалов со склада для автоматизации учета.</p>
                        </div>
                    )}
                </div>
            )}

            <GodTierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Новая услуга и техкарта"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Название услуги</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Например: Замена масла двигателя"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Стоимость (₽)</label>
                            <input
                                type="number"
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Длительность (мин)</label>
                            <input
                                type="number"
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.duration}
                                onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                Технологическая карта
                            </h4>
                            <button
                                onClick={addTechCardRow}
                                className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Добавить материал
                            </button>
                        </div>
                        
                        <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 p-4 rounded-xl text-sm mb-4 flex gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>При переводе записи по этой услуге в статус "Завершено", указанные ниже материалы будут <b>автоматически списаны</b> со склада.</p>
                        </div>

                        <div className="space-y-3">
                            {techCards.map((tc, index) => (
                                <div key={index} className="flex gap-3 items-center bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                    <select
                                        className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white font-medium"
                                        value={tc.inventory_id}
                                        onChange={(e) => {
                                            const newTc = [...techCards];
                                            newTc[index].inventory_id = Number(e.target.value);
                                            setTechCards(newTc);
                                        }}
                                    >
                                        <option value={0} disabled>Выберите ТМЦ со склада...</option>
                                        {inventory.map(inv => (
                                            <option key={inv.id} value={inv.id}>{inv.name} (остаток: {inv.quantity} {inv.unit})</option>
                                        ))}
                                    </select>
                                    <div className="w-32 relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                                            placeholder="Кол-во"
                                            value={tc.quantity}
                                            onChange={(e) => {
                                                const newTc = [...techCards];
                                                newTc[index].quantity = Number(e.target.value);
                                                setTechCards(newTc);
                                            }}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setTechCards(techCards.filter((_, i) => i !== index))}
                                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {techCards.length === 0 && (
                                <div className="text-center py-6 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                    Услуга без списания материалов (услуга-работа)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSaveService}
                        className="px-5 py-2.5 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-sm"
                    >
                        Сохранить в каталог
                    </button>
                </div>
            </GodTierModal>
        </div>
    );
}
