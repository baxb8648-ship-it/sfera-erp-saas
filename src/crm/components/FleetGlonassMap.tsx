import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Radio,
  Zap,
  Settings,
  Search,
  Compass,
  HelpCircle,
  Plus,
  Rocket,
  BookOpen,
  Server
} from 'lucide-react';
import type { FleetVehicleItem } from '../pages/FleetDashboard';
import { apiClient } from '../../api/client';

interface FleetGlonassMapProps {
  vehicles: FleetVehicleItem[];
  onRefresh: () => void;
  onOpenCreateModal?: () => void;
}

// Координаты по умолчанию для спецтехники на объектах Москвы / области
const DEFAULT_COORDS = [
  { lat: 55.7558, lng: 37.6173, address: 'г. Москва, Кремлевская наб., объект #1' },
  { lat: 55.7412, lng: 37.6321, address: 'г. Москва, ул. Зацепский Вал, стройплощадка' },
  { lat: 55.7689, lng: 37.5912, address: 'г. Москва, Тверской бул., ремонт дороги' },
  { lat: 55.7820, lng: 37.6050, address: 'г. Москва, Сущёвский Вал, котлован ЖК' },
  { lat: 55.7324, lng: 37.6540, address: 'г. Москва, Таганская пл., объект #4' },
  { lat: 55.7915, lng: 37.5580, address: 'г. Москва, Ленинградский пр-т, база СФЕРУМ' }
];

