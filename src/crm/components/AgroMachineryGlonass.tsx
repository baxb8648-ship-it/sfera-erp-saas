import React, { useState } from 'react';
import {
  Tractor,
  Navigation,
  Radio,
  Zap,
  Settings,
  Search,
  Compass,
  HelpCircle,
  Plus,
  Rocket,
  Wheat
} from 'lucide-react';

export interface AgroMachineItem {
  id: number;
  name: string;
  model: string;
  plate_number: string;
  category: 'Комбайны' | 'Тракторы' | 'Опрыскиватели' | 'Посевные комплексы';
  operator_name: string;
  assigned_field: string;
  fuel_norm_l_ha: number;
  hectares_today: number;
  status: 'field_work' | 'base' | 'maintenance';
  gps_lat: number;
  gps_lng: number;
  fuel_percent: number;
  fuel_liters: number;
  engine_hours: number;
  speed_kmh: number;
  imei: string;
}

interface AgroMachineryGlonassProps {
  initialMachines?: AgroMachineItem[];
}

export const AgroMachineryGlonass: React.FC<AgroMachineryGlonassProps> = ({ initialMachines = [] }) => {
  const [machines, setMachines] = useState<AgroMachineItem[]>(initialMachines);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
    initialMachines.length > 0 ? initialMachines[0].id : null
  );
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'registry'>('map');
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

  // Модальные окна
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [trackerMachine, setTrackerMachine] = useState<AgroMachineItem | null>(null);

  // Форма добавления сельхозтехники
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    plate_number: '',
    category: 'Тракторы' as AgroMachineItem['category'],
    operator_name: '',
    assigned_field: 'Поле #1 «Северное» (142 га)',
    fuel_norm_l_ha: 8.5,
    status: 'field_work' as AgroMachineItem['status'],
    imei: ''
  });

  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Date.now();
    const newMachine: AgroMachineItem = {
      id: newId,
      name: formData.name,
      model: formData.model,
      plate_number: formData.plate_number || 'БЕЗ НОМЕРА',
      category: formData.category,
      operator_name: formData.operator_name || 'Иванов А.С.',
      assigned_field: formData.assigned_field,
      fuel_norm_l_ha: formData.fuel_norm_l_ha,
      hectares_today: 0,
      status: formData.status,
      gps_lat: 55.75 + (Math.random() - 0.5) * 0.05,
      gps_lng: 37.62 + (Math.random() - 0.5) * 0.05,
      fuel_percent: 100,
      fuel_liters: 350,
      engine_hours: 110,
      speed_kmh: formData.status === 'field_work' ? 12 : 0,
      imei: formData.imei || `8642100${Math.floor(Math.random() * 8999999 + 1000000)}`
    };
    setMachines(prev => [newMachine, ...prev]);
    setSelectedMachineId(newId);
    setIsCreateModalOpen(false);
  };

  const handleLoadDemoAgroFleet = () => {
    const demoAgroMachines: AgroMachineItem[] = [
      {
        id: 101,
        name: 'Зерноуборочный комбайн TORUM 785',
        model: 'Ростсельмаш TORUM 785',
        plate_number: '7418 УХ 56',
        category: 'Комбайны',
        operator_name: 'Механизатор: Соколов В.П.',
        assigned_field: 'Поле #1 «Северное» (Пшеница, 142 га)',
        fuel_norm_l_ha: 14.2,
        hectares_today: 28.5,
        status: 'field_work',
        gps_lat: 55.7580,
        gps_lng: 37.6180,
        fuel_percent: 82,
        fuel_liters: 420,
        engine_hours: 890,
        speed_kmh: 9,
        imei: '864210080112233'
      },
      {
        id: 102,
        name: 'Трактор Кировец К-744Р4',
        model: 'Кировец К-744Р4',
        plate_number: '8102 АА 56',
        category: 'Тракторы',
        operator_name: 'Механизатор: Петров Н.И.',
        assigned_field: 'Поле #3 «Заречное» (Кукуруза, 210 га)',
        fuel_norm_l_ha: 18.0,
        hectares_today: 42.0,
        status: 'field_work',
        gps_lat: 55.7420,
        gps_lng: 37.6350,
        fuel_percent: 68,
        fuel_liters: 540,
        engine_hours: 2150,
        speed_kmh: 14,
        imei: '864210080223344'
      },
      {
        id: 103,
        name: 'Трактор МТЗ-82.1 Беларус',
        model: 'МТЗ 82.1',
        plate_number: '1420 ЕЕ 56',
        category: 'Тракторы',
        operator_name: 'Механизатор: Григорьев Д.А.',
        assigned_field: 'Машинно-тракторный двор (МТД)',
        fuel_norm_l_ha: 6.8,
        hectares_today: 0,
        status: 'base',
        gps_lat: 55.7710,
        gps_lng: 37.5920,
        fuel_percent: 95,
        fuel_liters: 120,
        engine_hours: 3410,
        speed_kmh: 0,
        imei: '864210080334455'
      },
      {
        id: 104,
        name: 'Самоходный опрыскиватель Туман-3',
        model: 'Пегас-Агро Туман-3',
        plate_number: '5501 СС 56',
        category: 'Опрыскиватели',
        operator_name: 'Механизатор: Ильин С.М.',
        assigned_field: 'Поле #2 «Южное» (Подсолнечник, 95 га)',
        fuel_norm_l_ha: 3.5,
        hectares_today: 64.0,
        status: 'field_work',
        gps_lat: 55.7310,
        gps_lng: 37.6510,
        fuel_percent: 74,
        fuel_liters: 150,
        engine_hours: 1120,
        speed_kmh: 22,
        imei: '864210080445566'
      },
      {
        id: 105,
        name: 'Трактор John Deere 8370R',
        model: 'John Deere 8370R',
        plate_number: '9900 ТТ 56',
        category: 'Тракторы',
        operator_name: 'Механизатор: Кравцов И.В.',
        assigned_field: 'Сервисный ангар МТД',
        fuel_norm_l_ha: 15.5,
        hectares_today: 0,
        status: 'maintenance',
        gps_lat: 55.7890,
        gps_lng: 37.5600,
        fuel_percent: 50,
        fuel_liters: 310,
        engine_hours: 4200,
        speed_kmh: 0,
        imei: '864210080556677'
      }
    ];
    setMachines(demoAgroMachines);
    setSelectedMachineId(101);
  };

  const filteredMachines = machines.filter(m => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        m.plate_number.toLowerCase().includes(q) ||
        m.operator_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  return (
    <div className="space-y-6">
      {/* Шапка управления агротехникой */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              🌾 АГРО · Сельхозтехника
            </span>
            <span className="text-xs text-gray-400">Изолированный реестр Агро-домена</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#1a1a1a] dark:text-white mt-1">
            🚜 Сельхозтехника и ГЛОНАСС мониторинг полей
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Контроль комбайнов, тракторов, расхода топлива на гектар (л/га) и выполнения агро-операций
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-gray-100 dark:bg-zinc-800 p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-zinc-900 text-[#F95700] shadow-sm'
                  : 'text-gray-600 dark:text-zinc-400'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Карта 2ГИС
            </button>
            <button
              onClick={() => setViewMode('registry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'registry'
                  ? 'bg-white dark:bg-zinc-900 text-[#F95700] shadow-sm'
                  : 'text-gray-600 dark:text-zinc-400'
              }`}
            >
              <Tractor className="w-3.5 h-3.5" />
              Реестр агротехники ({machines.length})
            </button>
          </div>

          <button
            onClick={() => setIsFaqModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#F95700]" />
            FAQ
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Добавить агротехнику
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        /* Интерактивный вид карты АГРО */
        <div className="flex flex-col lg:flex-row gap-6 h-[700px] bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {/* Левая панель агротехники */}
          <div className="w-full lg:w-96 border-r border-gray-200 dark:border-zinc-800 flex flex-col bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#F95700] animate-pulse" />
                  Агро-ГЛОНАСС онлайн
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
                  В поле: {machines.filter(m => m.status === 'field_work').length} из {machines.length}
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск комбайна, трактора, механизатора..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700]"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                    filterCategory === 'all'
                      ? 'bg-[#1a1a1a] dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilterCategory('Комбайны')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                    filterCategory === 'Комбайны'
                      ? 'bg-[#F95700] text-white'
                      : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Комбайны
                </button>
                <button
                  onClick={() => setFilterCategory('Тракторы')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                    filterCategory === 'Тракторы'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Тракторы
                </button>
                <button
                  onClick={() => setFilterCategory('Опрыскиватели')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all shrink-0 ${
                    filterCategory === 'Опрыскиватели'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Опрыскиватели
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/60">
              {filteredMachines.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <Tractor className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                    Парк сельхозтехники пуст. Вы можете в 1 клик загрузить тестовый агро-парк (Ростсельмаш, МТЗ, Кировец).
                  </p>
                  <button
                    onClick={handleLoadDemoAgroFleet}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                    Загрузить 5 демо-сельхозтехники
                  </button>
                </div>
              ) : (
                filteredMachines.map(m => {
                  const isSelected = selectedMachine?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-orange-50/70 dark:bg-orange-950/20 border-l-4 border-[#F95700]'
                          : 'hover:bg-gray-100/60 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1a1a1a] dark:text-zinc-100 truncate">
                            {m.name}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              m.status === 'field_work'
                                ? 'bg-[#F95700]'
                                : m.status === 'base'
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>

                        <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                          {m.plate_number} · {m.category}
                        </div>

                        <div className="text-[11px] text-gray-600 dark:text-zinc-300 truncate">
                          🌾 {m.assigned_field}
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-600 dark:text-zinc-300">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {m.fuel_percent}% ({m.fuel_liters} л)
                          </span>
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-blue-500" />
                            {m.speed_kmh} км/ч
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setTrackerMachine(m);
                          setIsTrackerModalOpen(true);
                        }}
                        title="Настройка терминала ГЛОНАСС"
                        className="p-1.5 text-gray-400 hover:text-[#F95700] rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Центральная карта полей 2ГИС */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Верхний бар карты Агро */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#1a1a1a] dark:text-zinc-100 flex items-center gap-1.5">
                  <Wheat className="w-4 h-4 text-amber-500" />
                  Карта полей 2ГИС · Агро-Телематика
                </span>
                {selectedMachine && (
                  <span className="hidden sm:inline-block text-[11px] text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-zinc-700 pl-3">
                    Поле: {selectedMachine.assigned_field}
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
                <span className="flex items-center gap-1.5 text-orange-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F95700] inline-block" /> В поле на работе
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> На МТД (базе)
                </span>
              </div>
            </div>

            {/* Визуализация полигонов полей и маркеров сельхозтехники */}
            <div
              className={`flex-1 relative overflow-hidden flex items-center justify-center transition-colors duration-300 ${
                mapTheme === 'light'
                  ? 'bg-[#e8edf2] text-gray-700'
                  : 'bg-[#0b1019] text-zinc-400'
              }`}
            >
              {/* Топографический слой 2ГИС Агро (Каналы, агродороги, кадастровые сектора) */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Сетка координат */}
                  <defs>
                    <pattern id="grid-agro-2gis" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path
                        d="M 60 0 L 0 0 0 60"
                        fill="none"
                        stroke={mapTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-agro-2gis)" />

                  {/* Оросительный канал / река */}
                  <path
                    d="M 0 280 Q 300 240 550 360 T 1000 330"
                    fill="none"
                    stroke={mapTheme === 'light' ? '#60a5fa' : '#1e3a8a'}
                    strokeWidth="16"
                    strokeLinecap="round"
                    opacity="0.65"
                  />

                  {/* Сельские полевые дороги */}
                  <line x1="0" y1="52%" x2="100%" y2="48%" stroke={mapTheme === 'light' ? '#cbd5e1' : '#334155'} strokeWidth="6" strokeDasharray="12 8" />
                  <line x1="38%" y1="0" x2="42%" y2="100%" stroke={mapTheme === 'light' ? '#cbd5e1' : '#334155'} strokeWidth="6" strokeDasharray="12 8" />
                </svg>
              </div>

              {/* Названия кластеров и кадастровых секторов */}
              <div className="absolute inset-0 pointer-events-none select-none text-[11px] font-bold uppercase tracking-wider">
                <span className={`absolute top-[16%] left-[20%] ${mapTheme === 'light' ? 'text-gray-400' : 'text-zinc-600'}`}>
                  СЕВЕРНЫЙ КЛАСТЕР · ПОЛЯ 1-12
                </span>
                <span className={`absolute bottom-[18%] right-[24%] ${mapTheme === 'light' ? 'text-gray-400' : 'text-zinc-600'}`}>
                  ЮЖНЫЙ АГРОСЕКТОР · ПОЛЯ 13-28
                </span>
              </div>

              {/* Полигоны полей */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Поле #1 Северное */}
                  <polygon points="120,80 380,110 350,290 140,260" fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
                  {/* Поле #2 Южное */}
                  <polygon points="420,150 680,130 710,340 450,370" fill="rgba(249, 87, 0, 0.08)" stroke="#F95700" strokeWidth="2" />
                  {/* Поле #3 Заречное */}
                  <polygon points="160,340 390,360 410,540 130,510" fill="rgba(245, 158, 11, 0.08)" stroke="#f59e0b" strokeWidth="2" />
                </svg>
              </div>

              {machines.length === 0 ? (
                <div className="z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-8 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl max-w-md text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Wheat className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#1a1a1a] dark:text-white">
                      Агро-парк готов к работе
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Загрузите 5 готовых единиц сельхозтехники (Комбайны Ростсельмаш, Тракторы МТЗ/Кировец), чтобы увидеть их на карте полей с показаниями ДУТ и выработкой.
                    </p>
                  </div>
                  <button
                    onClick={handleLoadDemoAgroFleet}
                    className="w-full py-3 px-4 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
                  >
                    <Rocket className="w-4 h-4" />
                    🚀 Загрузить 5 демо-сельхозмашин
                  </button>
                </div>
              ) : (
                <>
                  {/* Маркеры агротехники */}
                  <div className="absolute inset-0">
                    {filteredMachines.map(m => {
                      const isSelected = selectedMachine?.id === m.id;
                      const leftPercent = 20 + ((m.gps_lng - 37.5) * 450) % 65;
                      const topPercent = 25 + ((m.gps_lat - 55.7) * 450) % 60;

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMachineId(m.id)}
                          style={{
                            left: `${Math.min(82, Math.max(15, leftPercent))}%`,
                            top: `${Math.min(78, Math.max(18, topPercent))}%`
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
                                : m.status === 'field_work'
                                ? 'bg-zinc-900/95 text-white border border-orange-500/60 hover:scale-105'
                                : 'bg-zinc-900/95 text-white border border-emerald-500/60 hover:scale-105'
                            }`}
                          >
                            <Tractor className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px] font-bold whitespace-nowrap">
                              {m.plate_number || m.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Плавающая карточка телеметрии сельхозтехники */}
                  {selectedMachine && (
                    <div className="absolute bottom-6 right-6 left-6 sm:left-auto sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 shadow-2xl z-20 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F95700]">
                            {selectedMachine.category} · IMEI: {selectedMachine.imei}
                          </span>
                          <h4 className="font-bold text-base text-[#1a1a1a] dark:text-zinc-100 mt-0.5">
                            {selectedMachine.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {selectedMachine.operator_name}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setTrackerMachine(selectedMachine);
                            setIsTrackerModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          ДУТ / IMEI
                        </button>
                      </div>

                      {/* Агро-метрики */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Топливо ДУТ</div>
                          <div className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-100 mt-1">
                            {selectedMachine.fuel_percent}%
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                            {selectedMachine.fuel_liters} л
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Выработка смены</div>
                          <div className="text-sm font-bold text-[#F95700] mt-1">
                            {selectedMachine.hectares_today} га
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                            Норма: {selectedMachine.fuel_norm_l_ha} л/га
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Скорость</div>
                          <div className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-100 mt-1">
                            {selectedMachine.speed_kmh} км/ч
                          </div>
                          <div className="text-[11px] text-emerald-500 font-medium">
                            {selectedMachine.status === 'field_work' ? 'В поле' : 'База'}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-zinc-300">Текущая задача: </span>
                        <span className="font-bold text-[#F95700]">{selectedMachine.assigned_field}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Реестр сельхозтехники (Табличный вид) */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
              Реестр сельскохозяйственной техники предприятия
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по реестру..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700]"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    filterCategory === 'all'
                      ? 'bg-[#1a1a1a] dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Все ({machines.length})
                </button>
                <button
                  onClick={() => setFilterCategory('Комбайны')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    filterCategory === 'Комбайны'
                      ? 'bg-[#F95700] text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Комбайны
                </button>
                <button
                  onClick={() => setFilterCategory('Тракторы')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    filterCategory === 'Тракторы'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  Тракторы
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredMachines.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Tractor className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto" />
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  В реестре пока нет сельхозтехники по данному фильтру или база пуста.
                </p>
                {machines.length === 0 && (
                  <button
                    onClick={handleLoadDemoAgroFleet}
                    className="py-2.5 px-4 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                    Загрузить 5 демо-сельхозмашин
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/40 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    <th className="py-3.5 px-4">Сельхозтехника</th>
                    <th className="py-3.5 px-4">Гос. номер</th>
                    <th className="py-3.5 px-4">Категория</th>
                    <th className="py-3.5 px-4">Механизатор</th>
                    <th className="py-3.5 px-4">Закреплённое поле</th>
                    <th className="py-3.5 px-4">Норма / Выработка</th>
                    <th className="py-3.5 px-4">ДУТ / IMEI</th>
                    <th className="py-3.5 px-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs">
                  {filteredMachines.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40">
                      <td className="py-3.5 px-4 font-bold text-[#1a1a1a] dark:text-zinc-100">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-zinc-300">
                        {m.plate_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 font-semibold text-gray-700 dark:text-zinc-300">
                          {m.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300">
                        {m.operator_name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-zinc-300 font-medium">
                        {m.assigned_field}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#F95700]">{m.hectares_today} га</span>
                        <span className="text-gray-400"> · {m.fuel_norm_l_ha} л/га</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 dark:text-zinc-400">
                        {m.imei}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.status === 'field_work' ? (
                          <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#F95700] font-bold">
                            🌾 В поле на работе
                          </span>
                        ) : m.status === 'base' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                            🟢 На МТД
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
                            🟠 На ТО
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Модалка создания сельхозтехники */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-[#1a1a1a] dark:text-white">
                Добавление сельхозтехники в Агро-парк
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCreateMachine} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Название машины</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например, Комбайн Ростсельмаш TORUM 785"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Модель</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder="TORUM 785"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Гос. номер</label>
                  <input
                    type="text"
                    value={formData.plate_number}
                    onChange={e => setFormData({ ...formData, plate_number: e.target.value })}
                    placeholder="7418 УХ 56"
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Категория</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5 font-medium"
                  >
                    <option value="Комбайны">Комбайны</option>
                    <option value="Тракторы">Тракторы</option>
                    <option value="Опрыскиватели">Опрыскиватели</option>
                    <option value="Посевные комплексы">Посевные комплексы</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Норма расхода (л/га)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fuel_norm_l_ha}
                    onChange={e => setFormData({ ...formData, fuel_norm_l_ha: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Механизатор (ФИО)</label>
                <input
                  type="text"
                  value={formData.operator_name}
                  onChange={e => setFormData({ ...formData, operator_name: e.target.value })}
                  placeholder="Соколов В.П."
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white font-bold"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка FAQ: Сельхозтехника и отличие от аренды спецтехники */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-xl w-full border border-gray-200 dark:border-zinc-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base text-[#1a1a1a] dark:text-white">
                ❓ FAQ: Сельхозтехника в Агро-домене СФЕРА ERP
              </h3>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <div className="space-y-3 leading-relaxed text-gray-600 dark:text-zinc-300">
              <p>
                <strong>В чем отличие от модуля «Автопарк (Шахматка)»?</strong><br />
                В разделе «Агро» техника работает не по суточной коммерческой аренде, а по <strong>нормам выработки на гектар (л/га)</strong> и привязывается к кадастровым полигонам полей.
              </p>
              <p>
                <strong>Изоляция для клиентов ниши АГРО:</strong><br />
                Сельскохозяйственные предприятия (колхозы, агрохолдинги) ведут учет тракторов МТЗ/Кировец и комбайнов Ростсельмаш здесь, не пересекаясь с арендными договорами строительной техники.
              </p>
              <p>
                <strong>Как работает телеметика?</strong><br />
                Трекеры ГЛОНАСС передают координаты движения комбайнов по контуру поля и остаток топлива в баке (ДУТ).
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#F95700] text-white font-bold"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка настройки трекера и ДУТ */}
      {isTrackerModalOpen && trackerMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-gray-200 dark:border-zinc-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base text-[#1a1a1a] dark:text-white">
                📡 Настройка терминала ГЛОНАСС и ДУТ
              </h3>
              <button onClick={() => setIsTrackerModalOpen(false)} className="text-gray-400">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Машина</label>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 font-bold text-sm">
                  {trackerMachine.name} ({trackerMachine.plate_number})
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">IMEI Терминала (Wialon / АвтоГРАФ)</label>
                <input
                  type="text"
                  defaultValue={trackerMachine.imei}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-zinc-300 mb-1">Тарировка бака (Литраж ДУТ)</label>
                <input
                  type="number"
                  defaultValue={trackerMachine.fuel_liters}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setIsTrackerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={() => setIsTrackerModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#F95700] text-white font-bold"
              >
                Сохранить телеметрию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
