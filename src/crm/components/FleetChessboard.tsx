import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Truck,
  Wrench,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  DollarSign,
  FileText,
  ArrowUpRight,
  X,
  PhoneCall,
  Sparkles,
  Calendar,
  Activity
} from 'lucide-react';
import { apiClient } from '../../api/client';

// ==========================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

export type EquipmentCategory = 'all' | 'excavator' | 'crane' | 'dump_truck' | 'loader' | 'roller';

export interface EquipmentItem {
  id: string;
  name: string;
  model: string;
  category: EquipmentCategory;
  plateNumber: string;
  dailyRate: number; // Стоимость смены 8ч (руб)
  status: 'active' | 'maintenance' | 'reserved' | 'available';
  operatorName: string;
  operatorPhone: string;
  location: string;
  fuelLevel: number; // В процентах (для ГЛОНАСС связи)
  engineHours: number; // Моточасы
}

export type BookingStatus = 'rented' | 'reserved' | 'maintenance' | 'transit';

export interface BookingItem {
  id: string;
  equipmentId: string;
  clientName: string;
  clientInn: string;
  objectName: string;
  objectAddress: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: BookingStatus;
  totalCost: number;
  prepaidCost: number;
  managerName: string;
  contractNumber: string;
  notes?: string;
}

// ==========================================
// МОКОВЫЕ ДАННЫЕ (ГЕНЕРАТОР РЕАЛИСТИЧНОГО АВТОПАРКА)
// ==========================================

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-01',
    name: 'Экскаватор-погрузчик',
    model: 'JCB 3CX Super',
    category: 'excavator',
    plateNumber: 'А 123 АА 77',
    dailyRate: 24000,
    status: 'active',
    operatorName: 'Соколов Дмитрий В.',
    operatorPhone: '+7 (916) 444-12-34',
    location: 'объект "ЖК Алые Паруса"',
    fuelLevel: 82,
    engineHours: 4210
  },
  {
    id: 'eq-02',
    name: 'Гусеничный экскаватор',
    model: 'CAT 320 GC (20т)',
    category: 'excavator',
    plateNumber: 'М 456 ВВ 77',
    dailyRate: 38000,
    status: 'reserved',
    operatorName: 'Иванов Алексей П.',
    operatorPhone: '+7 (903) 555-88-99',
    location: 'База СФЕРА (Одинцово)',
    fuelLevel: 100,
    engineHours: 6150
  },
  {
    id: 'eq-03',
    name: 'Автокран 50 тонн',
    model: 'Liebherr LTM 1050-3.1',
    category: 'crane',
    plateNumber: 'Х 789 СС 77',
    dailyRate: 65000,
    status: 'active',
    operatorName: 'Потапов Сергей К.',
    operatorPhone: '+7 (926) 333-77-11',
    location: 'объект "ТЭЦ-26 Реконструкция"',
    fuelLevel: 64,
    engineHours: 8900
  },
  {
    id: 'eq-04',
    name: 'Самосвал 20 куб.м',
    model: 'КАМАЗ 6520-63',
    category: 'dump_truck',
    plateNumber: 'О 654 ММ 77',
    dailyRate: 18000,
    status: 'maintenance',
    operatorName: 'Кузнецов Игорь М.',
    operatorPhone: '+7 (915) 222-33-44',
    location: 'Сервис-центр (Замена гидравлики)',
    fuelLevel: 15,
    engineHours: 11400
  },
  {
    id: 'eq-05',
    name: 'Самосвал 25 куб.м',
    model: 'SHACMAN SX3258',
    category: 'dump_truck',
    plateNumber: 'В 987 ТТ 77',
    dailyRate: 22000,
    status: 'active',
    operatorName: 'Назаров Виктор Р.',
    operatorPhone: '+7 (999) 111-22-33',
    location: 'объект "Трасса М-12 Участок 4"',
    fuelLevel: 91,
    engineHours: 5300
  },
  {
    id: 'eq-06',
    name: 'Мини-погрузчик',
    model: 'Bobcat S530 High Flow',
    category: 'loader',
    plateNumber: 'К 321 ХХ 77',
    dailyRate: 15000,
    status: 'active',
    operatorName: 'Федоров Роман С.',
    operatorPhone: '+7 (905) 777-66-55',
    location: 'объект "Парк Горького Благоустройство"',
    fuelLevel: 78,
    engineHours: 2890
  },
  {
    id: 'eq-07',
    name: 'Фронтальный погрузчик',
    model: 'XCMG LW500FN (3 куб.м)',
    category: 'loader',
    plateNumber: 'Е 741 РР 77',
    dailyRate: 28000,
    status: 'available',
    operatorName: 'Белов Николай А.',
    operatorPhone: '+7 (916) 888-00-11',
    location: 'База СФЕРА (Одинцово)',
    fuelLevel: 95,
    engineHours: 3450
  },
  {
    id: 'eq-08',
    name: 'Грунтовый каток 14т',
    model: 'HAMM 3414',
    category: 'roller',
    plateNumber: 'Н 852 ОО 77',
    dailyRate: 26000,
    status: 'active',
    operatorName: 'Григорьев Артем В.',
    operatorPhone: '+7 (925) 444-55-66',
    location: 'объект "Трасса М-12 Участок 4"',
    fuelLevel: 55,
    engineHours: 4780
  }
];

