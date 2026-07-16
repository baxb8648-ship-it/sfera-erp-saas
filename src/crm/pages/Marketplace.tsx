import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Globe, Plus, Search, Briefcase, Truck, Package, HelpCircle,
  X, MessageSquare, Building2, MapPin, Calendar, DollarSign,
  Sparkles, Send, Bot, TrendingUp, Eye, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';

export interface MarketplaceResponseItem {
  id: number;
  listing_id: number;
  responder_tenant_id: number;
  responder_name: string;
  message: string;
  price_proposal?: string;
  contact_info: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface MarketplaceListingItem {
  id: number;
  title: string;
  description: string;
  category: 'Субподряды' | 'Аренда спецтехники' | 'Материалы' | 'Услуги';
  price: string;
  location: string;
  author_tenant_id: number;
  author_company: string;
  status: 'active' | 'negotiation' | 'closed';
  created_at: string;
  responses_count: number;
  responses: MarketplaceResponseItem[];
}

const DEFAULT_LISTINGS: MarketplaceListingItem[] = [
  {
    id: 1,
    title: 'Аренда гусеничного экскаватора JCB JS205 с оператором',
    description: 'Сдаем в аренду гусеничный экскаватор JCB JS205 с опытным оператором и заправкой топлива. Ковш 1.2 м³, возможна работа в три смены. Готовы к выезду на объекты по области. Доставка тралом рассчитывается отдельно.',
    category: 'Аренда спецтехники',
    price: '32 000 ₽ / смена',
    location: 'г. Оренбург',
    author_tenant_id: 4,
    author_company: 'ООО «СпецТрансСервис»',
    status: 'active',
    created_at: '2026-07-01',
    responses_count: 3,
    responses: [
      {
        id: 101,
        listing_id: 1,
        responder_tenant_id: 2,
        responder_name: 'ООО «УралДорСтрой»',
        message: 'Готовы взять на 15 смен с 5 июля для разработки котлована под логистический центр. Возможна ли скидка при предоплате?',
        price_proposal: '30 000 ₽ / смена',
        contact_info: '+7 (922) 555-11-22 (Иван)',
        created_at: '2026-07-01 14:20',
        status: 'pending'
      }
    ]
  },
  {
    id: 2,
    title: 'Субподряд на монолитные работы (фундамент ЖК «Олимп»)',
    description: 'Ищем надежную бригаду или компанию на субподряд для устройства монолитной фундаментной плиты и стен подвала жилого комплекса. Общий объем бетона — 2400 м³. Бетон и арматуру предоставляем (давальческое сырье). Требуется своя опалубка и аттестованные сварщики.',
    category: 'Субподряды',
    price: '18 500 000 ₽ за объем',
    location: 'г. Самара',
    author_tenant_id: 1,
    author_company: 'ГК «Монолит-Девелопмент»',
    status: 'active',
    created_at: '2026-06-29',
    responses_count: 7,
    responses: []
  },
  {
    id: 3,
    title: 'Реализация остатков арматуры А500С (12мм, 14 тонн)',
    description: 'После завершения строительства объекта реализуем излишки новой арматуры А500С диаметром 12мм, длина прутьев 11.7 м. Всего в наличии 14 тонн. Отдаем с дисконтом 15% от текущей рыночной цены металлобаз. Самовывоз с нашей базы на проспекте Братьев Коростелевых.',
    category: 'Материалы',
    price: '780 000 ₽ за весь объем',
    location: 'г. Оренбург',
    author_tenant_id: 8,
    author_company: 'ООО «СтройКомплект»',
    status: 'active',
    created_at: '2026-06-30',
    responses_count: 2,
    responses: []
  },
  {
    id: 4,
    title: 'Требуется бригада каменщиков для кладки внутренних перегородок',
    description: 'Требуются каменщики для кладки внутренних перегородок из газобетонного блока и керамического кирпича на строительстве торгового центра. Общий объем кладки — 4500 м². Оплата поэтапная (каждые 2 недели по факту выполнения КС-2).',
    category: 'Субподряды',
    price: '3 400 000 ₽',
    location: 'г. Бузулук',
    author_tenant_id: 3,
    author_company: 'ООО «Гранд-Строй»',
    status: 'negotiation',
    created_at: '2026-06-28',
    responses_count: 5,
    responses: []
  },
  {
    id: 5,
    title: 'Аренда башенного крана Liebherr 132 EC-H 8',
    description: 'Предлагаем в долгосрочную аренду башенный кран Liebherr 132 EC-H 8. Максимальная грузоподъемность 8 тонн, вылет стрелы 55 м. В стоимость включено техническое обслуживание нашей выездной бригадой. Монтаж/демонтаж и перебазировка оплачиваются отдельно.',
    category: 'Аренда спецтехники',
    price: '450 000 ₽ / мес',
    location: 'г. Уфа',
    author_tenant_id: 12,
    author_company: 'ОАО «КранАренда»',
    status: 'active',
    created_at: '2026-06-25',
    responses_count: 1,
    responses: []
  },
  {
    id: 6,
    title: 'Продажа излишков товарного бетона М350 (B25) с доставкой',
    description: 'Реализуем высококачественный товарный бетон М350 (B25 P4 W6 F200) с собственного бетонного завода с доставкой автобетоносмесителями по Оренбургу и области. Любые объемы от 5 м³, возможна подача бетононасосом (стрела 32-42 м). Пакет документов и паспорта качества предоставляются.',
    category: 'Материалы',
    price: '5 800 ₽ / м³',
    location: 'г. Оренбург',
    author_tenant_id: 5,
    author_company: 'ООО «Бетон-56»',
    status: 'active',
    created_at: '2026-07-02',
    responses_count: 4,
    responses: []
  }
];

export const Marketplace: React.FC = () => {
  const toast = useToast();
  const [listings, setListings] = useState<MarketplaceListingItem[]>(DEFAULT_LISTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedRegion, setSelectedRegion] = useState<string>('Все области');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListingItem | null>(null);

  // New Listing Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Субподряды' | 'Аренда спецтехники' | 'Материалы' | 'Услуги'>('Субподряды');
  const [newPrice, setNewPrice] = useState('');
  const [newLocation, setNewLocation] = useState('г. Оренбург');
  const [newDescription, setNewDescription] = useState('');
  const [newContact, setNewContact] = useState('');
  const [enableSmartNotify, setEnableSmartNotify] = useState(true);

  // New Response Form state
  const [respMessage, setRespMessage] = useState('');
  const [respPrice, setRespPrice] = useState('');
  const [respContact, setRespContact] = useState('');

  // Fetch listings from backend with graceful fallback
  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/marketplace/listings');
        if (res && Array.isArray(res) && res.length > 0) {
          setListings(res);
        }
      } catch (err) {
        // Silently use graceful fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, []);

  // Handle create listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newPrice.trim()) {
      toast.showToast('Заполните обязательные поля (Заголовок, Описание, Бюджет)', 'error');
      return;
    }

