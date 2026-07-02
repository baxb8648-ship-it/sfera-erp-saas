import React, { useState, useEffect } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { Plus, X, Building2, MapPin, Layers } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';

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
  object_type?: string;
  custom_fields?: Record<string, any>;
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

const CITIES_GEO: Record<string, [number, number]> = {
  'Москва': [55.7558, 37.6173],
  'Санкт-Петербург': [59.9343, 30.3351],
  'Мурманск': [68.9585, 33.0827],
  'Самара': [53.1959, 50.1002],
  'Уфа': [54.7388, 55.9721],
  'Тюмень': [57.1523, 65.5272],
  'Екатеринбург': [56.8389, 60.6057],
  'Новосибирск': [55.0084, 82.9357],
  'Красноярск': [56.0153, 92.8932],
  'Иркутск': [52.2978, 104.2964],
  'Хабаровск': [48.4802, 135.0719],
  'Владивосток': [43.1198, 131.8869],
  'Оренбург': [51.7666, 55.1005],
  'Бузулук': [52.7807, 52.2635],
  'Казань': [55.7961, 49.1064]
};

const TwoGisMapViewer: React.FC<{
  objects: CRMObject[];
  getObjectCity: (id: number) => any;
  onSelectObject: (obj: CRMObject) => void;
}> = ({ objects, getObjectCity, onSelectObject }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initMap = () => {
      if (!isMounted) return;
      try {
        if (!(window as any).DG) return;
        (window as any).DG.then(() => {
          if (!isMounted) return;
          const container = document.getElementById('2gis-map-container');
          if (!container) return;
          container.innerHTML = '';
          const map = (window as any).DG.map('2gis-map-container', {
            center: [55.7558, 60.6057], // Центр РФ (Урал)
            zoom: 4,
            fullscreenControl: true,
            zoomControl: true
          });

          objects.forEach(obj => {
            const city = getObjectCity(obj.id);
            const baseCoords = CITIES_GEO[city.name] || [55.7558, 37.6173];
            const offsetLat = (Math.random() - 0.5) * 0.08;
            const offsetLng = (Math.random() - 0.5) * 0.08;
            const coords = [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];

            const marker = (window as any).DG.marker(coords).addTo(map);
            marker.bindPopup(`
              <div style="font-family: 'Montserrat', sans-serif; padding: 6px; max-w: 220px; line-height: 1.4;">
                <div style="font-size: 10px; font-weight: 800; color: #F95700; text-transform: uppercase;">📍 ${city.name} (${city.region})</div>
                <div style="font-size: 13px; font-weight: bold; color: #1a1a1a; margin-top: 4px;">${obj.name}</div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;"><b>Заказчик:</b> ${obj.client_name || 'N/A'}</div>
                <div style="font-size: 11px; margin-top: 4px; display: flex; justify-content: space-between;">
                  <span><b>Статус:</b> <span style="color: #2e7d32; font-weight: bold;">${obj.status}</span></span>
                </div>
                <div style="font-size: 11px; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px; color: #444;">
                  <b>Работы:</b> ${obj.service_required}
                </div>
              </div>
            `);
            marker.on('click', () => {
              onSelectObject(obj);
            });
          });
          setIsLoaded(true);
        });
      } catch (e) {
        console.error('2GIS init error:', e);
        setError(true);
      }
    };

    if (!(window as any).DG) {
      const existingScript = document.getElementById('2gis-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = '2gis-script';
        script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
        script.async = true;
        script.onload = () => initMap();
        script.onerror = () => setError(true);
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener('load', () => initMap());
      }
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
    };
  }, [objects]);

  return (
    <div className="w-full h-full min-h-[420px] relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 flex flex-col shadow-inner">
      <div id="2gis-map-container" className="w-full flex-1 min-h-[420px]" style={{ background: '#1e1e1e' }}></div>
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10 animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#F95700] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-zinc-200 tracking-wider">Загрузка интерактивной карты 2ГИС...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 p-6 text-center animate-fade-in">
          <MapPin className="w-12 h-12 text-red-500 mb-3 animate-bounce" />
          <span className="text-sm font-bold text-white mb-1">Не удалось загрузить API 2ГИС</span>
          <span className="text-xs text-zinc-400 max-w-sm">Проверьте подключение к интернету или переключитесь на векторную схему РФ (SVG).</span>
        </div>
      )}
      <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-100 tracking-wide">2ГИС Live API • РФ & СНГ</span>
      </div>
    </div>
  );
};