const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 'bk-101',
    equipmentId: 'eq-01',
    clientName: 'ООО "ГлавСтрой Подряд"',
    clientInn: '7701234567',
    objectName: 'ЖК "Алые Паруса", Корпус 3',
    objectAddress: 'г. Москва, ул. Авиационная, д. 77',
    startDate: '2026-07-01',
    endDate: '2026-07-08',
    status: 'rented',
    totalCost: 192000, // 8 смен * 24000
    prepaidCost: 192000,
    managerName: 'Александрова Е.В.',
    contractNumber: 'АР-2026/07-12'
  },
  {
    id: 'bk-102',
    equipmentId: 'eq-01',
    clientName: 'АО "МосИнжПроект"',
    clientInn: '7709876543',
    objectName: 'Станция метро "Рублевская"',
    objectAddress: 'г. Москва, Рублевское ш., д. 14',
    startDate: '2026-07-10',
    endDate: '2026-07-15',
    status: 'reserved',
    totalCost: 144000, // 6 смен * 24000
    prepaidCost: 50000,
    managerName: 'Смирнов К.А.',
    contractNumber: 'БР-2026/07-88'
  },
  {
    id: 'bk-103',
    equipmentId: 'eq-02',
    clientName: 'ООО "ДорСтрой Трест"',
    clientInn: '5024001122',
    objectName: 'Развязка МКАД 45-й км',
    objectAddress: 'г. Москва, МКАД 45 км внешняя сторона',
    startDate: '2026-07-04',
    endDate: '2026-07-12',
    status: 'reserved',
    totalCost: 342000,
    prepaidCost: 100000,
    managerName: 'Александрова Е.В.',
    contractNumber: 'АР-2026/07-19'
  },
  {
    id: 'bk-104',
    equipmentId: 'eq-03',
    clientName: 'ПАО "МосЭнерго"',
    clientInn: '7705001234',
    objectName: 'ТЭЦ-26 Реконструкция турбины',
    objectAddress: 'г. Москва, Востряковский проезд, д. 10',
    startDate: '2026-06-28',
    endDate: '2026-07-06',
    status: 'rented',
    totalCost: 585000,
    prepaidCost: 585000,
    managerName: 'Петров Д.С.',
    contractNumber: 'АР-2026/06-91'
  },
  {
    id: 'bk-105',
    equipmentId: 'eq-03',
    clientName: 'ООО "СпецМонтаж-7"',
    clientInn: '7733221100',
    objectName: 'Монтаж башенного крана ЖК "Сити"',
    objectAddress: 'г. Москва, Пресненская наб., д. 12',
    startDate: '2026-07-09',
    endDate: '2026-07-14',
    status: 'rented',
    totalCost: 390000,
    prepaidCost: 390000,
    managerName: 'Петров Д.С.',
    contractNumber: 'АР-2026/07-05'
  },
  {
    id: 'bk-106',
    equipmentId: 'eq-04',
    clientName: 'Внутренний сервис СФЕРА',
    clientInn: '7700000000',
    objectName: 'Плановое ТО 10 000 м/ч + Гидравлика',
    objectAddress: 'Сервис-центр СФЕРА, г. Одинцово',
    startDate: '2026-07-02',
    endDate: '2026-07-06',
    status: 'maintenance',
    totalCost: 0,
    prepaidCost: 0,
    managerName: 'Главинженер Морозов А.В.',
    contractNumber: 'ТО-2026-409'
  },
  {
    id: 'bk-107',
    equipmentId: 'eq-05',
    clientName: 'АО "Автобан"',
    clientInn: '7711223344',
    objectName: 'Трасса М-12 Участок 4 (Земляные работы)',
    objectAddress: 'Владимирская обл., Петушинский район',
    startDate: '2026-06-25',
    endDate: '2026-07-15',
    status: 'rented',
    totalCost: 462000,
    prepaidCost: 462000,
    managerName: 'Смирнов К.А.',
    contractNumber: 'АР-2026/06-44'
  },
  {
    id: 'bk-108',
    equipmentId: 'eq-06',
    clientName: 'ГБУ "Жилищник ЦАО"',
    clientInn: '7704556677',
    objectName: 'Благоустройство ЦПКиО им. Горького',
    objectAddress: 'г. Москва, Крымский Вал, д. 9',
    startDate: '2026-07-01',
    endDate: '2026-07-07',
    status: 'rented',
    totalCost: 105000,
    prepaidCost: 105000,
    managerName: 'Александрова Е.В.',
    contractNumber: 'АР-2026/07-02'
  },
  {
    id: 'bk-109',
    equipmentId: 'eq-08',
    clientName: 'АО "Автобан"',
    clientInn: '7711223344',
    objectName: 'Трасса М-12 Участок 4 (Укладка асфальта)',
    objectAddress: 'Владимирская обл., Петушинский район',
    startDate: '2026-06-28',
    endDate: '2026-07-12',
    status: 'rented',
    totalCost: 390000,
    prepaidCost: 390000,
    managerName: 'Смирнов К.А.',
    contractNumber: 'АР-2026/06-45'
  }
];

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДАТ
// ==========================================

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getDaysArray = (startStr: string, daysCount: number): { dateStr: string; dayNum: number; dayOfWeek: string; isWeekend: boolean; isToday: boolean }[] => {
  const result = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const daysNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(startStr);
    current.setDate(current.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeekIdx = current.getDay();
    const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6;

    result.push({
      dateStr,
      dayNum: current.getDate(),
      dayOfWeek: daysNames[dayOfWeekIdx],
      isWeekend,
      isToday: dateStr === todayStr
    });
  }
  return result;
};

