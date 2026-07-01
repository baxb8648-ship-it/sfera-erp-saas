import React from 'react';
import { motion } from 'framer-motion';
import heroBg from '../assets/industrial_hero_bg.png';

export const Hero: React.FC = () => {
  const scrollToCalc = () => {
    const calcSection = document.getElementById('calc');
    if (calcSection) {
      calcSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-bg">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/60 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F11] via-transparent to-transparent z-10"></div>
        <img
          src={heroBg}
          alt="Industrial СФЕРА Group"
          className="w-full h-full object-cover object-center opacity-30 transform scale-105"
        />
      </div>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-6 relative z-20 w-full py-12 md:py-24">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#F95700]/10 border border-primary/20 mb-8"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full absolute"></span>
            <span className="text-primary font-bold text-[10px] tracking-widest uppercase">
              Технологический регламент СФЕРА
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-6xl md:text-8xl text-white font-black leading-[0.9] mb-8 uppercase tracking-tighter"
          >
            Промышленная <br />
            <span className="bg-gradient-to-r from-white via-gray-300 to-[#71717A] bg-clip-text text-transparent">
              защита и изоляция
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-xl text-gray-300 mb-12 max-w-2xl leading-relaxed font-medium"
          >
            Собственный парк автовышек, мощных компрессоров и безвоздушных станций Graco.
            Работаем 24/7 в 2 смены без простоев. Выполняем весь цикл работ: от подготовки Sa 2.5 до
            нанесения систем «Биурс» и «Унипол».
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <button
              onClick={scrollToCalc}
              className="px-10 py-5 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-sm tracking-widest transition duration-300 transform hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-[#F95700]/20 cursor-pointer"
              style={{
                clipPath: 'polygon(8% 0, 100% 0, 100% 70%, 92% 100%, 0 100%, 0% 30%)',
              }}
            >
              Рассчитать стоимость
            </button>
            <div className="flex items-center px-6 py-4 text-white border border-white/20 font-bold uppercase text-[10px] tracking-widest bg-white/10 backdrop-blur-sm">
              Гарантия мобилизации за 24 часа
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </section>
  );
};