export const Objects: React.FC = () => {
  const [viewMode, setViewMode] = useState<'board' | 'map'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredObject, setHoveredObject] = useState<CRMObject | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    area_sqm: '',
    surface_type: 'Металл',
    service_required: 'Строительно-монтажные',
    status: 'Выезд на аудит',
    object_type: 'construction',
    custom_fields: {} as Record<string, any>
  });
  const [formError, setFormError] = useState('');
  const [boardKey, setBoardKey] = useState(0); // to reload KanbanBoard on updates

  // Fetch field templates for the selected object_type
  const { data: fieldTemplates = [] } = useQuery<any[]>({
    queryKey: ['fieldTemplates', formData.object_type],
    queryFn: () => apiClient.get(`/field-templates/?entity_type=object&object_type=${formData.object_type}`),
    enabled: isModalOpen,
  });

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
  const serviceTypes = ["Строительно-монтажные", "Инженерные сети", "Отделочные работы", "Капитальный ремонт", "Другое"];
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
        status: formData.status,
        object_type: formData.object_type,
        custom_fields: formData.custom_fields
      });

      setIsModalOpen(false);
      setBoardKey(prev => prev + 1); // Перезагружаем канбан и список
      setFormData({
        name: '',
        client_id: clients.length > 0 ? clients[0].id.toString() : '',
        area_sqm: '',
        surface_type: 'Металл',
        service_required: 'Строительно-монтажные',
        status: 'Выезд на аудит',
        object_type: 'construction',
        custom_fields: {}
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
          /* Interactive High-Tech SVG & 2GIS Map View (Режим 4: Консьерж-Клуб) */
          <div className="glass-panel w-full h-fit lg:h-full rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-white/25 dark:border-zinc-800/60 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden animate-fade-in relative">
            {/* Map Canvas Container */}
            <div className="flex-1 flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F95700]" /> Геоинформационная система (ГИС)
                  </span>
                </div>
                
              </div>

              <div className="flex-1 bg-zinc-950/5 dark:bg-zinc-950/40 border border-zinc-200/40 dark:border-zinc-850 rounded-2xl relative flex items-center justify-center p-4 overflow-hidden min-h-[350px]">
                <TwoGisMapViewer 
                  objects={objects} 
                  getObjectCity={getObjectCity} 
                  onSelectObject={(obj) => setHoveredObject(obj)} 
                />
              </div>
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
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Тип объекта *</label>
                <select 
                  value={formData.object_type}
                  onChange={(e) => setFormData({...formData, object_type: e.target.value, custom_fields: {}})}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                  required
                >
                  <option value="construction">Строительство</option>
                  <option value="renovation">Ремонт / Реконструкция</option>
                  <option value="service">Обслуживание</option>
                </select>
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

              {/* Dynamic Custom Fields Rendering */}
              {fieldTemplates.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[10px] font-bold text-[#F95700] uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-3">
                    Дополнительные параметры ({formData.object_type})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldTemplates.map(field => (
                      <div key={field.field_key || field.key} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider">
                          {field.field_label || field.name} {field.is_required && '*'}
                        </label>
                        {field.field_type === 'select' ? (
                          <select
                            required={field.is_required}
                            value={formData.custom_fields[field.field_key || field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.value}
                            })}
                            className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm cursor-pointer"
                          >
                            <option value="">Не выбрано</option>
                            {(Array.isArray(field.options) ? field.options : (field.options ? field.options.split(',') : [])).map((opt: string) => (
                              <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                            ))}
                          </select>
                        ) : field.field_type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={!!formData.custom_fields[field.field_key || field.key]}
                              onChange={(e) => setFormData({
                                ...formData, 
                                custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.checked}
                              })}
                              className="w-4 h-4 text-[#F95700] border-zinc-300 rounded focus:ring-[#F95700]"
                            />
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Да / Нет</span>
                          </label>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                            required={field.is_required}
                            value={formData.custom_fields[field.field_key || field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.value}
                            })}
                            className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 transition-all font-medium text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
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
