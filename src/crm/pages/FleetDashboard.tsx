import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Tractor,
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw,
  FileText,
  Printer
} from 'lucide-react';
import { FleetChessboard } from '../components/FleetChessboard';
import { FleetGlonassMap } from '../components/FleetGlonassMap';
import { apiClient } from '../../api/client';

export interface FleetVehicleItem {
  id: number;
  name: string;
  model?: string;
  plate_number?: string;
  category: string;
  daily_rate?: number;
  book_value?: number;
  year_built?: number;
  osago_until?: string;
  status: string; // available | rented | maintenance | reserved
  notes?: string;
  gps_lat?: number;
  gps_lng?: number;
  fuel_level_percent?: number;
  fuel_liters?: number;
  engine_hours?: number;
  speed_kmh?: number;
  ignition_status?: boolean;
  tracker_id?: string;
  tracker_protocol?: string;
}

export const FleetDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'chessboard' | 'map'>('registry');

  // Реестр техники
  const [vehicles, setVehicles] = useState<FleetVehicleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedStatus, setSelectedStatus] = useState<string>('Все');

  // Модальное окно добавления/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    plate_number: '',
    category: 'Экскаваторы',
    daily_rate: 20000,
    book_value: 5000000,
    year_built: new Date().getFullYear(),
    osago_until: '',
    status: 'available',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Паспорт техники
  const [passportVehicle, setPassportVehicle] = useState<FleetVehicleItem | null>(null);
  const [passportTab, setPassportTab] = useState<'info' | 'history' | 'finance'>('info');
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openPassportModal = async (v: FleetVehicleItem) => {
    setPassportVehicle(v);
    setPassportTab('info');
    setHistoryLoading(true);
    try {
      const data = await apiClient.get<any[]>(`/fleet/vehicles/${v.id}/history`);
      setVehicleHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load vehicle history:', e);
      setVehicleHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePrintContract = (vehicle: FleetVehicleItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const today = new Date().toLocaleDateString('ru-RU');
    printWindow.document.write(`
      <html>
        <head>
          <title>Договор аренды спецтехники - ${vehicle.name}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #000; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
            .sub { text-align: center; font-size: 14px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
            .sign { display: flex; justify-content: space-between; margin-top: 50px; }
          </style>
        </head>
        <body onload="window.print();">
          <h1>ДОГОВОР АРЕНДЫ СПЕЦТЕХНИКИ № СФ-${vehicle.id}-${Date.now().toString().slice(-4)}</h1>
          <div class="sub">г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «${today}»</div>
          <p><strong>ООО «СФЕРУМ ЕРП ТЕХНОЛОГИИ»</strong> (Арендодатель) и <strong>Заказчик</strong> (Арендатор) заключили настоящий договор о нижеследующем:</p>
          <p><strong>1. ПРЕДМЕТ ДОГОВОРА</strong><br/>
          Арендодатель предоставляет Арендатору во временное владение и пользование спецтехнику:</p>
          <table>
            <tr><th>Наименование</th><th>Модель</th><th>Гос. номер</th><th>Категория</th><th>Тариф (руб/смена)</th></tr>
            <tr>
              <td>${vehicle.name}</td>
              <td>${vehicle.model || '—'}</td>
              <td>${vehicle.plate_number || '—'}</td>
              <td>${vehicle.category}</td>
              <td>${(vehicle.daily_rate || 0).toLocaleString()} ₽</td>
            </tr>
          </table>
          <p><strong>2. СТОИМОСТЬ АРЕНДЫ И СТРАХОВАНИЕ</strong><br/>
          2.1. Стоимость аренды: <strong>${(vehicle.daily_rate || 0).toLocaleString()} руб.</strong> за машино-смену.<br/>
          2.2. Техника застрахована по ОСАГО (срок: ${vehicle.osago_until || 'по договору'}).</p>
          <div class="sign">
            <div><strong>Арендодатель:</strong><br/><br/>__________________ / ООО «СФЕРУМ ЕРП» /</div>
            <div><strong>Арендатор:</strong><br/><br/>__________________ / Заказчик /</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCompleteBooking = async (bookingId: number) => {
    try {
      await apiClient.post(`/fleet/bookings/${bookingId}/complete`);
      if (passportVehicle) {
        await openPassportModal(passportVehicle);
      }
      await fetchVehicles();
    } catch (e) {
      console.error('Failed to complete booking:', e);
    }
  };


  const categories = [
    'Все',
    'Экскаваторы',
    'Краны',
    'Самосвалы',
    'Погрузчики',
    'Катки',
    'Бульдозеры'
  ];

  const statusOptions = [
    { value: 'Все', label: 'Все статусы' },
    { value: 'available', label: '🟢 Свободна (На базе)' },
    { value: 'rented', label: '🔵 В аренде (На объекте)' },
    { value: 'maintenance', label: '🟠 На ТО / В ремонте' }
  ];

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<FleetVehicleItem[]>('/fleet/vehicles');
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch fleet vehicles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentId(null);
    setFormData({
      name: '',
      model: '',
      plate_number: '',
      category: 'Экскаваторы',
      daily_rate: 20000,
      book_value: 5000000,
      year_built: new Date().getFullYear(),
      osago_until: '',
      status: 'available',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: FleetVehicleItem) => {
    setModalMode('edit');
    setCurrentId(item.id);
    setFormData({
      name: item.name || '',
      model: item.model || '',
      plate_number: item.plate_number || '',
      category: item.category || 'Экскаваторы',
      daily_rate: item.daily_rate ?? 20000,
      book_value: item.book_value ?? 0,
      year_built: item.year_built ?? new Date().getFullYear(),
      osago_until: item.osago_until || '',
      status: item.status || 'available',
      notes: item.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Укажите название единицы техники');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name.trim(),
        model: formData.model.trim() || null,
        plate_number: formData.plate_number.trim() || null,
        category: formData.category,
        daily_rate: Number(formData.daily_rate) || 0,
        book_value: Number(formData.book_value) || 0,
        year_built: Number(formData.year_built) || null,
        osago_until: formData.osago_until || null,
        status: formData.status,
        notes: formData.notes.trim() || null
      };

      if (modalMode === 'create') {
        await apiClient.post('/fleet/vehicles', payload);
      } else if (currentId) {
        await apiClient.patch(`/fleet/vehicles/${currentId}`, payload);
      }
      setIsModalOpen(false);
      await fetchVehicles();
    } catch (err: any) {
      setFormError(err?.message || 'Ошибка сохранения данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Удалить технику "${name}"?`)) return;
    try {
      await apiClient.delete(`/fleet/vehicles/${id}`);
      await fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  // Фильтрация списка
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.plate_number && item.plate_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.model && item.model.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'Все' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'Все' || item.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedCategory, selectedStatus]);

  // Сводная аналитика
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === 'available').length;
    const rented = vehicles.filter((v) => v.status === 'rented').length;
    const maintenance = vehicles.filter((v) => v.status === 'maintenance').length;
    const totalValue = vehicles.reduce((sum, v) => sum + (Number(v.book_value) || 0), 0);
    return { total, available, rented, maintenance, totalValue };
  }, [vehicles]);

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'available':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            🟢 Свободна
          </span>
        );
      case 'rented':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
            🔵 В аренде
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            🟠 На ТО / Ремонт
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Helmet>
        <title>Автопарк и Спецтехника | СФЕРУМ</title>
      </Helmet>

      {/* Hero Баннер */}
      <div className="bg-gradient-to-r from-orange-600 via-[#F95700] to-amber-600 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-2">
              МОДУЛЬ 4.4: АВТОПАРК И ТЕЛЕМЕТРИЯ
            </span>
            <h1 className="text-2xl md:text-3xl font-black font-['Montserrat'] uppercase tracking-tight">
              Спецтехника и Шахматка Аренды
            </h1>
            <p className="text-orange-100 mt-1 font-medium text-sm md:text-base max-w-2xl">
              Полноценный реестр единиц техники, учет госномеров, тарифов аренды и интерактивная диаграмма Ганта.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="px-5 py-3 rounded-xl bg-white text-[#F95700] font-black text-sm hover:bg-orange-50 active:scale-95 transition-all shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Добавить технику
            </button>
          </div>
        </div>
      </div>

      {/* Вкладки навигации */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-5 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'registry'
              ? 'bg-[#F95700] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Tractor className="w-4 h-4" />
          Реестр техники
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'registry' ? 'bg-white/20' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'}`}>
            {vehicles.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('chessboard')}
          className={`px-5 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chessboard'
              ? 'bg-[#F95700] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Шахматка бронирований (Гант)
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`px-5 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'map'
              ? 'bg-[#F95700] text-white shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          🛰️ ГЛОНАСС и Карта 2ГИС
        </button>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === 'chessboard' ? (
        <FleetChessboard />
      ) : activeTab === 'map' ? (
        <FleetGlonassMap vehicles={vehicles} onRefresh={fetchVehicles} onOpenCreateModal={openCreateModal} />
      ) : (
        <div className="space-y-6">
          {/* KPI Карточки реестра */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Всего техники
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black text-[#1a1a1a] dark:text-white font-['Montserrat']">
                  {stats.total} шт.
                </span>
                <Tractor className="w-6 h-6 text-[#F95700]" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Свободна (На базе)
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black text-emerald-600 font-['Montserrat']">
                  {stats.available} шт.
                </span>
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                В аренде / На объекте
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black text-blue-600 font-['Montserrat']">
                  {stats.rented} шт.
                </span>
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Стоимость парка
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-black text-amber-600 font-['Montserrat']">
                  {(stats.totalValue / 1000000).toFixed(1)} млн ₽
                </span>
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Панель фильтров и поиска */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, модели или госномеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white w-full"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-300"
              >
                {statusOptions.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchVehicles}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors"
                title="Обновить список"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Категории техники (чипсы) */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Таблица техники */}
          {isLoading && vehicles.length === 0 ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F95700]" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-16 text-center border border-gray-100 dark:border-zinc-800">
              <Tractor className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
              <p className="text-gray-500 dark:text-zinc-400 font-semibold">
                Техника не найдена. Нажмите «+ Добавить технику», чтобы создать первую запись.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                  <thead className="bg-gray-50 dark:bg-zinc-800/60 text-left text-xs font-extrabold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Название и Модель</th>
                      <th className="px-6 py-4">Категория</th>
                      <th className="px-6 py-4">Госномер</th>
                      <th className="px-6 py-4">Статус</th>
                      <th className="px-6 py-4">Тариф / смена</th>
                      <th className="px-6 py-4">Баланс. стоимость</th>
                      <th className="px-6 py-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
                    {filteredVehicles.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">#{v.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-900 dark:text-white">
                            {v.name}
                          </div>
                          {v.model && (
                            <div className="text-xs text-gray-500 dark:text-zinc-400">
                              Модель: {v.model} {v.year_built ? `(${v.year_built} г.)` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-bold">
                            {v.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-800 dark:text-zinc-200">
                          {v.plate_number || '—'}
                        </td>
                        <td className="px-6 py-4">{renderStatusBadge(v.status)}</td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          {(v.daily_rate || 0).toLocaleString()} ₽
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-zinc-400 font-medium">
                          {(v.book_value || 0).toLocaleString()} ₽
                        </td>
                        <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => openPassportModal(v)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-orange-50 hover:text-[#F95700] dark:hover:bg-orange-500/10 transition-colors"
                            title="Паспорт, история и документы"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Паспорт
                          </button>
                          <button
                            onClick={() => openEditModal(v)}
                            className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id, v.name)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно создания / редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-black font-['Montserrat'] text-gray-900 dark:text-white">
                {modalMode === 'create' ? '➕ Добавить единицу техники' : '✏️ Редактирование техники'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                  Название единицы техники *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Экскаватор-погрузчик JCB 3CX"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F95700]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Категория
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-semibold"
                  >
                    {categories.filter((c) => c !== 'Все').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Госномер / Бортовой номер
                  </label>
                  <input
                    type="text"
                    placeholder="А123АА 77"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Модель
                  </label>
                  <input
                    type="text"
                    placeholder="JCB 3CX Super"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Год выпуска
                  </label>
                  <input
                    type="number"
                    value={formData.year_built}
                    onChange={(e) => setFormData({ ...formData, year_built: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Суточная ставка (₽ / смена)
                  </label>
                  <input
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Балансовая стоимость (₽)
                  </label>
                  <input
                    type="number"
                    value={formData.book_value}
                    onChange={(e) => setFormData({ ...formData, book_value: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    Текущий статус
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-semibold"
                  >
                    <option value="available">🟢 Свободна (На базе)</option>
                    <option value="rented">🔵 В аренде (На объекте)</option>
                    <option value="maintenance">🟠 На ТО / В ремонте</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                    ОСАГО до
                  </label>
                  <input
                    type="date"
                    value={formData.osago_until}
                    onChange={(e) => setFormData({ ...formData, osago_until: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase mb-1">
                  Примечания / Особенности техники
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительная информация (навесное оборудование, контакты водителя и т.д.)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F95700]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-sm font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : modalMode === 'create' ? 'Сохранить технику' : 'Обновить данные'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно «Паспорт и История техники» */}
      {passportVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F95700]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-['Montserrat'] text-gray-900 dark:text-white">
                    Паспорт техники: {passportVehicle.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                    Госномер: {passportVehicle.plate_number || 'Не указан'} · ID #{passportVehicle.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintContract(passportVehicle)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#F95700]" />
                  Договор аренды
                </button>
                <button
                  onClick={() => setPassportVehicle(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Вкладки Паспорта */}
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 mt-4 pb-2">
              <button
                onClick={() => setPassportTab('info')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  passportTab === 'info'
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                📑 Характеристики
              </button>
              <button
                onClick={() => setPassportTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  passportTab === 'history'
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                📅 История аренды ({vehicleHistory.length})
              </button>
              <button
                onClick={() => setPassportTab('finance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  passportTab === 'finance'
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-black shadow-sm'
                    : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                💰 Финансовая отдача
              </button>
            </div>

            <div className="mt-4">
              {passportTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase">Основные данные</div>
                    <div><span className="font-semibold text-gray-500">Название:</span> {passportVehicle.name}</div>
                    <div><span className="font-semibold text-gray-500">Модель:</span> {passportVehicle.model || '—'}</div>
                    <div><span className="font-semibold text-gray-500">Категория:</span> {passportVehicle.category}</div>
                    <div><span className="font-semibold text-gray-500">Год выпуска:</span> {passportVehicle.year_built || '—'}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase">Юридические и Финансовые параметры</div>
                    <div><span className="font-semibold text-gray-500">Гос. номер:</span> <span className="font-mono font-bold">{passportVehicle.plate_number || '—'}</span></div>
                    <div><span className="font-semibold text-gray-500">Срок ОСАГО:</span> {passportVehicle.osago_until || 'Не указан'}</div>
                    <div><span className="font-semibold text-gray-500">Суточный тариф:</span> {(passportVehicle.daily_rate || 0).toLocaleString()} ₽ / смена</div>
                    <div><span className="font-semibold text-gray-500">Баланс. стоимость:</span> {(passportVehicle.book_value || 0).toLocaleString()} ₽</div>
                  </div>

                  {passportVehicle.notes && (
                    <div className="col-span-1 md:col-span-2 p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                      <div className="text-xs font-bold text-[#F95700] uppercase mb-1">Примечания и оборудование</div>
                      <p className="text-gray-700 dark:text-zinc-300">{passportVehicle.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {passportTab === 'history' && (
                <div className="space-y-3">
                  {historyLoading ? (
                    <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F95700]" /></div>
                  ) : vehicleHistory.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">История аренды этой техники пока пуста</div>
                  ) : (
                    vehicleHistory.map((h: any) => (
                      <div key={h.id} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            Бронирование #{h.id} — {h.status === 'completed' ? '✅ Завершено' : '⏳ В процессе'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                            Период: {h.start_date?.split('T')[0]} — {h.end_date?.split('T')[0]} · Договор № {h.contract_number || 'Без номера'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#F95700]">{(h.total_cost || 0).toLocaleString()} ₽</span>
                          {h.status !== 'completed' && (
                            <button
                              onClick={() => handleCompleteBooking(h.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                            >
                              Завершить аренду
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {passportTab === 'finance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                    <div className="text-xs font-bold text-emerald-600 uppercase">Суммарная выручка от аренды</div>
                    <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-['Montserrat']">
                      {vehicleHistory.reduce((acc, h) => acc + (Number(h.total_cost) || 0), 0).toLocaleString()} ₽
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                    <div className="text-xs font-bold text-gray-500 uppercase">Окупаемость к балансовой стоимости</div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white mt-1 font-['Montserrat']">
                      {passportVehicle.book_value
                        ? `${Math.round((vehicleHistory.reduce((acc, h) => acc + (Number(h.total_cost) || 0), 0) / passportVehicle.book_value) * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetDashboard;
