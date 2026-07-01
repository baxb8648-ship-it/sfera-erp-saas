import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Globe, MapPin, Download, ShieldCheck, User } from 'lucide-react';

interface SettingsData {
  company_name: string;
  company_subtitle: string;
  company_legal_name: string;
  company_inn: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_website_url: string;
  company_regions: string;
  company_director: string;
}

export const ContactLanding: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveContact = () => {
    if (!settings) return;

    const directorName = settings.company_director || "Леонтьев А.В.";
    const orgName = settings.company_legal_name || 'ООО "СФЕРА"';
    const phone = settings.company_phone || '+7 (3532) 99-88-77';
    const email = settings.company_email || 'info@sphera-akz.ru';
    const url = settings.company_website_url || 'https://леоника56.рф';
    const address = settings.company_address || 'г. Оренбург, ул. Монтажников, д. 22';

    // Parse LastName / FirstName for vCard N field
    let lastName = directorName;
    let firstName = '';
    const parts = directorName.split(' ');
    if (parts.length >= 2) {
      lastName = parts[0];
      firstName = parts.slice(1).join(' ');
    }

    // Build vCard string
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${directorName}`,
      `ORG:${orgName}`,
      'TITLE:Генеральный директор',
      `TEL;TYPE=CELL,VOICE:${phone}`,
      `EMAIL;TYPE=PREF,INTERNET:${email}`,
      `URL:${url}`,
      `ADR;TYPE=WORK:;;${address};;;;`,
      'END:VCARD'
    ].join('\r\n');

    // Create file blob and trigger download
    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${orgName.replace(/["\s]/g, '_')}_contact.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#F95700] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest font-semibold">Загрузка контактов...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 p-6 text-center">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Ошибка загрузки</h2>
          <p className="text-sm text-zinc-500">Не удалось загрузить контактные данные. Пожалуйста, попробуйте позже.</p>
        </div>
      </div>
    );
  }

  const brandName = settings.company_name || "СФЕРА";
  const slogan = settings.company_subtitle || "Промышленная группа";

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between relative overflow-hidden font-['Inter']">
      {/* Dynamic backgrounds */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#F95700]/10 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#F95700]/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Main Container */}
      <div className="w-full max-w-md mx-auto px-6 pt-12 pb-8 flex-1 flex flex-col justify-between relative z-10">
        
        {/* Branding header */}
        <div className="text-center space-y-2 mt-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter uppercase font-['Montserrat'] text-white"
          >
            {brandName}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs tracking-[0.25em] font-bold text-[#F95700] uppercase"
          >
            {slogan}
          </motion.p>
          
          <div className="flex items-center justify-center gap-1.5 pt-3">
            <span className="flex items-center justify-center w-4 h-4 bg-green-500/10 text-green-400 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Подтвержденный контакт</span>
          </div>
        </div>

        {/* Contact Card Visualizer */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="my-10 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative"
        >
          {/* Accent border strip */}
          <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#F95700] to-transparent" />

          {/* Director details */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <User className="w-6 h-6 text-[#F95700]" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-white">{settings.company_director}</h3>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Генеральный директор</p>
            </div>
          </div>

          {/* Contact details list */}
          <div className="space-y-4">
            
            {/* Phone */}
            <a 
              href={`tel:${settings.company_phone}`}
              className="flex items-center gap-4 p-3 bg-zinc-950/40 hover:bg-zinc-800/40 border border-zinc-850 rounded-xl transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F95700]">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Телефон</span>
                <span className="text-xs font-bold font-mono text-zinc-200 block truncate">{settings.company_phone}</span>
              </div>
            </a>

            {/* Email */}
            <a 
              href={`mailto:${settings.company_email}`}
              className="flex items-center gap-4 p-3 bg-zinc-950/40 hover:bg-zinc-800/40 border border-zinc-850 rounded-xl transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F95700]">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Email</span>
                <span className="text-xs font-bold text-zinc-200 block truncate">{settings.company_email}</span>
              </div>
            </a>

            {/* Website */}
            <a 
              href={settings.company_website_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-3 bg-zinc-950/40 hover:bg-zinc-800/40 border border-zinc-850 rounded-xl transition-all group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F95700]">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Сайт</span>
                <span className="text-xs font-bold text-[#F95700] block truncate">{settings.company_website}</span>
              </div>
            </a>

            {/* Address */}
            <div 
              className="flex items-center gap-4 p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F95700]">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Адрес офиса</span>
                <span className="text-xs font-medium text-zinc-300 block">{settings.company_address}</span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Action Button: Save Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 text-center mt-auto"
        >
          <button
            onClick={handleSaveContact}
            className="w-full py-4 bg-[#F95700] hover:bg-[#E04D00] text-white text-sm font-bold uppercase tracking-widest transition-all rounded-xl shadow-lg shadow-[#F95700]/25 flex items-center justify-center gap-2 select-none cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4 animate-bounce" /> Добавить в контакты
          </button>
          
          <div className="text-[10px] text-zinc-500 font-medium">
            * Нажмите кнопку выше для автоматического импорта визитки в контакты вашего телефона.
          </div>
        </motion.div>

      </div>

      {/* Footer copyright */}
      <div className="w-full border-t border-zinc-900 py-4 text-center text-[9px] font-bold text-zinc-650 uppercase tracking-widest mt-auto z-10">
        © {new Date().getFullYear()} {settings.company_legal_name}
      </div>
    </div>
  );
};
