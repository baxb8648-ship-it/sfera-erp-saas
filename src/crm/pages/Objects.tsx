import React, { useState } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { Plus, X, Building2, MapPin, Layers } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import russiaMapImg from '../../assets/russia_map.png';

interface Client {
  id: number;
  name: string;
}

interface CRMObject {
  id: number;
  name: string;
  client_id: number;
  client_name?: string;
  area_sqm: number | null;
  surface_type: string;
  service_required: string;
  status: string;
}

const CITIES = [
  { name: 'Москва', x: 120, y: 110, region: 'Центральный ФО' },
  { name: 'Санкт-Петербург', x: 95, y: 75, region: 'Северо-Западный ФО' },
  { name: 'Мурманск', x: 110, y: 35, region: 'Кольский полуостров' },
  { name: 'Самара', x: 160, y: 125, region: 'Поволжье' },
  { name: 'Уфа', x: 190, y: 130, region: 'Приуралье' },
  { name: 'Тюмень', x: 235, y: 125, region: 'Западная Сибирь' },
  { name: 'Екатеринбург', x: 215, y: 120, region: 'Урал' },
  { name: 'Новосибирск', x: 310, y: 135, region: 'Сибирь' },
  { name: 'Красноярск', x: 375, y: 130, region: 'Восточная Сибирь' },
  { name: 'Иркутск', x: 420, y: 145, region: 'Прибайкалье' },
  { name: 'Хабаровск', x: 585, y: 160, region: 'Дальний Восток' },
  { name: 'Владивосток', x: 590, y: 185, region: 'Приморье' },
];

