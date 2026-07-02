import React, { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
          <button onClick={() => handleNavClick('platform')} className="hover:text-[#E64D00] transition cursor-pointer">
            Платформа
          </button>
          <button onClick={() => handleNavClick('solutions')} className="hover:text-[#E64D00] transition cursor-pointer">
            Решения
          </button>
          <button onClick={() => handleNavClick('integrations')} className="hover:text-[#E64D00] transition cursor-pointer">
            Интеграции
          </button>
          <button onClick={() => handleNavClick('security')} className="hover:text-[#E64D00] transition cursor-pointer">
            Безопасность
          </button>
        </div>

        {/* Desktop Contact / CTA & Theme Toggle */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => navigate('/crm/login')}
            className="px-4 py-2 rounded-xl bg-transparent hover:bg-surface border border-border text-xs font-bold text-text transition cursor-pointer"
          >
            Войти в ERP
          </button>
          <button
            onClick={() => {
              if (location.pathname === '/') {
                const el = document.getElementById('fns-onboard');
                el?.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/crm/login?tab=register');
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#E64D00] hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-[#E64D00]/20"
          >
            Регистрация B2B
          </button>
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-[#0A0D14] border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col space-y-6 text-sm font-black tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
              <button onClick={() => handleNavClick('platform')} className="text-left hover:text-[#E64D00] transition">
                Платформа
              </button>
              <button onClick={() => handleNavClick('solutions')} className="text-left hover:text-[#E64D00] transition">
                Решения
              </button>
              <button onClick={() => handleNavClick('integrations')} className="text-left hover:text-[#E64D00] transition">
                Интеграции
              </button>
              <button onClick={() => handleNavClick('security')} className="text-left hover:text-[#E64D00] transition">
                Безопасность
              </button>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col space-y-3">
                <button
                  onClick={() => { setIsOpen(false); navigate('/crm/login'); }}
                  className="w-full py-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs font-bold text-zinc-900 dark:text-white transition cursor-pointer"
                >
                  Войти в ERP
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/crm/login?tab=register');
                  }}
                  className="w-full py-4 bg-[#E64D00] hover:bg-[#CC4400] text-center text-white text-xs font-bold transition cursor-pointer shadow-lg"
                >
                  Регистрация B2B
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