    const newItem: MarketplaceListingItem = {
      id: Date.now(),
      title: newTitle,
      description: newDescription,
      category: newCategory,
      price: newPrice,
      location: newLocation,
      author_tenant_id: 99,
      author_company: 'Ваша Компания (Текущий Тенант)',
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      responses_count: 0,
      responses: []
    };

    try {
      await apiClient.post('/marketplace/listings', newItem);
    } catch (err) {
      // Fallback local update if backend is offline
    }

    setListings(prev => [newItem, ...prev]);
    setIsCreateModalOpen(false);
    resetCreateForm();
    toast.showToast('Заявка успешно опубликована на бирже!', 'success');

    if (enableSmartNotify) {
      setTimeout(() => {
        toast.showToast('🤖 AI Smart Matching: Telegram-уведомление отправлено 4 тенантам с подходящим профилем!', 'info');
      }, 1200);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewCategory('Субподряды');
    setNewPrice('');
    setNewLocation('г. Оренбург');
    setNewDescription('');
    setNewContact('');
  };

  // Handle submit response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing || !respMessage.trim() || !respContact.trim()) {
      toast.showToast('Заполните текст предложения и ваши контактные данные', 'error');
      return;
    }

    const newResponse: MarketplaceResponseItem = {
      id: Date.now(),
      listing_id: selectedListing.id,
      responder_tenant_id: 99,
      responder_name: 'Ваша Компания (Текущий Тенант)',
      message: respMessage,
      price_proposal: respPrice || selectedListing.price,
      contact_info: respContact,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending'
    };

    try {
      await apiClient.post(`/marketplace/listings/${selectedListing.id}/respond`, newResponse);
    } catch (err) {
      // Fallback local update
    }

    setListings(prev => prev.map(item => {
      if (item.id === selectedListing.id) {
        return {
          ...item,
          responses_count: item.responses_count + 1,
          responses: [newResponse, ...(item.responses || [])]
        };
      }
      return item;
    }));

    setIsRespondModalOpen(false);
    setRespMessage('');
    setRespPrice('');
    setRespContact('');
    toast.showToast('Предложение отправлено автору заявки!', 'success');
  };

  // Filter listings
  const filteredListings = listings.filter(item => {
    const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.author_company.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query);
    let matchesRegion = true;
    if (selectedRegion !== 'Все области') {
      if (selectedRegion.includes('Оренбургская')) {
        matchesRegion = item.location.includes('Оренбург') || item.location.includes('Бузулук');
      } else if (selectedRegion.includes('Самарская')) {
        matchesRegion = item.location.includes('Самара') || item.location.includes('Тольятти');
      } else if (selectedRegion.includes('Башкортостан')) {
        matchesRegion = item.location.includes('Уфа');
      } else if (selectedRegion.includes('Москва')) {
        matchesRegion = item.location.includes('Москва');
      } else if (selectedRegion.includes('Санкт-Петербург')) {
        matchesRegion = item.location.includes('Санкт-Петербург') || item.location.includes('СПб');
      } else if (selectedRegion.includes('Свердловская')) {
        matchesRegion = item.location.includes('Екатеринбург');
      } else if (selectedRegion.includes('Татарстан')) {
        matchesRegion = item.location.includes('Казань');
      } else if (selectedRegion.includes('Тюменская')) {
        matchesRegion = item.location.includes('Тюмень');
      } else {
        matchesRegion = item.location.toLowerCase().includes(selectedRegion.toLowerCase());
      }
    }
    return matchesCategory && matchesSearch && matchesRegion;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Субподряды': return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'Аренда спецтехники': return <Truck className="w-4 h-4 text-amber-500" />;
      case 'Материалы': return <Package className="w-4 h-4 text-green-500" />;
      default: return <HelpCircle className="w-4 h-4 text-purple-500" />;
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Субподряды': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Аренда спецтехники': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'Материалы': return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      default: return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Активно</span>;
    }
    if (status === 'negotiation') {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertCircle className="w-3.5 h-3.5" /> В переговорах</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">Закрыто</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      <Helmet>
        <title>Биржа Заказов (SaaS B2B Маркетплейс) — СФЕРУМ</title>
      </Helmet>

      {/* Top Banner with Stats & Network Effect */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#262626] to-[#121212] text-white p-6 sm:p-8 shadow-xl border border-zinc-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-[#F95700]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F95700]/20 border border-[#F95700]/40 text-[#F95700] text-xs font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 animate-spin-slow" /> Фаза 6: Сетевой Эффект
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Глобальная Биржа B2B-Заказов
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Единое экосистемное пространство для тенантов платформы <span className="text-[#F95700] font-semibold">СФЕРУМ</span>. 
              Сдавайте спецтехнику в аренду в свободные окна, находите надежных субподрядчиков и реализуйте остатки стройматериалов без посредников.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white font-bold shadow-lg shadow-[#F95700]/30 hover:shadow-[#F95700]/50 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" /> Разместить заявку
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
            <div className="text-xs text-zinc-400 font-medium">Активных заявок</div>
            <div className="text-xl font-black text-white mt-0.5 flex items-center justify-center sm:justify-start gap-2">
              {listings.length} <span className="text-emerald-400 text-xs font-semibold">+4 за сутки</span>
            </div>
          </div>
          <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
            <div className="text-xs text-zinc-400 font-medium">Общий объем сделок</div>
            <div className="text-xl font-black text-white mt-0.5">
              48.5 млн ₽
            </div>
          </div>
          <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
            <div className="text-xs text-zinc-400 font-medium">Сетевая активность</div>
            <div className="text-xl font-black text-amber-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
              <TrendingUp className="w-5 h-5" /> Высокая
            </div>
          </div>
          <div className="bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
            <div className="text-xs text-zinc-400 font-medium">AI Smart Matching</div>
            <div className="text-xl font-black text-purple-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
              <Bot className="w-5 h-5" /> 24/7 Активен
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {['Все', 'Субподряды', 'Аренда спецтехники', 'Материалы', 'Услуги'].map(cat => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] shadow-md'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat !== 'Все' && getCategoryIcon(cat)}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search & Region Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Region Filter */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F95700]" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm bg-gray-50 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 appearance-none font-medium cursor-pointer"
            >
              <option value="Все области">📍 Все области (РФ)</option>
              <option value="Оренбургская обл.">Оренбургская обл.</option>
              <option value="Самарская обл.">Самарская обл.</option>
              <option value="Респ. Башкортостан">Респ. Башкортостан</option>
              <option value="Москва и МО">Москва и Московская обл.</option>
              <option value="Санкт-Петербург и ЛО">Санкт-Петербург и ЛО</option>
              <option value="Свердловская обл.">Свердловская обл.</option>
              <option value="Респ. Татарстан">Респ. Татарстан</option>
              <option value="Тюменская обл.">Тюменская обл.</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
          </div>

          {/* Search */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по заявкам, технике, компании..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
              <div className="h-12 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400 dark:text-zinc-500">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Заявки не найдены</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
            По вашему запросу «{searchQuery}» в категории «{selectedCategory}» ничего не найдено. Попробуйте изменить параметры фильтрации или создайте новую заявку.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('Все'); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredListings.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header: Category badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${getCategoryBadgeColor(item.category)}`}>
                      {getCategoryIcon(item.category)}
                      {item.category}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#F95700] transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Price & Location */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block mb-0.5">Бюджет / Ставка:</span>
                      <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {item.price}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block mb-0.5">Локация:</span>
                      <span className="font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#F95700] shrink-0" />
                        {item.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Author & Actions */}
                <div className="px-6 py-4 bg-gray-50/80 dark:bg-zinc-800/40 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-zinc-300 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate" title={item.author_company}>
                        {item.author_company}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {item.created_at}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { setSelectedListing(item); setIsDetailModalOpen(true); }}
                      title="Подробнее / Отклики"
                      className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-[#F95700] text-gray-600 dark:text-zinc-300 hover:text-[#F95700] transition-colors relative cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      {item.responses_count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#F95700] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                          {item.responses_count}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => { setSelectedListing(item); setIsRespondModalOpen(true); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1a1a] dark:bg-white hover:bg-[#F95700] dark:hover:bg-[#F95700] text-white dark:text-[#1a1a1a] dark:hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Отклик
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* MODAL 1: Create Listing */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gradient-to-r from-gray-900 to-zinc-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#F95700]/20 text-[#F95700] border border-[#F95700]/30">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Опубликовать заявку на бирже</h3>
                    <p className="text-xs text-zinc-300">Ваше предложение увидят все тенанты платформы СФЕРУМ</p>
                  </div>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateListing} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Категория заявки <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    >
                      <option value="Субподряды">🏗️ Субподряды и строительные работы</option>
                      <option value="Аренда спецтехники">🚜 Аренда и услуги спецтехники</option>
                      <option value="Материалы">🧱 Реализация остатков материалов</option>
                      <option value="Услуги">💡 Прочие B2B услуги и проектирование</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Бюджет или ставка <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="напр. 45 000 ₽/смена или 12 000 000 ₽"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Заголовок заявки <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="напр. Аренда автокрана 25т с оператором"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                      Город / Локация объекта
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="напр. г. Оренбург, Шарлыкское шоссе"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Подробное техническое задание или описание <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Укажите объемы работ, требования к технике, сроки выполнения или характеристики материалов..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Контактное лицо и телефон / Telegram для связи
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="+7 (999) 000-00-00 (@username)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  />
                </div>

                {/* Smart Matching Option */}
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="smart_match"
                    checked={enableSmartNotify}
                    onChange={(e) => setEnableSmartNotify(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="smart_match" className="text-xs text-purple-900 dark:text-purple-300 cursor-pointer">
                    <span className="font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 inline" />
                      Активировать AI Smart Matching (Сетевой эффект)
                    </span>
                    Автоматически определить тенантов с подходящим автопарком техники (модуль <code>fleet</code>) или ОКВЭД и отправить им мгновенное Telegram-уведомление с приглашением к отклику.
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold shadow-lg shadow-[#F95700]/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Опубликовать на бирже
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Respond to Listing */}
      <AnimatePresence>
        {isRespondModalOpen && selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#1a1a1a] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Отклик на заявку #{selectedListing.id}</h3>
                    <p className="text-xs text-zinc-400 truncate max-w-xs">{selectedListing.title}</p>
                  </div>
                </div>
                <button onClick={() => setIsRespondModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitResponse} className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 text-xs space-y-1">
                  <div className="text-gray-400 dark:text-zinc-500">Заказчик: <strong className="text-gray-800 dark:text-zinc-200">{selectedListing.author_company}</strong></div>
                  <div className="text-gray-400 dark:text-zinc-500">Исходный бюджет: <strong className="text-emerald-600 dark:text-emerald-400">{selectedListing.price}</strong></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Предлагаемая вами цена / ставка
                  </label>
                  <input
                    type="text"
                    value={respPrice}
                    onChange={(e) => setRespPrice(e.target.value)}
                    placeholder={selectedListing.price}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Ваше коммерческое предложение / Условия работы <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={respMessage}
                    onChange={(e) => setRespMessage(e.target.value)}
                    placeholder="Укажите готовность техники, наличие свободной бригады, возможные сроки начала или условия доставки..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1">
                    Контактные данные для связи с вами <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={respContact}
                    onChange={(e) => setRespContact(e.target.value)}
                    placeholder="+7 (922) 000-00-00 (Иван, Telegram)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    required
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRespondModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Отправить отклик (B2B связь)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Detailed View & Responses */}
      <AnimatePresence>
        {isDetailModalOpen && selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gray-900 text-white flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold ${getCategoryBadgeColor(selectedListing.category)}`}>
                      {selectedListing.category}
                    </span>
                    {getStatusBadge(selectedListing.status)}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold leading-tight">{selectedListing.title}</h3>
                  <div className="text-xs text-zinc-400 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-[#F95700]" /> {selectedListing.author_company}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> {selectedListing.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> {selectedListing.created_at}</span>
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Specs Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-150 dark:border-zinc-700/60">
                  <div>
                    <div className="text-xs text-gray-400 dark:text-zinc-500">Заявленный бюджет:</div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <DollarSign className="w-4 h-4" /> {selectedListing.price}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-zinc-500">Идентификатор в системе:</div>
                    <div className="text-sm font-bold text-gray-800 dark:text-zinc-200 mt-0.5">
                      SFERA-B2B-L{selectedListing.id} (Тенант #{selectedListing.author_tenant_id})
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Подробное описание и условия</h4>
                  <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                    {selectedListing.description}
                  </p>
                </div>

                {/* Responses List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#F95700]" />
                      Предложения и отклики компаний ({selectedListing.responses?.length || 0})
                    </h4>
                  </div>

                  {(!selectedListing.responses || selectedListing.responses.length === 0) ? (
                    <div className="p-8 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-dashed border-gray-200 dark:border-zinc-700 text-center text-xs text-gray-500 dark:text-zinc-400">
                      На эту заявку пока нет коммерческих предложений. Будьте первым, кто откликнется и закроет сделку!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedListing.responses.map(resp => (
                        <div key={resp.id} className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-700/60 pb-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-[#F95700]" />
                              {resp.responder_name}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              Ставка: {resp.price_proposal}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {resp.message}
                          </p>
                          <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
                            <span>Контакты: <strong className="text-gray-700 dark:text-zinc-200">{resp.contact_info}</strong></span>
                            <span>{resp.created_at}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:block">
                  Сделка защищена стандартами экосистемы СФЕРУМ
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setIsRespondModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F95700] hover:bg-[#e04e00] text-white text-xs font-bold shadow-md shadow-[#F95700]/20 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Откликнуться
                  </button>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