export const Objects: React.FC = () => {
  const [viewMode, setViewMode] = useState<'board' | 'map'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<CRMObject | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    area_sqm: '',
    surface_type: 'Металл',
    service_required: 'АКЗ',
    status: 'Выезд на аудит'
  });
  const [formError, setFormError] = useState('');
  const [boardKey, setBoardKey] = useState(0); // to reload KanbanBoard on updates

  const { data: objects = [], isLoading: isLoadingObjects } = useQuery<CRMObject[]>({
    queryKey: ['objects', boardKey, viewMode],
    queryFn: () => apiClient.get('/objects/')
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient.get('/clients/'),
    enabled: isModalOpen,
  });

  const surfaceTypes = ["Металл", "Бетон", "Дерево", "Кирпич", "Другое"];
  const serviceTypes = ["АКЗ", "Пескоструйная очистка", "Гидроизоляция", "Огнезащита", "Другое"];
  const statuses = ["Выезд на аудит", "КП отправлено", "Договор", "В работе", "Завершено"];

  const handleOpenModal = () => {
    setFormError('');
    if (clients.length > 0 && !formData.client_id) {
      setFormData(prev => ({ ...prev, client_id: clients[0].id.toString() }));
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Название объекта обязательно');
      return;
    }

    if (!formData.client_id) {
      setFormError('Выберите заказчика. Если клиентов нет, сначала создайте их во вкладке "Клиенты".');
      return;
    }

    try {
      await apiClient.post('/objects/', {
        name: formData.name,
        client_id: parseInt(formData.client_id),
        area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
        surface_type: formData.surface_type,
        service_required: formData.service_required,
        status: formData.status
      });

      setIsModalOpen(false);
      setBoardKey(prev => prev + 1); // Перезагружаем канбан и список
      setFormData({
        name: '',
        client_id: clients.length > 0 ? clients[0].id.toString() : '',
        area_sqm: '',
        surface_type: 'Металл',
        service_required: 'АКЗ',
        status: 'Выезд на аудит'
      });
    } catch (error: any) {
      setFormError(error.message || 'Ошибка при сохранении объекта');
    }
  };

  // Детерминированное сопоставление объекта с городом на карте
  const getObjectCity = (objId: number) => {
    const index = objId % CITIES.length;
    return CITIES[index];
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <Helmet>
        <title>Объекты | СФЕРА</title>
      </Helmet>

      {/* Header and Switcher (Glassmorphism & Bento-ready) */}
      <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] shrink-0">
        <div>
          <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl text-white shadow-md shadow-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            Объекты и Проекты
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Управление и интерактивный мониторинг технологических площадок
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Свитчер видов (Режим 4) */}
          <div className="flex space-x-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm w-full sm:w-auto">
            <button
              onClick={() => setViewMode('board')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${viewMode === 'board' ? 'bg-[#F95700] text-white shadow-lg shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
            >
              Канбан-доска
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 select-none cursor-pointer ${viewMode === 'map' ? 'bg-[#F95700] text-white shadow-lg shadow-[#F95700]/25' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-750/50'}`}
            >
              Интерактивная карта
            </button>
          </div>
          
          <button 
            onClick={handleOpenModal}
            className="flex items-center justify-center px-5 py-3 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all duration-150 font-bold select-none cursor-pointer text-xs w-full sm:w-auto"
            style={{ minHeight: 44 }} // Touch target (Режим 5)
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить объект
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className={`flex-1 min-h-0 relative ${viewMode === 'board' ? 'overflow-hidden' : 'overflow-y-auto lg:overflow-hidden'}`}>
        {viewMode === 'board' ? (
          <KanbanBoard key={boardKey} />
        ) : (
          /* Interactive High-Tech SVG Map View (Режим 4: Консьерж-Клуб) */
          <div className="glass-panel w-full h-fit lg:h-full rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-white/25 dark:border-zinc-800/60 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden animate-fade-in relative">
            {/* Map Canvas Container */}
            <div className="flex-1 bg-zinc-950/5 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-850 rounded-2xl relative flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
              {/* Grid backdrop effect */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
              
              {/* High-tech stylized SVG Russia Map contours */}
              <svg viewBox="0 0 650 250" className="w-full h-full max-h-[420px] select-none overflow-visible">
                <defs>
                  <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F95700" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#F95700" stopOpacity="0"/>
                  </radialGradient>
                </defs>

                {/* Russia Map Silhouette Image (from user provided file) */}
                <image 
                  href={russiaMapImg}
                  x="10" 
                  y="5" 
                  width="630" 
                  height="240" 
                  preserveAspectRatio="none"
                  className="opacity-70 dark:opacity-35 mix-blend-multiply dark:mix-blend-screen dark:invert pointer-events-none"
                />

                {/* Highlighted regions as paths */}
                <circle cx="120" cy="110" r="45" className="fill-blue-500/5 dark:fill-blue-400/3 stroke-blue-500/10 stroke-1 stroke-dasharray-[2_4]" />
                <circle cx="230" cy="125" r="50" className="fill-orange-500/5 dark:fill-orange-400/3 stroke-orange-500/10 stroke-1 stroke-dasharray-[2_4]" />
                <circle cx="580" cy="170" r="55" className="fill-purple-500/5 dark:fill-purple-400/3 stroke-purple-500/10 stroke-1 stroke-dasharray-[2_4]" />

                {/* Cities text references */}
                {CITIES.map(city => {
                  const hasObjects = objects.some(obj => getObjectCity(obj.id).name === city.name);
                  return (
                    <text
                      key={city.name}
                      x={city.x}
                      y={city.y + 16}
                      className={`text-[7px] font-bold ${hasObjects ? 'fill-[#F95700] dark:fill-orange-400' : 'fill-zinc-400/60 dark:fill-zinc-650'}`}
                      textAnchor="middle"
                    >
                      {city.name}
                    </text>
                  );
                })}

                {/* Interactive Project Pins (Pulsing orange dots) */}
                {objects.map(obj => {
                  const city = getObjectCity(obj.id);
                  const isHovered = hoveredObject?.id === obj.id;
                  
                  return (
                    <g
                      key={obj.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => {
                        setHoveredObject(obj);
                        setTooltipPos({ x: city.x, y: city.y - 12 });
                      }}
                      onMouseLeave={() => setHoveredObject(null)}
                    >
                      {/* Outer pulse effect (ping animation) */}
                      <circle 
                        cx={city.x} 
                        cy={city.y} 
                        r={isHovered ? 16 : 8} 
                        className="fill-orange-500/20 stroke-none transition-all duration-300"
                        style={{ transformOrigin: `${city.x}px ${city.y}px` }}
                      />
                      <circle 
                        cx={city.x} 
                        cy={city.y} 
                        r="6" 
                        className="fill-orange-500/40 stroke-none animate-ping" 
                      />
                      {/* Core point */}
                      <circle 
                        cx={city.x} 
                        cy={city.y} 
                        r={isHovered ? "5" : "4"} 
                        className={`transition-all duration-300 ${
                          obj.status === 'В работе' 
                            ? 'fill-[#F95700] stroke-white dark:stroke-zinc-950' 
                            : obj.status === 'Завершено' 
                            ? 'fill-emerald-500 stroke-white dark:stroke-zinc-950' 
                            : 'fill-blue-500 stroke-white dark:stroke-zinc-950'
                        } stroke-[1.5] shadow-lg`} 
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Rich Tooltip Popup overlay inside Map */}
              {hoveredObject && (() => {
                const city = getObjectCity(hoveredObject.id);
                // Dynamic alignment based on x-coordinate to prevent off-screen clipping on mobile
                let translateX = '-50%';
                if (city.x < 140) {
                  translateX = '-10%';
                } else if (city.x > 510) {
                  translateX = '-90%';
                }

                return (
                  <div 
                    className="absolute z-10 hidden lg:flex bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-zinc-200/50 dark:border-zinc-800/80 text-xs w-56 pointer-events-none animate-in fade-in zoom-in-95 duration-200 flex-col space-y-1.5"
                    style={{
                      left: `${(tooltipPos.x / 650) * 100}%`,
                      top: `${(tooltipPos.y / 250) * 100}%`,
                      transform: `translate(${translateX}, -100%) translateY(-10px)`
                    }}
                  >
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                      <span className="font-extrabold text-[#F95700] uppercase tracking-wider text-[9px]">
                        {city.region}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        hoveredObject.status === 'В работе' 
                          ? 'bg-orange-50 text-[#F95700] dark:bg-orange-950/20' 
                          : hoveredObject.status === 'Завершено' 
                          ? 'bg-green-50 text-green-600 dark:bg-green-950/20' 
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                      }`}>
                        {hoveredObject.status}
                      </span>
                    </div>
                    
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                      {hoveredObject.name}
                    </div>
                    
                    <div className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Заказчик: <span className="font-bold text-zinc-700 dark:text-zinc-300">{hoveredObject.client_name || 'N/A'}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-450 dark:text-zinc-550 font-bold">
                      <div>
                        <span>ПЛОЩАДЬ:</span>
                        <p className="text-zinc-850 dark:text-zinc-300 text-xs mt-0.5 font-mono">{hoveredObject.area_sqm ? `${hoveredObject.area_sqm} м²` : '—'}</p>
                      </div>
                      <div>
                        <span>ОБРАБОТКА:</span>
                        <p className="text-zinc-850 dark:text-zinc-300 text-xs mt-0.5">{hoveredObject.surface_type} / {hoveredObject.service_required}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right sidebar: objects index list */}
            <div className="w-full lg:w-72 flex flex-col space-y-4 shrink-0">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-150 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#F95700]" /> Каталог объектов ({objects.length})
              </h3>
              
              <div className="h-[250px] lg:h-auto lg:flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
                {isLoadingObjects ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                    ))}
                  </div>
                ) : objects.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-400">Нет объектов</div>
                ) : (
                  objects.map(obj => {
                    const city = getObjectCity(obj.id);
                    const isHovered = hoveredObject?.id === obj.id;
                    
                    return (
                      <div
                        key={obj.id}
                        onMouseEnter={() => {
                          setHoveredObject(obj);
                          setTooltipPos({ x: city.x, y: city.y - 12 });
                        }}
                        onMouseLeave={() => setHoveredObject(null)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-300 ${
                          isHovered 
                            ? 'border-[#F95700] bg-orange-50/20 dark:bg-zinc-800/40 shadow-md translate-x-1' 
                            : 'border-zinc-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate flex-1">
                            {obj.name}
                          </h4>
                          <span className={`text-[9px] font-black uppercase tracking-wider text-[#F95700] flex items-center gap-0.5`}>
                            <MapPin className="w-2.5 h-2.5" /> {city.name}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-zinc-550 dark:text-zinc-500 mt-2 font-medium">
                          <span className="truncate max-w-[120px]">{obj.client_name || 'Без заказчика'}</span>
                          <span className="font-mono font-bold">{obj.area_sqm ? `${obj.area_sqm} м²` : ''}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно добавления (Touch targets & validation в едином стиле) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800/60 shadow-[#F95700]/5 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
              <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-widest font-['Montserrat']">
                Добавление нового объекта
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                style={{ minWidth: 44, minHeight: 44 }} // Touch target (Режим 5)
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left font-['Inter']">
              {formError && (
                <div className="p-4 rounded-xl text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-start gap-2 animate-shake">
                  <span className="font-bold">{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Название объекта *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Резервуар РВС-5000"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Заказчик / Клиент *</label>
                <select 
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                  required
                >
                  {clients.length === 0 ? (
                    <option value="">Нет клиентов в базе</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">Площадь, м²</label>
                <input 
                  type="number" 
                  value={formData.area_sqm}
                  onChange={(e) => setFormData({...formData, area_sqm: e.target.value})}
                  placeholder="1200"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-bold text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">Тип поверхности</label>
                  <select 
                    value={formData.surface_type}
                    onChange={(e) => setFormData({...formData, surface_type: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                  >
                    {surfaceTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">Требуемая услуга</label>
                  <select 
                    value={formData.service_required}
                    onChange={(e) => setFormData({...formData, service_required: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                  >
                    {serviceTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">Начальный статус</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-zinc-250 dark:border-zinc-700 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold active:scale-95 transition-all select-none cursor-pointer"
                  style={{ minHeight: 44 }}
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#F95700] to-orange-600 text-white rounded-xl active:scale-95 transition-all font-bold text-xs shadow-lg shadow-orange-500/20 select-none cursor-pointer"
                  style={{ minHeight: 44 }}
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
