import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Database, Award, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type SectorKey = 'industrial' | 'municipal' | 'commercial' | 'agro';

interface SectorData {
  title: string;
  badge: string;
  desc: string;
  features: string[];
  btnText: string;
  icon: React.ReactNode;
  image: string;
  metric: string;
}

export const Sectors: React.FC = () => {
  const [activeSector, setActiveSector] = useState<SectorKey>('industrial');

  const sectorData: Record<SectorKey, SectorData> = {
    industrial: {
      title: 'Промышленные объекты',
      badge: 'Газпром • Роснефть • ОПО',
      desc: 'Броня для ваших активов. Эталонная антикоррозийная и огнезащита ОПО, РВС и трубопроводов с тотальным приборным контролем и сдачей с первого раза.',
      features: [
        'Очистка металла Sa 2.5 / Sa 3',
        'Двухкомпонентные броне-системы',
        'Сплошной инструментальный контроль',
      ],
      btnText: 'Регламент работ и допуски',
      icon: <ShieldCheck className="w-10 h-10 text-primary" />,
      image: '/images/industrial_painting_tank_1780944141190.png',
      metric: 'ДВОЙНОЙ УЗК КОНТРОЛЬ'
    },
    municipal: {
      title: 'Госзаказы и Подряд',
      badge: 'Казначейское сопровождение',
      desc: 'Точная сдача день в день без срыва сроков. Выполняем огнезащиту и АКЗ городской инфраструктуры строго по сметам ФЕР/ТЕР с подготовкой ИД.',
      features: [
        'Тендерная папка за 24 часа',
        'Сметы в Гранд-Смете',
        'Сдача в МЧС с первого раза',
      ],
      btnText: 'Подготовка тендерной папки',
      icon: <Database className="w-10 h-10 text-primary" />,
      image: '/images/industrial_fire_protection_1780944153023.png',
      metric: 'СДАЧА С ПЕРВОГО РАЗА'
    },
    commercial: {
      title: 'Коммерческий сектор',
      badge: 'B2B Контракты • Склады',
      desc: 'Выводим объекты на проектную мощность быстрее конкурентов. Безвоздушная окраска складов класса А до 1500 м² за смену без остановки конвейера.',
      features: [
        'Скорость 1500 м² за смену',
        'Абсолютная автономность',
        'Фиксация цены в договоре',
      ],
      btnText: 'Расчет коммерческого КП',
      icon: <Award className="w-10 h-10 text-primary" />,
      image: '/images/industrial_workers_1780944176565.png',
      metric: '1500 м² / СМЕНА'
    },
    agro: {
      title: 'Агропромышленность',
      badge: 'Элеваторы • Зернохранилища',
      desc: 'Надежная защита урожая от потерь. Ликвидируем конденсат, сырость и перепады температур бесшовной теплоизоляцией с пищевым допуском.',
      features: [
        'Тотальная ликвидация конденсата',
        'Пищевой допуск материалов',
        'Термоконтур без мостиков холода',
      ],
      btnText: 'Регламент теплоизоляции',
      icon: <Check className="w-10 h-10 text-primary" />,
      image: '/images/agro_silo.png',
      metric: 'ПИЩЕВОЙ ДОПУСК'
    },
  };

  const current = sectorData[activeSector];

  return (
    <section id="sectors" className="py-32 bg-surface relative border-b border-border overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-64 w-[600px] h-[600px] bg-[#FF7426]/5 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary uppercase tracking-[0.2em] text-[10px] sm:text-xs font-black mb-4"
          >
            Индивидуальные решения
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-text mb-6 uppercase tracking-tight"
          >
            Профильные <span className="text-primary">направления</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-muted text-sm sm:text-base md:text-lg leading-relaxed font-medium"
          >
            Адаптация технологического процесса под строгие регламенты вашего сегмента. От опасных производственных объектов до сельскохозяйственных элеваторов.
          </motion.p>
        </div>

        {/* Improved Tab Navigation (Clear & Obvious) */}
        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {(Object.keys(sectorData) as SectorKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveSector(key)}
              className={`relative px-8 py-5 flex items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden group ${
                activeSector === key
                  ? 'bg-primary border-primary shadow-[0_0_40px_rgba(249,87,0,0.3)]'
                  : 'bg-bg border-border hover:border-primary/50'
              } border`}
            >
              <span className={`relative z-10 font-black text-xs sm:text-sm tracking-widest uppercase transition-colors duration-300 ${
                activeSector === key ? 'text-white' : 'text-text-muted group-hover:text-text'
              }`}>
                {sectorData[key].title}
              </span>
              {activeSector === key && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-primary to-[#FF7426] z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Bento Box Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Info Box */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSector}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-bg border border-border p-8 sm:p-12 h-full flex flex-col relative overflow-hidden group"
              >
                {/* Subtle gradient glow inside box */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-all duration-700"></div>

                <div className="relative z-10 flex-grow">
                  <div className="inline-flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-surface border border-border rounded-xl shadow-lg">
                      {current.icon}
                    </div>
                    <span className="text-xs font-black text-primary tracking-[0.15em] uppercase border-b border-primary/30 pb-1">
                      {current.badge}
                    </span>
                  </div>
                  
                  <h3 className="text-3xl sm:text-4xl text-text font-black mb-6 uppercase tracking-tight leading-tight">
                    {current.title}
                  </h3>
                  
                  <p className="text-base sm:text-lg text-text-muted mb-10 leading-relaxed font-medium max-w-2xl">
                    {current.desc}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-6 mb-12">
                    {current.features.map((feat, index) => (
                      <div key={index} className="flex items-start space-x-4 bg-surface p-5 border border-border/50 hover:border-primary/30 transition-colors duration-300">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-bold text-text uppercase tracking-wide leading-relaxed">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 pt-8 border-t border-border">
                  <Link
                    to={`/sectors/${activeSector}`}
                    className="inline-flex items-center justify-center gap-4 px-10 py-5 bg-text text-bg hover:bg-primary hover:text-white font-black uppercase text-xs tracking-[0.2em] transition-all duration-300 group/btn"
                  >
                    <span>{current.btnText}</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Image & Metric Boxes (Right Side Bento) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSector}-img`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full flex-grow min-h-[400px] lg:min-h-0 bg-bg border border-border relative overflow-hidden group"
              >
                <img 
                  src={current.image} 
                  alt={current.title}
                  className="w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000"
                />
                {/* Overlay gradient for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent"></div>
              </motion.div>
            </AnimatePresence>

            {/* Glassmorphic Metric Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSector}-metric`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                className="bg-surface/80 backdrop-blur-xl border border-border p-8 relative overflow-hidden"
              >
                {/* Abstract pattern inside metric card */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                  <svg viewBox="0 0 100 100" fill="currentColor" className="text-primary w-full h-full">
                    <path d="M0,0 L100,0 L100,100 Z" />
                  </svg>
                </div>
                
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mb-3 block">
                  Стандарт качества
                </span>
                <span className="text-2xl sm:text-3xl text-text font-black uppercase tracking-tight block leading-tight">
                  {current.metric}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>
      </div>
    </section>
  );
};
