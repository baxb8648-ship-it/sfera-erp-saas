import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Bot, CheckCircle2, ChevronRight, SkipForward, Play, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

import { apiClient } from '../../api/client';

export const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Company details & Industry
  const [companyName, setCompanyName] = useState('ЛЕОНИКА');
  const [companyInn, setCompanyInn] = useState('5612080000');
  const [isLookingUpInn, setIsLookingUpInn] = useState(false);
  const [industry, setIndustry] = useState('construction');

  // Step 2: Team
  const [teamEmails, setTeamEmails] = useState(['']);

  // Step 3: Telegram Bot
  const [botToken, setBotToken] = useState('');

  const nextStep = () => {
    if (step === 1 && (!companyName.trim() || !companyInn.trim())) {
      toast.showToast('Пожалуйста, укажите название компании и ИНН', 'error');
      return;
    }
    if (step < 3) setStep(step + 1);
    else handleFinish();
  };

  const handleLookupInn = async () => {
    if (!companyInn || companyInn.length < 10) {
      toast.showToast('Введите корректный ИНН (10 или 12 цифр)', 'error');
      return;
    }
    setIsLookingUpInn(true);
    try {
      const res = await apiClient.get(`/clients/lookup-inn/${companyInn.trim()}`);
      if (res && (res.name || res.full_name)) {
        setCompanyName(res.name || res.full_name);
        toast.showToast(`✅ Реквизиты загружены из ФНС / DaData: ${res.name || res.full_name}`, 'success');
      } else {
        toast.showToast('Организация с таким ИНН не найдена в ФНС', 'error');
      }
    } catch (err: any) {
      toast.showToast(err.message || 'Не удалось выполнить поиск по ИНН', 'error');
    } finally {
      setIsLookingUpInn(false);
    }
  };

  const completeOnboarding = async (chosenSphere: string) => {
    setIsLoading(true);
    try {
      await apiClient.put('/tenants/onboarding', {
        inn: companyInn.trim() || '5612080000',
        name: companyName.trim() || 'ЛЕОНИКА',
        sphere: chosenSphere || 'construction'
      });
      if (botToken && user?.id) {
        await apiClient.put(`/users/${user.id}/telegram`, null, {
          params: { telegram_chat_id: botToken }
        });
      }
      await refetchUser();
      toast.showToast(`Компания «${companyName}» успешно настроена! Добро пожаловать в СФЕРА ERP.`, 'success');
      navigate('/crm');
    } catch (e: any) {
      console.error(e);
      toast.showToast(e.message || 'Ошибка при сохранении настроек', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => completeOnboarding(industry);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0D14] flex flex-col items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E64D00]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        
        {/* Progress header */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((i) => (
            <React.Fragment key={i}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${step >= i ? 'bg-[#E64D00] text-white shadow-lg shadow-[#E64D00]/20' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
              </div>
              {i < 3 && <div className={`w-16 h-1 rounded-full transition-colors ${step > i ? 'bg-[#E64D00]' : 'bg-zinc-200 dark:bg-zinc-800'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-['Montserrat'] text-zinc-900 dark:text-white">Организация и отрасль</h2>
                  <p className="text-zinc-500 mt-1 text-sm">Укажите реквизиты и выберите специфику вашей компании</p>
                </div>

                {/* Реквизиты */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">ИНН компании</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={companyInn}
                          onChange={(e) => setCompanyInn(e.target.value)}
                          placeholder="5612080000"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-[#E64D00]"
                        />
                        <button
                          type="button"
                          onClick={handleLookupInn}
                          disabled={isLookingUpInn}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isLookingUpInn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          ФНС / DaData
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Название организации</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ООО «ЛЕОНИКА»"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-[#E64D00]"
                    />
                  </div>
                </div>

                {/* Отрасль */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Отраслевой профиль платформы</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'construction', label: 'Строительство и подрядчики', desc: 'КС-2, сметы, объекты' },
                      { id: 'agro', label: 'Агропромышленный комплекс', desc: 'Поля, посевы, животноводство' },
                      { id: 'furniture', label: 'Мебельное производство', desc: 'Спецификации BOM, раскрой' },
                      { id: 'beauty', label: 'Салоны Красоты и услуги', desc: 'Онлайн-запись, мастера' },
                      { id: 'fleet', label: 'Аренда спецтехники', desc: 'Парк техники, путевые листы' },
                      { id: 'other', label: 'Универсальная ERP', desc: 'Все базовые модули платформы' },
                    ].map(ind => (
                      <div 
                        key={ind.id} 
                        onClick={() => setIndustry(ind.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${industry === ind.id ? 'border-[#E64D00] bg-orange-50/80 dark:bg-[#E64D00]/10 text-[#E64D00]' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'}`}
                      >
                        <div className="font-bold text-sm">{ind.label}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{ind.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Users className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-['Montserrat'] text-zinc-900 dark:text-white">Пригласите команду</h2>
                  <p className="text-zinc-500 mt-2">Добавьте сотрудников, чтобы начать совместную работу.</p>
                </div>

                <div className="space-y-3">
                  {teamEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => {
                          const newEmails = [...teamEmails];
                          newEmails[idx] = e.target.value;
                          setTeamEmails(newEmails);
                        }}
                        placeholder="email@company.com" 
                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E64D00] text-zinc-900 dark:text-white"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => setTeamEmails([...teamEmails, ''])}
                    className="text-sm font-semibold text-[#E64D00] hover:text-orange-600 px-2 py-1"
                  >
                    + Добавить еще email
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                    <Bot className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-['Montserrat'] text-zinc-900 dark:text-white">Настройка Telegram-бота</h2>
                  <p className="text-zinc-500 mt-2">Укажите токен бота для получения уведомлений и работы с Telegram Mini App.</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-4 mb-6 text-sm text-purple-800 dark:text-purple-300">
                  Создайте бота через @BotFather в Telegram и вставьте полученный токен ниже. Эту настройку можно пропустить и сделать позже.
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Токен Telegram Бота</label>
                  <input 
                    type="text" 
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNO..." 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : completeOnboarding(industry)}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-semibold transition-colors text-sm flex items-center gap-2"
            >
              {step > 1 ? 'Назад' : 'Пропустить всё'}
            </button>
            <div className="flex items-center gap-3">
              {step === 3 && (
                <button 
                  onClick={handleFinish}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-semibold transition-colors text-sm flex items-center gap-1"
                >
                  Пропустить <SkipForward className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={nextStep}
                disabled={isLoading}
                className="px-6 py-3 bg-[#E64D00] hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#E64D00]/20 flex items-center gap-2 disabled:opacity-50"
              >
                {step === 3 ? 'Завершить' : 'Далее'}
                {step === 3 ? <Play className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