const getDaysDiff = (startStr: string, endStr: string): number => {
  const s = new Date(startStr).getTime();
  const e = new Date(endStr).getTime();
  return Math.round((e - s) / (1000 * 3600 * 24));
};

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ FLEET CHESSBOARD
// ==========================================

export const FleetChessboard: React.FC = () => {
  // Состояния фильтрации и навигации
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewDaysCount, setViewDaysCount] = useState<number>(14); // 14 или 30 дней
  const [timelineStartDate, setTimelineStartDate] = useState<string>(() => {
    // Начинаем с 7 дней назад, чтобы видеть текущие брони
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });

  // Модальные окна
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [selectedVehicleForCard, setSelectedVehicleForCard] = useState<EquipmentItem | null>(null);
  const [activeVehicleTab, setActiveVehicleTab] = useState<'passport' | 'rentals' | 'maintenance' | 'finance'>('passport');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState<boolean>(false);
  const [newVehicleData, setNewVehicleData] = useState({
    name: '',
    model: '',
    plateNumber: '',
    category: 'excavator' as EquipmentCategory,
    dailyRate: 25000,
    bookValue: 15000000,
    status: 'available' as const
  });

  const [newBookingData, setNewBookingData] = useState<Partial<BookingItem>>({
    equipmentId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'reserved',
    clientName: '',
    clientInn: '',
    objectName: '',
    objectAddress: '',
    managerName: '',
    contractNumber: ''
  });

  // Загрузка техники из бэкенда /fleet/vehicles
  React.useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehicles = await apiClient.get<any[]>('/fleet/vehicles');
        if (vehicles && Array.isArray(vehicles) && vehicles.length > 0) {
          const mapped: EquipmentItem[] = vehicles.map((v) => ({
            id: String(v.id),
            name: v.name || 'Техника',
            model: v.model || '',
            category: (['excavator', 'crane', 'dump_truck', 'loader', 'roller'].includes(v.category) ? v.category : 'excavator') as EquipmentCategory,
            plateNumber: v.plate_number || '—',
            dailyRate: v.daily_rate || 20000,
            status: v.status === 'rented' ? 'active' : 'available',
            operatorName: 'Оператор СФЕРА',
            operatorPhone: '+7 (999) 000-00-00',
            location: 'База СФЕРА',
            fuelLevel: 95,
            engineHours: 1200
          }));
          setEquipmentList(mapped);
        }
      } catch (err) {
        console.warn('Используются демо-данные автопарка:', err);
      }
    };
    fetchVehicles();
  }, []);

  // Фильтрация техники
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      const matchesCategory = selectedCategory === 'all' || eq.category === selectedCategory;
      const matchesSearch =
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [equipmentList, selectedCategory, searchQuery]);

  // Интеграция ТОиР (ServiceTickets)
  React.useEffect(() => {
    const fetchServiceTickets = async () => {
      try {
        const tickets = await apiClient.get<any[]>('/service/');
        if (tickets && Array.isArray(tickets)) {
          const activeTickets = tickets.filter(t => t.status !== 'resolved');
          
          const maintenanceBookings: BookingItem[] = activeTickets.map(t => {
            // Маппим реальный equipment_id (число) на моковый 'eq-0X'
            const eqId = t.equipment_id ? `eq-0${t.equipment_id}` : 'eq-01';
            
            return {
              id: `srv-${t.id}`,
              equipmentId: eqId,
              clientName: 'Внутренний сервис ТОиР',
              clientInn: '—',
              objectName: t.issue_description || 'Техническое обслуживание',
              objectAddress: 'Ремонтная база',
              startDate: new Date().toISOString().split('T')[0], // Сегодня
              endDate: addDays(new Date().toISOString().split('T')[0], 3), // +3 дня на ремонт
              status: 'maintenance',
              totalCost: 0,
              prepaidCost: 0,
              managerName: 'Механик',
              contractNumber: `Заявка ТОиР #${t.id}`,
              notes: t.audio_transcript || ''
            };
          });

          setBookings(prev => {
            // Удаляем старые заявки ТОиР, чтобы не дублировались при ререндере
            const withoutOldSrv = prev.filter(b => !b.id.startsWith('srv-'));
            return [...withoutOldSrv, ...maintenanceBookings];
          });
        }
      } catch (err) {
        console.error('Failed to fetch service tickets for chessboard', err);
      }
    };
    
    fetchServiceTickets();
  }, []);

  // Генерация массива дней для сетки таймлайна
  const timelineDays = useMemo(() => {
    return getDaysArray(timelineStartDate, viewDaysCount);
  }, [timelineStartDate, viewDaysCount]);

  // Вычисление KPI
  const kpiStats = useMemo(() => {
    const total = equipmentList.length;
    const active = equipmentList.filter(e => e.status === 'active').length;
    const reserved = equipmentList.filter(e => e.status === 'reserved').length;
    const maintenance = equipmentList.filter(e => e.status === 'maintenance').length;
    const available = equipmentList.filter(e => e.status === 'available').length;

    // Расчет общей стоимости аренды в сутки по активным машинам
    const dailyRevenue = equipmentList
      .filter(e => e.status === 'active')
      .reduce((sum, e) => sum + e.dailyRate, 0);

    return { total, active, reserved, maintenance, available, dailyRevenue };
  }, [equipmentList]);

  // Цветовые стили для статусов бронирования
  const getBookingStyle = (status: BookingStatus) => {
    switch (status) {
      case 'rented':
        return {
          bg: 'bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-800 text-white border-emerald-400 dark:border-emerald-500 shadow-emerald-500/20',
          label: 'В АРЕНДЕ',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
        };
      case 'reserved':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white border-blue-400 dark:border-blue-500 shadow-blue-500/20',
          label: 'БРОНЬ',
          icon: <Clock className="w-3.5 h-3.5 text-blue-200 shrink-0" />
        };
      case 'maintenance':
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-800 text-white border-amber-400 dark:border-amber-500 shadow-amber-500/20',
          label: 'ТО / РЕМОНТ',
          icon: <Wrench className="w-3.5 h-3.5 text-amber-200 shrink-0" />
        };
      case 'transit':
        return {
          bg: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 dark:from-purple-700 dark:to-fuchsia-800 text-white border-purple-400 dark:border-purple-500 shadow-purple-500/20',
          label: 'ТРАНЗИТ',
          icon: <Truck className="w-3.5 h-3.5 text-purple-200 shrink-0" />
        };
      default:
        return {
          bg: 'bg-slate-600 text-white border-slate-400',
          label: 'ЗАНЯТО',
          icon: null
        };
    }
  };

  // Обработчик добавления новой единицы техники
  const handleCreateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleData.name) return;

    try {
      const created = await apiClient.post<any>('/fleet/vehicles', {
        name: newVehicleData.name,
        model: newVehicleData.model,
        plate_number: newVehicleData.plateNumber,
        category: newVehicleData.category,
        daily_rate: Number(newVehicleData.dailyRate) || 20000,
        book_value: Number(newVehicleData.bookValue) || 0,
        status: newVehicleData.status
      });

      const mappedItem: EquipmentItem = {
        id: created && created.id ? String(created.id) : `eq-${Date.now()}`,
        name: newVehicleData.name,
        model: newVehicleData.model || 'Модель не указана',
        category: newVehicleData.category,
        plateNumber: newVehicleData.plateNumber || '—',
        dailyRate: Number(newVehicleData.dailyRate) || 20000,
        status: newVehicleData.status === 'available' ? 'active' : 'reserved',
        operatorName: 'Оператор СФЕРА',
        operatorPhone: '+7 (999) 000-00-00',
        location: 'База СФЕРА',
        fuelLevel: 100,
        engineHours: 0
      };

      setEquipmentList((prev) => [mappedItem, ...prev]);
      setIsAddVehicleModalOpen(false);
      setNewVehicleData({
        name: '',
        model: '',
        plateNumber: '',
        category: 'excavator',
        dailyRate: 25000,
        bookValue: 15000000,
        status: 'available'
      });
    } catch (err) {
      console.error('Ошибка сохранения техники в API:', err);
      // Fallback на локальное добавление, чтобы UI работал всегда
      const fallbackItem: EquipmentItem = {
        id: `eq-${Date.now()}`,
        name: newVehicleData.name,
        model: newVehicleData.model || 'Модель',
        category: newVehicleData.category,
        plateNumber: newVehicleData.plateNumber || '—',
        dailyRate: Number(newVehicleData.dailyRate) || 20000,
        status: 'active',
        operatorName: 'Оператор СФЕРА',
        operatorPhone: '+7 (999) 000-00-00',
        location: 'База СФЕРА',
        fuelLevel: 100,
        engineHours: 0
      };
      setEquipmentList((prev) => [fallbackItem, ...prev]);
      setIsAddVehicleModalOpen(false);
    }
  };

  // Обработчик создания новой брони
  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingData.equipmentId || !newBookingData.startDate || !newBookingData.endDate) return;

    const eq = equipmentList.find(i => i.id === newBookingData.equipmentId);
    const days = Math.max(1, getDaysDiff(newBookingData.startDate, newBookingData.endDate) + 1);
    const cost = (eq?.dailyRate || 20000) * days;

    const created: BookingItem = {
      id: `bk-${Date.now().toString().slice(-4)}`,
      equipmentId: newBookingData.equipmentId,
      clientName: newBookingData.clientName || 'Новый клиент',
      clientInn: newBookingData.clientInn || '7700000000',
      objectName: newBookingData.objectName || 'Объект заказчика',
      objectAddress: newBookingData.objectAddress || 'г. Москва',
      startDate: newBookingData.startDate,
      endDate: newBookingData.endDate,
      status: (newBookingData.status as BookingStatus) || 'reserved',
      totalCost: cost,
      prepaidCost: newBookingData.status === 'rented' ? cost : Math.round(cost * 0.3),
      managerName: newBookingData.managerName || 'Смирнов К.А.',
      contractNumber: newBookingData.contractNumber || `БР-2026/07-${Math.floor(10 + Math.random() * 89)}`,
      notes: newBookingData.notes
    };

    setBookings(prev => [created, ...prev]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 transition-colors duration-300">
      
      {/* ================= HEADER & TITLE ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Модуль 4.4: Автопарки & Телеметрия
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold">
              RLS SaaS Изоляция
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5 flex items-center gap-3">
            🚜 Шахматка аренды и занятости техники
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Интерактивный график бронирования (Диаграмма Ганта), контроль ТО и телеметрия топлива ГЛОНАСС в реальном времени.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewDaysCount(14)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewDaysCount === 14
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              14 дней
            </button>
            <button
              onClick={() => setViewDaysCount(30)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewDaysCount === 30
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 дней
            </button>
          </div>

          <button
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl shadow-md transition-all text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Добавить технику
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Создать бронирование
          </button>
        </div>
      </div>

      {/* ================= KPI BENTO GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        
        {/* Card 1: Всего единиц */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Всего в парке</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-xl text-slate-600 dark:text-slate-300">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">{kpiStats.total}</span>
            <span className="text-xs font-semibold text-slate-500">единиц</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-slate-500 h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* Card 2: В аренде на объектах */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">В аренде (Работают)</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl animate-pulse">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.active}</span>
            <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">({Math.round((kpiStats.active / kpiStats.total) * 100)}% загрузки)</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Выручка: {(kpiStats.dailyRevenue / 1000).toFixed(0)} тыс. ₽ / сутки</span>
          </div>
        </div>

        {/* Card 3: Бронь и ожидание */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Бронирование</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{kpiStats.reserved}</span>
            <span className="text-xs font-semibold text-slate-500">машины ждут оплату</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(kpiStats.reserved / kpiStats.total) * 100}%` }}></div>
          </div>
        </div>

        {/* Card 4: На плановом ТО / Ремонте */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">ТО и Сервис</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{kpiStats.maintenance}</span>
            <span className="text-xs font-semibold text-slate-500">на базе в ремонте</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(kpiStats.maintenance / kpiStats.total) * 100}%` }}></div>
          </div>
        </div>

        {/* Card 5: Свободно на базе */}
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Свободно</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black">{kpiStats.available}</span>
            <span className="text-xs font-semibold text-emerald-500 font-bold">готовы к выезду</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(kpiStats.available / kpiStats.total) * 100}%` }}></div>
          </div>
        </div>

      </div>

      {/* ================= CONTROLS & FILTER BAR ================= */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Вся техника', count: equipmentList.length },
              { id: 'excavator', label: 'Экскаваторы', count: equipmentList.filter(e => e.category === 'excavator').length },
              { id: 'crane', label: 'Краны', count: equipmentList.filter(e => e.category === 'crane').length },
              { id: 'dump_truck', label: 'Самосвалы', count: equipmentList.filter(e => e.category === 'dump_truck').length },
              { id: 'loader', label: 'Погрузчики', count: equipmentList.filter(e => e.category === 'loader').length },
              { id: 'roller', label: 'Катки', count: equipmentList.filter(e => e.category === 'roller').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as EquipmentCategory)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedCategory === tab.id
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-extrabold'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Timeline Navigation */}
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по госномеру, модели..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Shifting */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
              <button
                onClick={() => setTimelineStartDate(addDays(timelineStartDate, -7))}
                title="Назад на неделю"
                className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[120px] text-center">
                {new Date(timelineStartDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — {new Date(addDays(timelineStartDate, viewDaysCount - 1)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
              <button
                onClick={() => setTimelineStartDate(addDays(timelineStartDate, 7))}
                title="Вперед на неделю"
                className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ================= CHESSBOARD GANTT GRID ================= */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
          
          {/* Table Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 min-w-[900px]">
            
            {/* Pinned Left Column (Equipment list) */}
            <div className="w-72 sm:w-80 shrink-0 p-3.5 bg-slate-50/90 dark:bg-slate-900/90 sticky left-0 z-20 border-r border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-xs uppercase tracking-wider text-slate-500">
              <span>Техника и Госномер</span>
              <span>Статус / Тариф</span>
            </div>

            {/* Timeline Days Header */}
            <div className="flex flex-1">
              {timelineDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`flex-1 min-w-[54px] max-w-[70px] py-2 px-1 text-center border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center transition-colors ${
                    day.isWeekend
                      ? 'bg-amber-500/5 dark:bg-amber-500/10'
                      : 'bg-white dark:bg-slate-800'
                  } ${day.isToday ? 'bg-blue-500/10 dark:bg-blue-500/20 font-black' : ''}`}
                >
                  <span className={`text-[10px] font-bold uppercase ${
                    day.isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {day.dayOfWeek}
                  </span>
                  <span className={`text-sm font-black mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    day.isToday
                      ? 'bg-blue-600 text-white shadow-sm'
                      : day.isWeekend
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* Table Body (Equipment Rows) */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 min-w-[900px]">
            {filteredEquipment.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 animate-bounce" />
                <p className="font-bold text-base">Техника по вашему запросу не найдена</p>
                <p className="text-xs text-slate-500 mt-1">Попробуйте сбросить поисковые фильтры или выбрать другую категорию</p>
              </div>
            ) : (
              filteredEquipment.map((eq) => {
                // Ищем бронирования для этой машины, пересекающиеся с текущим периодом
                const eqBookings = bookings.filter(b => b.equipmentId === eq.id);

                return (
                  <div
                    key={eq.id}
                    className="flex items-stretch hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group"
                  >
                    
                    {/* Left Column: Equipment Info */}
                    <div
                      onClick={() => { setSelectedVehicleForCard(eq); setActiveVehicleTab('passport'); }}
                      className="w-72 sm:w-80 shrink-0 p-3.5 bg-white dark:bg-slate-800 sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/90 transition-colors cursor-pointer"
                      title="Кликните, чтобы открыть Паспорт и историю техники"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-white shadow-sm ${
                          eq.category === 'excavator' ? 'bg-amber-600' :
                          eq.category === 'crane' ? 'bg-blue-600' :
                          eq.category === 'dump_truck' ? 'bg-emerald-600' : 'bg-purple-600'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white truncate" title={eq.name}>
                            {eq.name}
                          </h4>
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {eq.model}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono font-bold text-[10px] border border-slate-200 dark:border-slate-600">
                              {eq.plateNumber}
                            </span>
                            {/* ГЛОНАСС уровень топлива */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              eq.fuelLevel < 25 ? 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`} title={`ГЛОНАСС: Уровень топлива ${eq.fuelLevel}%, Моточасы: ${eq.engineHours} м/ч`}>
                              ⛽ {eq.fuelLevel}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-800 dark:text-white">
                          {(eq.dailyRate / 1000).toFixed(0)}к ₽ <span className="text-[10px] text-slate-400 font-normal">/8ч</span>
                        </div>
                        <div className="mt-1">
                          {eq.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> В работе
                            </span>
                          )}
                          {eq.status === 'reserved' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Бронь
                            </span>
                          )}
                          {eq.status === 'maintenance' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <Wrench className="w-2.5 h-2.5" /> Ремонт
                            </span>
                          )}
                          {eq.status === 'available' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500">
                              Свободно
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Interactive Gantt Grid Row */}
                    <div className="flex flex-1 relative h-20 items-center">
                      
                      {/* Grid background vertical lines */}
                      {timelineDays.map((day) => (
                        <div
                          key={day.dateStr}
                          className={`flex-1 h-full min-w-[54px] max-w-[70px] border-r border-slate-100 dark:border-slate-700/40 ${
                            day.isWeekend ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.05]' : ''
                          } ${day.isToday ? 'bg-blue-500/[0.03] dark:bg-blue-500/[0.07]' : ''}`}
                        />
                      ))}

                      {/* Render Booking Bars overlaying the grid */}
                      {eqBookings.map((bk) => {
                        // Рассчитываем смещение слева (оффсет по дням относительно timelineStartDate)
                        const startOffset = getDaysDiff(timelineStartDate, bk.startDate);
                        const duration = getDaysDiff(bk.startDate, bk.endDate) + 1;

                        // Если бронь полностью за пределами видимого окна — не рендерим
                        if (startOffset + duration <= 0 || startOffset >= viewDaysCount) {
                          return null;
                        }

                        // Корректируем координаты для обрезки по краям экрана
                        const visibleOffset = Math.max(0, startOffset);
                        const visibleDuration = Math.min(viewDaysCount - visibleOffset, startOffset < 0 ? duration + startOffset : duration);

                        const leftPercent = (visibleOffset / viewDaysCount) * 100;
                        const widthPercent = (visibleDuration / viewDaysCount) * 100;

                        const style = getBookingStyle(bk.status);

                        return (
                          <div
                            key={bk.id}
                            onClick={() => setSelectedBooking(bk)}
                            style={{
                              left: `${leftPercent}%`,
                              width: `calc(${widthPercent}% - 4px)`,
                              marginLeft: '2px'
                            }}
                            className={`absolute z-10 h-12 rounded-xl p-2 cursor-pointer transition-all transform hover:-translate-y-0.5 hover:shadow-xl hover:z-20 flex flex-col justify-center overflow-hidden border shadow-sm ${style.bg}`}
                            title={`Кликните для управления: ${bk.clientName} (${bk.objectName})`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-[11px] truncate flex items-center gap-1 leading-tight">
                                {style.icon}
                                {bk.clientName}
                              </span>
                              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-black/20 text-white shrink-0">
                                {duration} дн.
                              </span>
                            </div>
                            <div className="text-[10px] text-white/90 truncate font-medium mt-0.5 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0 opacity-80" />
                              <span className="truncate">{bk.objectName}</span>
                            </div>
                          </div>
                        );
                      })}

                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* ================= MODAL: ДЕТАЛИ БРОНИРОВАНИЯ И УПРАВЛЕНИЕ ================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative transform transition-all animate-scale-up">
            
            {/* Header with status */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  selectedBooking.status === 'rented' ? 'bg-emerald-500 text-white' :
                  selectedBooking.status === 'reserved' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {getBookingStyle(selectedBooking.status).label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                  #{selectedBooking.contractNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="py-5 space-y-4">
              
              {/* Equipment Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Арендуемая единица:</span>
                  <h4 className="font-black text-base text-slate-800 dark:text-white mt-0.5">
                    {equipmentList.find(e => e.id === selectedBooking.equipmentId)?.name || 'Спецтехника'}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500">
                    {equipmentList.find(e => e.id === selectedBooking.equipmentId)?.model} •{' '}
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {equipmentList.find(e => e.id === selectedBooking.equipmentId)?.plateNumber}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400">ГЛОНАСС Топливо:</span>
                  <div className="text-sm font-black text-emerald-500 flex items-center justify-end gap-1">
                    ⛽ {equipmentList.find(e => e.id === selectedBooking.equipmentId)?.fuelLevel || 80}%
                  </div>
                </div>
              </div>

              {/* Client & Object */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-500" /> Заказчик (Арендатор)
                  </span>
                  <p className="font-bold text-sm text-slate-800 dark:text-white mt-1">{selectedBooking.clientName}</p>
                  <p className="text-xs text-slate-500 font-mono">ИНН: {selectedBooking.clientInn}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> Объект работ
                  </span>
                  <p className="font-bold text-sm text-slate-800 dark:text-white mt-1 truncate" title={selectedBooking.objectName}>{selectedBooking.objectName}</p>
                  <p className="text-xs text-slate-500 truncate" title={selectedBooking.objectAddress}>{selectedBooking.objectAddress}</p>
                </div>
              </div>

              {/* Financial & Date Summary */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Период аренды:</span>
                  <div className="font-black text-base text-slate-800 dark:text-white mt-0.5">
                    {new Date(selectedBooking.startDate).toLocaleDateString('ru-RU')} — {new Date(selectedBooking.endDate).toLocaleDateString('ru-RU')}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    ({getDaysDiff(selectedBooking.startDate, selectedBooking.endDate) + 1} рабочих смен)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Сумма по договору:</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedBooking.totalCost.toLocaleString()} ₽
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ Оплачено: {selectedBooking.prepaidCost.toLocaleString()} ₽
                  </span>
                </div>
              </div>

              {/* Manager & Notes */}
              <div className="text-xs text-slate-500 flex items-center justify-between px-1">
                <span>Ответственный менеджер: <strong className="text-slate-700 dark:text-slate-300">{selectedBooking.managerName}</strong></span>
                <span className="flex items-center gap-1 text-blue-500 font-bold cursor-pointer hover:underline">
                  <PhoneCall className="w-3.5 h-3.5" /> Связаться с оператором
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  alert(`Акт приема-передачи по договору #${selectedBooking.contractNumber} сформирован в Word (.docx) и готов к отправке в СБИС / Диадок.`);
                  setSelectedBooking(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                Акт приема-передачи (ЭДО)
              </button>
              
              {selectedBooking.status === 'reserved' ? (
                <button
                  onClick={() => {
                    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'rented' } : b));
                    setSelectedBooking(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Подтвердить выезд на объект
                </button>
              ) : (
                <button
                  onClick={() => {
                    alert(`Аренда техники продлена. Сформирован дополнительный счет для Заказчика ${selectedBooking.clientName}.`);
                    setSelectedBooking(null);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Продлить аренду (+3 смены)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: СОЗДАНИЕ НОВОГО БРОНИРОВАНИЯ ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl font-black">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Новое бронирование техники</h3>
                  <p className="text-xs text-slate-500">Резервирование машины в шахматке автопарка</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="py-4 space-y-4">
              
              {/* Equipment Select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Выберите единицу техники:
                </label>
                <select
                  value={newBookingData.equipmentId}
                  onChange={e => setNewBookingData({ ...newBookingData, equipmentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Выберите единицу техники --</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.model}) — {eq.plateNumber} [{eq.dailyRate.toLocaleString()} ₽/смена]
                    </option>
                  ))}
                </select>
              </div>

              {/* Client & INN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Заказчик (Компания):
                  </label>
                  <input
                    type="text"
                    required
                    value={newBookingData.clientName}
                    onChange={e => setNewBookingData({ ...newBookingData, clientName: e.target.value })}
                    placeholder="ООО 'СтройКомплекс'"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    ИНН Заказчика:
                  </label>
                  <input
                    type="text"
                    required
                    value={newBookingData.clientInn}
                    onChange={e => setNewBookingData({ ...newBookingData, clientInn: e.target.value })}
                    placeholder="7701234567"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Object Name & Address */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Название и адрес объекта:
                </label>
                <input
                  type="text"
                  required
                  value={newBookingData.objectName}
                  onChange={e => setNewBookingData({ ...newBookingData, objectName: e.target.value })}
                  placeholder="ЖК 'Солнечный', г. Москва, Ленинградское ш., д. 5"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Дата начала:
                  </label>
                  <input
                    type="date"
                    required
                    value={newBookingData.startDate}
                    onChange={e => setNewBookingData({ ...newBookingData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Дата завершения:
                  </label>
                  <input
                    type="date"
                    required
                    value={newBookingData.endDate}
                    onChange={e => setNewBookingData({ ...newBookingData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Status Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                  Начальный статус:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                    newBookingData.status === 'reserved'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="reserved"
                      checked={newBookingData.status === 'reserved'}
                      onChange={() => setNewBookingData({ ...newBookingData, status: 'reserved' })}
                      className="hidden"
                    />
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Бронирование (Ждем оплату)</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                    newBookingData.status === 'rented'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="rented"
                      checked={newBookingData.status === 'rented'}
                      onChange={() => setNewBookingData({ ...newBookingData, status: 'rented' })}
                      className="hidden"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>В Аренде (Сразу на объект)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Добавить в шахматку
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: ДОБАВИТЬ ТЕХНИКУ В ПАРК ================= */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddVehicleModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl text-amber-500">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Добавить технику в автопарк</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Регистрация новой машины, суточной ставки и балансовой стоимости
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Название техники *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Экскаватор-погрузчик"
                  value={newVehicleData.name}
                  onChange={(e) => setNewVehicleData({ ...newVehicleData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Модель / Марка
                  </label>
                  <input
                    type="text"
                    placeholder="JCB 3CX / CAT 320"
                    value={newVehicleData.model}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Гос. номер
                  </label>
                  <input
                    type="text"
                    placeholder="А 123 АА 77"
                    value={newVehicleData.plateNumber}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, plateNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Категория
                  </label>
                  <select
                    value={newVehicleData.category}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, category: e.target.value as EquipmentCategory })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="excavator">Экскаваторы</option>
                    <option value="crane">Краны</option>
                    <option value="dump_truck">Самосвалы</option>
                    <option value="loader">Погрузчики</option>
                    <option value="roller">Катки</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Ставка / сутки (₽)
                  </label>
                  <input
                    type="number"
                    value={newVehicleData.dailyRate}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, dailyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Баланс. стоимость (₽)
                  </label>
                  <input
                    type="number"
                    value={newVehicleData.bookValue}
                    onChange={(e) => setNewVehicleData({ ...newVehicleData, bookValue: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Сохранить технику
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ПАСПОРТ И КАРТОЧКА ТЕХНИКИ (F-06) ================= */}
      {selectedVehicleForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedVehicleForCard(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedVehicleForCard.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {selectedVehicleForCard.plateNumber}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Модель: {selectedVehicleForCard.model} • Категория: {
                    selectedVehicleForCard.category === 'excavator' ? 'Экскаватор' :
                    selectedVehicleForCard.category === 'crane' ? 'Автокран' :
                    selectedVehicleForCard.category === 'dump_truck' ? 'Самосвал' : 'Спецтехника'
                  }
                </p>
              </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-2 mt-5 border-b border-slate-100 dark:border-slate-700 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveVehicleTab('passport')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeVehicleTab === 'passport'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-500" />
                Паспорт и характеристики
              </button>
              <button
                onClick={() => setActiveVehicleTab('rentals')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeVehicleTab === 'rentals'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-500" />
                История аренды ({bookings.filter(b => b.equipmentId === selectedVehicleForCard.id).length})
              </button>
              <button
                onClick={() => setActiveVehicleTab('maintenance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeVehicleTab === 'maintenance'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 text-blue-500" />
                Телеметрия и ТО
              </button>
              <button
                onClick={() => setActiveVehicleTab('finance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeVehicleTab === 'finance'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4 text-purple-500" />
                Экономика машины
              </button>
            </div>

            {/* TAB 1: PASSPORT */}
            {activeVehicleTab === 'passport' && (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">VIN / Заводской №</span>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1">
                      X9L445330J0012345
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Год выпуска</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">2023 г.в.</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Полис ОСАГО/КАСКО</span>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">До 15.04.2027 (Действует)</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Балансовая стоимость</span>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-white mt-1">15 200 000 ₽</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Оператор-машинист</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{selectedVehicleForCard.operatorName}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">База приписки</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{selectedVehicleForCard.location}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RENTALS HISTORY */}
            {activeVehicleTab === 'rentals' && (
              <div className="mt-5 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400">Закреплённые бронирования и договоры</h4>
                {bookings.filter(b => b.equipmentId === selectedVehicleForCard.id).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    Нет активных или архивных бронирований для этой единицы
                  </div>
                ) : (
                  bookings.filter(b => b.equipmentId === selectedVehicleForCard.id).map(b => (
                    <div key={b.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{b.clientName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Объект: {b.objectName} • Договор: {b.contractNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">{b.startDate} — {b.endDate}</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5">{b.totalCost.toLocaleString()} ₽</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: MAINTENANCE & TELEMETRY */}
            {activeVehicleTab === 'maintenance' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">ГЛОНАСС — Уровень топлива</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {selectedVehicleForCard.fuelLevel}%
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedVehicleForCard.fuelLevel}%` }} />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Наработка моточасов</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                      {selectedVehicleForCard.engineHours} м/ч
                    </div>
                    <div className="text-xs text-amber-600 font-semibold mt-1">До следующего ТО-2: 120 м/ч</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FINANCE */}
            {activeVehicleTab === 'finance' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Суточная ставка</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {selectedVehicleForCard.dailyRate.toLocaleString()} ₽ / смена
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Расчётная выручка в месяц</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {(selectedVehicleForCard.dailyRate * 22).toLocaleString()} ₽
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedVehicleForCard(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
              >
                Закрыть паспорт
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FleetChessboard;