export const FleetGlonassMap: React.FC<FleetGlonassMapProps> = ({
  vehicles,
  onRefresh,
  onOpenCreateModal
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    vehicles.length > 0 ? vehicles[0].id : null
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Модальное окно настройки трекера
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [trackerVehicle, setTrackerVehicle] = useState<FleetVehicleItem | null>(null);
  const [trackerIdInput, setTrackerIdInput] = useState('');
  const [trackerProtocolInput, setTrackerProtocolInput] = useState('wialon');
  const [isSavingTracker, setIsSavingTracker] = useState(false);

  // Модальное окно FAQ Инструкции по интеграции
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);

  // Загрузка тестового демо-автопарка
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [localDemoVehicles, setLocalDemoVehicles] = useState<FleetVehicleItem[]>([]);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

  const allVehicles = [...vehicles, ...localDemoVehicles];

  const enrichedVehicles = allVehicles.map((v, idx) => {
    const defaultPoint = DEFAULT_COORDS[idx % DEFAULT_COORDS.length];
    return {
      ...v,
      lat: v.gps_lat || defaultPoint.lat,
      lng: v.gps_lng || defaultPoint.lng,
      address: defaultPoint.address,
      fuelPercent: v.fuel_level_percent ?? 85,
      fuelLiters: v.fuel_liters ?? 180,
      engineHours: v.engine_hours ?? (1200 + idx * 45),
      speed: v.status === 'rented' ? (v.speed_kmh ?? 18) : 0,
      ignition: v.status === 'rented' ? (v.ignition_status ?? true) : false,
      protocol: v.tracker_protocol || 'Wialon IPS',
      imei: v.tracker_id || `3598210${80000000 + v.id}`
    };
  });

  const filteredVehicles = enrichedVehicles.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (v.plate_number && v.plate_number.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedVehicle = enrichedVehicles.find(v => v.id === selectedVehicleId) || enrichedVehicles[0];

  const openTrackerModal = (v: typeof enrichedVehicles[0]) => {
    setTrackerVehicle(v);
    setTrackerIdInput(v.imei);
    setTrackerProtocolInput(v.protocol.toLowerCase().includes('omnicomm') ? 'omnicomm' : 'wialon');
    setIsTrackerModalOpen(true);
  };

  const handleSaveTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackerVehicle) return;
    setIsSavingTracker(true);
    try {
      await apiClient.patch(`/fleet/vehicles/${trackerVehicle.id}/telemetry`, {
        tracker_id: trackerIdInput,
        tracker_protocol: trackerProtocolInput
      });
      setIsTrackerModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to update tracker settings', err);
    } finally {
      setIsSavingTracker(false);
    }
  };

  // Функция быстрой загрузки тестового автопарка (5 единиц с ГЛОНАСС координатами и ДУТ)
  const handleLoadDemoFleet = async () => {
    setIsSeedingDemo(true);
    const demoVehicles = [
      {
        name: 'Экскаватор Caterpillar 320 GC',
        model: 'CAT 320 GC',
        plate_number: 'E 741 AA 799',
        category: 'Экскаваторы',
        daily_rate: 26000,
        book_value: 12500000,
        year_built: 2023,
        status: 'rented',
        gps_lat: 55.7558,
        gps_lng: 37.6173,
        fuel_level_percent: 78,
        fuel_liters: 312,
        engine_hours: 1420,
        speed_kmh: 12,
        ignition_status: true,
        tracker_id: '359821080111111',
        tracker_protocol: 'wialon'
      },
      {
        name: 'Экскаватор-погрузчик JCB 3CX Super',
        model: 'JCB 3CX',
        plate_number: 'B 412 MK 799',
        category: 'Погрузчики',
        daily_rate: 19500,
        book_value: 8400000,
        year_built: 2022,
        status: 'available',
        gps_lat: 55.7412,
        gps_lng: 37.6321,
        fuel_level_percent: 94,
        fuel_liters: 150,
        engine_hours: 2110,
        speed_kmh: 0,
        ignition_status: false,
        tracker_id: '359821080222222',
        tracker_protocol: 'omnicomm'
      },
      {
        name: 'Самосвал КАМАЗ-6520 Люкс',
        model: 'КАМАЗ 6520',
        plate_number: 'O 888 OO 799',
        category: 'Самосвалы',
        daily_rate: 18000,
        book_value: 7200000,
        year_built: 2023,
        status: 'rented',
        gps_lat: 55.7689,
        gps_lng: 37.5912,
        fuel_level_percent: 62,
        fuel_liters: 215,
        engine_hours: 3200,
        speed_kmh: 42,
        ignition_status: true,
        tracker_id: '359821080333333',
        tracker_protocol: 'autograph'
      },
      {
        name: 'Автокран Liebherr LTM 1050',
        model: 'Liebherr LTM',
        plate_number: 'K 105 TT 799',
        category: 'Краны',
        daily_rate: 45000,
        book_value: 24000000,
        year_built: 2021,
        status: 'rented',
        gps_lat: 55.7820,
        gps_lng: 37.6050,
        fuel_level_percent: 88,
        fuel_liters: 350,
        engine_hours: 1890,
        speed_kmh: 5,
        ignition_status: true,
        tracker_id: '359821080444444',
        tracker_protocol: 'wialon'
      },
      {
        name: 'Гусеничный экскаватор Hitachi ZX200',
        model: 'Hitachi ZX200',
        plate_number: 'T 200 EE 799',
        category: 'Экскаваторы',
        daily_rate: 28000,
        book_value: 13800000,
        year_built: 2022,
        status: 'maintenance',
        gps_lat: 55.7324,
        gps_lng: 37.6540,
        fuel_level_percent: 45,
        fuel_liters: 180,
        engine_hours: 4120,
        speed_kmh: 0,
        ignition_status: false,
        tracker_id: '359821080555555',
        tracker_protocol: 'starline'
      }
    ];

    setLocalDemoVehicles(demoVehicles as any);
    try {
      for (const item of demoVehicles) {
        await apiClient.post('/fleet/vehicles', item).catch(() => null);
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to load demo fleet', err);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[720px] bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Левая панель списка техники и телеметрии */}
      <div className="w-full lg:w-96 border-r border-gray-200 dark:border-zinc-800 flex flex-col bg-gray-50/50 dark:bg-zinc-900/50">
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#F95700] animate-pulse" />
              Бортовая телеметрия (ГЛОНАСС)
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
              Онлайн: {enrichedVehicles.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по технике или номеру..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-[#1a1a1a] dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}
            >
              Все ({enrichedVehicles.length})
            </button>
            <button
              onClick={() => setFilterStatus('rented')}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                filterStatus === 'rented'
                  ? 'bg-[#F95700] text-white'
                  : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}
            >
              В аренде
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                filterStatus === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}
            >
              На базе
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/60">
          {filteredVehicles.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <Compass className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto" />
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                Список техники пуст. Добавьте первую единицу техники или загрузите демо-парк.
              </p>
              <button
                onClick={handleLoadDemoFleet}
                disabled={isSeedingDemo}
                className="w-full py-2.5 px-3 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Rocket className="w-4 h-4" />
                {isSeedingDemo ? 'Загрузка...' : 'Загрузить 5 демо-машин с ГЛОНАСС'}
              </button>
              {onOpenCreateModal && (
                <button
                  onClick={onOpenCreateModal}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить технику вручную
                </button>
              )}
            </div>
          ) : (
            filteredVehicles.map(vehicle => {
              const isSelected = selectedVehicle?.id === vehicle.id;
              return (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-orange-50/70 dark:bg-orange-950/20 border-l-4 border-[#F95700]'
                      : 'hover:bg-gray-100/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#1a1a1a] dark:text-zinc-100 truncate">
                        {vehicle.name}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          vehicle.status === 'rented'
                            ? 'bg-[#F95700]'
                            : vehicle.status === 'available'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                      {vehicle.plate_number || 'БЕЗ НОМЕРА'} · {vehicle.category}
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-600 dark:text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        {vehicle.fuelPercent}% ({vehicle.fuelLiters} л)
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        {vehicle.speed} км/ч
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openTrackerModal(vehicle);
                    }}
                    title="Настройка трекера ГЛОНАСС"
                    className="p-1.5 text-gray-400 hover:text-[#F95700] rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors shrink-0"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Нижний бар в левой панели */}
        <div className="p-3 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <button
            onClick={() => setIsFaqModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#F95700] hover:bg-orange-100 dark:hover:bg-orange-950/50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            ❓ FAQ: Инструкция подключения ГЛОНАСС
          </button>
        </div>
      </div>

      {/* Центральная панель — интерактивная карта 2ГИС/OSM */}
      <div className="flex-1 relative flex flex-col bg-[#0e131f] overflow-hidden">
        {/* Верхний бар карты с легендой и кнопками */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-[#1a1a1a] dark:text-zinc-100 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#F95700]" />
              Карта 2ГИС · СФЕРУМ Телематика
            </span>
            {selectedVehicle && (
              <span className="hidden sm:inline-block text-[11px] text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-zinc-700 pl-3">
                Координаты: {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setMapTheme(mapTheme === 'light' ? 'dark' : 'light')}
              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              {mapTheme === 'light' ? '🌙 Тёмная карта' : '☀️ Светлая 2ГИС'}
            </button>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> На базе
            </span>
            <span className="flex items-center gap-1.5 text-[#F95700] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F95700] inline-block" /> На объекте
            </span>
            <button
              onClick={() => setIsFaqModalOpen(true)}
              className="inline-flex items-center gap-1 text-[#F95700] hover:underline font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Инструкция
            </button>
          </div>
        </div>

        {/* Стилизованная интерактивная карта 2ГИС */}
        <div
          className={`flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-300 ${
            mapTheme === 'light'
              ? 'bg-[#e8edf2] text-gray-700'
              : 'bg-[#0b1019] text-zinc-400'
          }`}
        >
          {/* Топографический слой 2ГИС (Река, автомагистрали, округа Москвы) */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Сетка координат */}
              <defs>
                <pattern id="grid-2gis" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path
                    d="M 60 0 L 0 0 0 60"
                    fill="none"
                    stroke={mapTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-2gis)" />

              {/* Парковая зона */}
              <polygon
                points="15%,15% 35%,12% 38%,35% 18%,38%"
                fill={mapTheme === 'light' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.05)'}
              />

              {/* Река Москва */}
              <path
                d="M 0 350 Q 250 320 450 420 T 900 380"
                fill="none"
                stroke={mapTheme === 'light' ? '#60a5fa' : '#1e3a8a'}
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.65"
              />

              {/* Магистрали и кольца */}
              <line x1="0" y1="45%" x2="100%" y2="40%" stroke={mapTheme === 'light' ? '#cbd5e1' : '#334155'} strokeWidth="8" />
              <line x1="45%" y1="0" x2="52%" y2="100%" stroke={mapTheme === 'light' ? '#cbd5e1' : '#334155'} strokeWidth="8" />
              <circle cx="48%" cy="45%" r="160" stroke={mapTheme === 'light' ? '#f59e0b' : '#b45309'} strokeWidth="3" strokeDasharray="8 6" fill="none" opacity="0.6" />
              <circle cx="48%" cy="45%" r="290" stroke={mapTheme === 'light' ? '#94a3b8' : '#475569'} strokeWidth="4" fill="none" opacity="0.5" />
            </svg>
          </div>

          {/* Метки районов на карте */}
          <div className="absolute inset-0 pointer-events-none select-none text-[11px] font-bold uppercase tracking-wider">
            <span className={`absolute top-[18%] left-[24%] ${mapTheme === 'light' ? 'text-gray-400' : 'text-zinc-600'}`}>
              САО · Химки
            </span>
            <span className={`absolute top-[42%] left-[45%] ${mapTheme === 'light' ? 'text-gray-500' : 'text-zinc-500'}`}>
              ЦАО · Москва
            </span>
            <span className={`absolute bottom-[20%] right-[22%] ${mapTheme === 'light' ? 'text-gray-400' : 'text-zinc-600'}`}>
              ЮВАО · Люблино
            </span>
          </div>

          {/* Если нет техники — информативное онбординг-состояние прямо на карте */}
          {filteredVehicles.length === 0 ? (
            <div className="z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-8 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-w-md text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#F95700] flex items-center justify-center mx-auto">
                <Rocket className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#1a1a1a] dark:text-white">
                  Карта готова к мониторингу
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  В реестре пока нет техники. Вы можете в 1 клик загрузить 5 тестовых спецмашин с настроенными датчиками топлива ДУТ и координатами в Москве.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleLoadDemoFleet}
                  disabled={isSeedingDemo}
                  className="w-full py-3 px-4 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Rocket className="w-4 h-4" />
                  {isSeedingDemo ? 'Загрузка техники на карту...' : '🚀 Загрузить демо-автопарк (5 машин)'}
                </button>
                <button
                  onClick={() => setIsFaqModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-[#F95700]" />
                  Как работает интеграция ГЛОНАСС и 2ГИС?
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Маркеры спецтехники */}
              <div className="absolute inset-0">
                {filteredVehicles.map((v) => {
                  const isSelected = selectedVehicle?.id === v.id;
                  const leftPercent = 15 + ((v.lng - 37.5) * 450) % 70;
                  const topPercent = 20 + ((v.lat - 55.7) * 450) % 65;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      style={{
                        left: `${Math.min(85, Math.max(12, leftPercent))}%`,
                        top: `${Math.min(80, Math.max(15, topPercent))}%`
                      }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                    >
                      {isSelected && (
                        <span className="absolute -inset-3 rounded-full bg-[#F95700]/30 animate-ping" />
                      )}

                      <div
                        className={`px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-[#F95700] text-white scale-110 ring-4 ring-orange-500/30'
                            : v.status === 'rented'
                            ? 'bg-zinc-900/90 text-white border border-orange-500/60 hover:scale-105'
                            : 'bg-zinc-900/90 text-white border border-emerald-500/60 hover:scale-105'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-bold whitespace-nowrap">
                          {v.plate_number || v.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Карточка бортовой информации о выбранном ТС (Floating Telemetry Card) */}
              {selectedVehicle && (
                <div className="absolute bottom-6 right-6 left-6 sm:left-auto sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 shadow-2xl z-20 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#F95700]">
                        Бортовой терминал · {selectedVehicle.protocol}
                      </span>
                      <h4 className="font-bold text-base text-[#1a1a1a] dark:text-zinc-100 mt-0.5">
                        {selectedVehicle.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        {selectedVehicle.plate_number || 'БЕЗ НОМЕРА'} · {selectedVehicle.address}
                      </p>
                    </div>

                    <button
                      onClick={() => openTrackerModal(selectedVehicle)}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      ДУТ / IMEI
                    </button>
                  </div>

                  {/* Датчики */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Топливо (ДУТ)</div>
                      <div className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-100 mt-1">
                        {selectedVehicle.fuelPercent}%
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                        {selectedVehicle.fuelLiters} л
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Скорость</div>
                      <div className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-100 mt-1">
                        {selectedVehicle.speed} км/ч
                      </div>
                      <div className="text-[11px] text-emerald-500 font-medium">
                        {selectedVehicle.ignition ? 'Зажигание ВКЛ' : 'Стоянка'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Моточасы</div>
                      <div className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-100 mt-1">
                        {selectedVehicle.engineHours} м/ч
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400">Наработка</div>
                    </div>
                  </div>

                  {/* Прогресс бака */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-gray-500 dark:text-zinc-400">Уровень топлива в баке</span>
                      <span className="text-[#1a1a1a] dark:text-zinc-200 font-bold">
                        {selectedVehicle.fuelPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#F95700] rounded-full transition-all"
                        style={{ width: `${selectedVehicle.fuelPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модальное окно настройки бортового трекера */}
      {isTrackerModalOpen && trackerVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1a1a1a] dark:text-zinc-100">
                  Настройка ГЛОНАСС-трекера
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">{trackerVehicle.name}</p>
              </div>
              <button
                onClick={() => setIsTrackerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTracker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5">
                  Протокол терминала
                </label>
                <select
                  value={trackerProtocolInput}
                  onChange={e => setTrackerProtocolInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium"
                >
                  <option value="wialon">Wialon IPS (Стандарт)</option>
                  <option value="omnicomm">Omnicomm LLS (с ДУТ)</option>
                  <option value="autograph">АвтоГРАФ GSM</option>
                  <option value="starline">StarLine M17</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5">
                  IMEI / ID бортового устройства
                </label>
                <input
                  type="text"
                  required
                  value={trackerIdInput}
                  onChange={e => setTrackerIdInput(e.target.value)}
                  placeholder="Например, 359821080112345"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTrackerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingTracker}
                  className="px-5 py-2 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-sm font-bold shadow-md"
                >
                  {isSavingTracker ? 'Сохранение...' : 'Сохранить и подключить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно FAQ: Инструкция по интеграции ГЛОНАСС и 2ГИС */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 w-full max-w-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#F95700] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#1a1a1a] dark:text-white">
                    FAQ: Инструкция интеграции ГЛОНАСС и 2ГИС
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Как подключить автопарк к онлайн-телеметрии СФЕРУМ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-2">
                <h4 className="font-bold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#F95700] text-white text-xs flex items-center justify-center font-bold">1</span>
                  Откуда берутся машины на карте?
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Техника берется из <strong>Реестра техники</strong> (вкладка «🚜 Реестр техники»). Вы можете добавить технику вручную через кнопку <strong>«Добавить технику»</strong> или нажать кнопку <strong>«🚀 Загрузить демо-автопарк»</strong>, чтобы мгновенно создать 5 готовых спецмашин с координатами и показаниями ДУТ.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-2">
                <h4 className="font-bold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#F95700] text-white text-xs flex items-center justify-center font-bold">2</span>
                  Как подключить бортовой терминал (Wialon / Omnicomm / АвтоГРАФ)?
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Выберите машину в списке слева или на карте и нажмите кнопку <strong>«⚙️ ДУТ / IMEI»</strong>. В открывшемся окне укажите протокол вашего трекера и его 15-значный <strong>IMEI</strong>. После сохранения система привяжет терминал к карточке машины.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-2">
                <h4 className="font-bold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#F95700] text-white text-xs flex items-center justify-center font-bold">3</span>
                  Как настроить ретрансляцию данных на сервер СФЕРУМ?
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  В личном кабинете вашей телематической платформы (Wialon, Omnicomm или StarLine) укажите адрес ретранслятора (Webhook):
                </p>
                <div className="p-2.5 rounded-xl bg-zinc-900 text-orange-400 font-mono text-xs flex items-center justify-between">
                  <span>POST /api/fleet/telemetry/webhook</span>
                  <Server className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-zinc-400">
                  Пакеты с координатами, скоростью и процентом топлива будут поступать в реальном времени и обновлять индикаторы на карте.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 space-y-2">
                <h4 className="font-bold text-[#1a1a1a] dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#F95700] text-white text-xs flex items-center justify-center font-bold">4</span>
                  Контроль топлива (ДУТ) и защита от сливов
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Система непрерывно фиксирует уровень в баке по датчикам ДУТ в литрах и процентах. В случае резкого падения уровня топлива формируется алерт в журнале событий.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white font-bold text-xs shadow-md"
              >
                Понятно, закрыть инструкцию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
