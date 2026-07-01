import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Wallet, 
  Package, 
  LogOut, 
  Gavel, 
  Sun,
  Moon,
  Search
} from 'lucide-react';

export const CommandMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Toggle the menu when ⌘K or Ctrl+K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-200 dark:border-zinc-800 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full flex flex-col bg-transparent">
          <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-4">
            <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mr-2" />
            <Command.Input 
              autoFocus 
              placeholder="Что ищем? (или введите команду)..." 
              className="flex-1 px-2 py-4 text-lg bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0 border-none"
            />
            <div className="hidden sm:flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs text-zinc-500 font-medium">
              ESC
            </div>
          </div>

          <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
            <Command.Empty className="py-12 text-center text-sm text-zinc-500">
              Ничего не найдено. Попробуйте другой запрос.
            </Command.Empty>

            <Command.Group heading="Разделы CRM" className="text-xs font-semibold text-zinc-500 px-2 py-2 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <LayoutDashboard className="mr-3 w-4 h-4" /> Дашборд
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm/clients'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <Users className="mr-3 w-4 h-4" /> Клиенты
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm/objects'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <Building2 className="mr-3 w-4 h-4" /> Объекты
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm/tenders'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <Gavel className="mr-3 w-4 h-4" /> Тендеры
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm/finance'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <Wallet className="mr-3 w-4 h-4" /> Финансы
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/crm/inventory'))} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 aria-selected:text-indigo-600 dark:aria-selected:text-indigo-400 transition-colors"
              >
                <Package className="mr-3 w-4 h-4" /> Склад
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Действия" className="text-xs font-semibold text-zinc-500 px-2 py-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 uppercase tracking-wider">
              <Command.Item 
                onSelect={() => runCommand(toggleTheme)} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/60 transition-colors"
              >
                <Sun className="mr-3 w-4 h-4 hidden dark:block text-amber-500" />
                <Moon className="mr-3 w-4 h-4 block dark:hidden text-indigo-500" />
                Переключить тему
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(async () => { await logout(); navigate('/crm/login'); })} 
                className="flex items-center px-3 py-2.5 mt-1 rounded-lg cursor-pointer text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 aria-selected:bg-red-50 dark:aria-selected:bg-red-900/20 transition-colors"
              >
                <LogOut className="mr-3 w-4 h-4" /> Выход
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
