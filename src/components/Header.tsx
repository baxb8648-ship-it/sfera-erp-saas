import React, { useState } from 'react';
import { Menu, X, Phone, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light' ? false : true;
    }
    return true;
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavClick = (id: string) => {
    setIsOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleLogoClick = () => {
    setIsOpen(false);
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="fixed w-full z-50 bg-bg/90 border-b border-border backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-4 cursor-pointer" onClick={handleLogoClick}>
          <div className="flex flex-col leading-none">
            <span className="text-text font-black tracking-tighter text-2xl md:text-3xl block uppercase">СФЕРА</span>
            <span className="text-[8px] md:text-[9px] text-primary font-bold tracking-[0.3em] uppercase mt-0.5">
              Промышленная группа
            </span>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-8 text-[11px] font-black tracking-widest uppercase text-text-muted">
          <button onClick={() => handleNavClick('sectors')} className="hover:text-[#F95700] transition cursor-pointer">
            Отрасли
          </button>
          <button onClick={() => handleNavClick('services')} className="hover:text-[#F95700] transition cursor-pointer">
            Технологии
          </button>
          <button onClick={() => handleNavClick('materials')} className="hover:text-[#F95700] transition cursor-pointer">
            Материалы
          </button>
          <button onClick={() => handleNavClick('standards')} className="hover:text-[#F95700] transition cursor-pointer">
            Регламенты
          </button>
          <button onClick={() => handleNavClick('contacts')} className="hover:text-[#F95700] transition cursor-pointer">
            Контакты
          </button>
        </div>

        {/* Desktop Contact / CTA & Theme Toggle */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <a href="tel:+79636006346" className="text-text font-bold text-lg hover:text-[#F95700] transition flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              8 963 600 63 46
            </a>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
              Оренбург • Самара • Уфа
            </span>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="relative p-2 rounded-full bg-surface border border-border text-text-muted hover:text-primary transition group cursor-pointer"
            aria-label="Toggle theme"
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
            {isDark ? <Sun className="w-5 h-5 relative z-10" /> : <Moon className="w-5 h-5 relative z-10" />}
          </button>
        </div>

        {/* Mobile Toggle & Theme */}
        <div className="md:hidden flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="relative p-2 rounded-full bg-surface border border-border text-text-muted hover:text-primary transition group"
            aria-label="Toggle theme"
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
            {isDark ? <Sun className="w-5 h-5 relative z-10" /> : <Moon className="w-5 h-5 relative z-10" />}
          </button>
          <button onClick={toggleMenu} className="text-text-muted hover:text-text transition focus:outline-none" aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-20 left-0 w-full bg-bg/95 border-b border-border backdrop-blur-xl transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-6 py-8 flex flex-col space-y-6 text-sm font-black tracking-widest uppercase text-text-muted">
          <button onClick={() => handleNavClick('sectors')} className="text-left hover:text-[#F95700] transition">
            Отрасли
          </button>
          <button onClick={() => handleNavClick('services')} className="text-left hover:text-[#F95700] transition">
            Технологии
          </button>
          <button onClick={() => handleNavClick('materials')} className="text-left hover:text-[#F95700] transition">
            Материалы
          </button>
          <button onClick={() => handleNavClick('standards')} className="text-left hover:text-[#F95700] transition">
            Регламенты
          </button>
          <button onClick={() => handleNavClick('contacts')} className="text-left hover:text-[#F95700] transition">
            Контакты
          </button>
          <div className="pt-4 border-t border-border flex flex-col space-y-2">
            <a href="tel:+79636006346" className="text-text font-bold text-lg flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              8 963 600 63 46
            </a>
            <span className="text-[10px] text-text-muted font-bold uppercase">
              Оренбург • Самара • Уфа
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

