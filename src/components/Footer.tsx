import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 bg-[#0E0E10] border-t border-border relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand/Legal */}
          <div className="flex flex-col items-center md:items-start leading-none text-center md:text-left">
            <span className="text-text font-black tracking-tighter text-xl block uppercase">СФЕРА</span>
            <span className="text-[7px] text-primary font-bold tracking-[0.3em] uppercase mt-1">
              Промышленная группа
            </span>
            <p className="text-[10px] text-text-muted uppercase font-bold mt-4">
              © {currentYear} ООО «СФЕРА» | ИНН 5629021484 | ОГРН 1225600009480
            </p>
          </div>

          {/* Slogan */}
          <div className="text-center md:text-right">
            <p className="text-[10px] text-gray-700 uppercase tracking-widest font-black italic">
              Промышленное лидерство и технологическая надежность
            </p>
            <p className="text-[9px] text-gray-800 font-bold uppercase tracking-wider mt-1.5">
              Антикоррозийная защита • Гидроизоляция бетона • Сварка
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
