import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Search, Building2, MapPin, Calculator, Lock, ArrowRight, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_REQUESTS = [
  { id: 1, title: "Аренда гусеничного экскаватора 20т", region: "Самарская обл.", budget: "до 150 000 ₽ / смена", type: "Спецтехника", date: "Сегодня" },
  { id: 2, title: "Субподряд: Устройство мягкой кровли 2000м2", region: "Оренбургская обл.", budget: "до 2 800 000 ₽", type: "Строительство", date: "Сегодня" },
  { id: 3, title: "Закупка: Пшеница 3 класс, 200 тонн", region: "Башкортостан", budget: "Договорная", type: "Агро", date: "Вчера" },
  { id: 4, title: "Производство офисной мебели под ключ", region: "Москва", budget: "до 500 000 ₽", type: "Мебель", date: "Вчера" },
  { id: 5, title: "Аренда автокрана 25т Ивановец", region: "Казань", budget: "от 3 000 ₽ / час", type: "Спецтехника", date: "2 дня назад" },
  { id: 6, title: "Требуется бригада монолитчиков", region: "Уфа", budget: "до 4 500 000 ₽", type: "Строительство", date: "2 дня назад" },
  { id: 7, title: "Закупка семян подсолнечника", region: "Оренбург", budget: "Договорная", type: "Агро", date: "3 дня назад" },
  { id: 8, title: "Поставка ЛДСП (опт)", region: "Самара", budget: "от 800 000 ₽", type: "Производство", date: "3 дня назад" },
];

export const PublicMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogin = () => {
    navigate('/crm/login');
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-100 font-['Inter']">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F0F11]/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-xl font-black font-['Montserrat'] text-white">
              СФЕРУМ<span className="text-cyan-500">.</span>Маркетплейс
            </div>
          </div>
          <button onClick={handleLogin} className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-cyan-600/20">
            Войти в кабинет
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6 uppercase tracking-wider">
          <Globe className="w-4 h-4" /> B2B Биржа Заказов
        </div>
        <h1 className="text-4xl md:text-6xl font-black font-['Montserrat'] tracking-tight text-white mb-6 uppercase">
          Находите <span className="text-cyan-400">клиентов</span> и <span className="text-[#F95700]">подрядчиков</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
          Сотни свежих заявок на субподряды, аренду спецтехники и закупки от проверенных компаний. Регистрируйтесь, чтобы получить доступ к контактам заказчиков.
        </p>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:opacity-100 opacity-50 transition-opacity" />
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-cyan-500 rounded-2xl overflow-hidden shadow-2xl">
            <Search className="w-6 h-6 text-zinc-500 ml-6" />
            <input
              type="text"
              placeholder="Что вы ищете? (например: аренда экскаватора)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none py-5 px-4 text-white placeholder:text-zinc-600 focus:outline-none"
            />
            <button onClick={handleLogin} className="m-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors">
              Найти
            </button>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="pb-24 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Последние заявки ({MOCK_REQUESTS.length})</h2>
          <div className="text-sm text-zinc-500">Обновлено только что</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_REQUESTS.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase())).map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative group overflow-hidden hover:border-cyan-500/30 transition-all hover:shadow-2xl hover:shadow-cyan-500/5 flex flex-col"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
              
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {req.type}
                </span>
                <span className="text-xs text-zinc-500 font-medium">{req.date}</span>
              </div>

              <h3 className="text-xl font-bold text-white mb-4 line-clamp-2 min-h-[56px] leading-tight">
                {req.title}
              </h3>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  {req.region}
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <Calculator className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-400 filter blur-[3px] select-none group-hover:blur-md transition-all">
                    {req.budget}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-400 filter blur-[4px] select-none group-hover:blur-md transition-all">
                    ООО "СпецСтрой"
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/80">
                <button
                  onClick={handleLogin}
                  className="w-full py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-cyan-500/20 border border-zinc-700 group-hover:border-cyan-500/50"
                >
                  <Lock className="w-4 h-4" />
                  Войти чтобы откликнуться
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 bg-gradient-to-br from-cyan-900/40 to-blue-900/20 border border-cyan-800/50 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <h3 className="text-2xl md:text-3xl font-black font-['Montserrat'] text-white mb-4 relative z-10">
            Хотите разместить свою заявку?
          </h3>
          <p className="text-cyan-200/80 mb-8 max-w-xl mx-auto relative z-10">
            Зарегистрируйте свою компанию бесплатно и находите надежных подрядчиков или спецтехнику по всей России без комиссий.
          </p>
          <button
            onClick={handleLogin}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black rounded-xl transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 mx-auto relative z-10"
          >
            Создать аккаунт компании <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
};
