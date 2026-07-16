import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { 
  Search, Loader2, HardHat, Scissors, Tractor, 
  Wrench, Sparkles, Check, ChevronRight, Copy, Users, Zap, Hammer
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SPHERES = [
  { id: 'construction', label: 'Строительство', icon: HardHat, desc: 'Объекты, КС-2/3, Снабжение' },
  { id: 'beauty', label: 'Услуги и Салоны', icon: Scissors, desc: 'Запись, Мастера, Услуги' },
  { id: 'agro', label: 'Агропромышленность', icon: Tractor, desc: 'Поля, Севооборот, Техника' },
  { id: 'fleet', label: 'Аренда спецтехники', icon: Wrench, desc: 'Автопарк, ТОиР, Механики' },
  { id: 'furniture', label: 'Мебельное пр-во', icon: Hammer, desc: 'Сборка, Детали, Склад' },
  { id: 'generic', label: 'Универсальная CRM', icon: Zap, desc: 'Продажи, Счета, Задачи' },
];

export const SetupWizard: React.FC = () => {
  const { refetchUser } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [inn, setInn] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyData, setCompanyData] = useState<{
    name: string;
    full_name: string;
    director: string;
  } | null>(null);
  
  const [selectedSphere, setSelectedSphere] = useState<string>('generic');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a mock invite link based on current domain
    const domain = window.location.origin;
    setInviteLink(`${domain}/#/register?invite=${Math.random().toString(36).substring(2, 10)}`);
  }, []);

  const handleInnSearch = async (value: string) => {
    setInn(value);
    if (value.length === 10 || value.length === 12) {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/tenants/suggest/${value}`);
        setCompanyData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setCompanyData(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      await apiClient.put('/tenants/onboarding', {
        inn: inn || '0000000000',
        name: companyData?.name || 'Новая Компания',
        sphere: selectedSphere
      });
    },
    onSuccess: async () => {
      await refetchUser();
      navigate('/crm'); // Reload dashboard
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md overflow-y-auto py-10 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden relative"
      >
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 opacity-10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row h-full min-h-[600px]">
          {/* Left Sidebar - Progress */}
          <div className="w-full md:w-72 bg-zinc-50 border-r border-zinc-100 p-8 flex flex-col justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-12">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-zinc-900">СФЕРУМ</span>
              </div>

              <div className="space-y-8 relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-zinc-200" />
                
                {[
                  { num: 1, title: 'Профиль компании' },
                  { num: 2, title: 'Выбор ниши' },
                  { num: 3, title: 'Команда' }
                ].map((s) => (
                  <div key={s.num} className="relative flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors relative z-10 bg-zinc-50
                      ${step > s.num ? 'border-indigo-600 bg-indigo-600 text-white' : 
                        step === s.num ? 'border-indigo-600 text-indigo-600' : 'border-zinc-300 text-zinc-400'}`}
                    >
                      {step > s.num ? <Check className="w-4 h-4" /> : <span className="text-sm font-semibold">{s.num}</span>}
                    </div>
                    <span className={`font-medium ${step >= s.num ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-12 text-sm text-zinc-400">
              Помощь нужна? <br />
              <a href="#" className="text-indigo-600 hover:underline">Свяжитесь с поддержкой</a>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-8 md:p-12 relative z-10 flex flex-col">
            <AnimatePresence mode="wait">
              {/* STEP 1: Company Profile */}
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1"
                >
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2">Настройка профиля</h2>
                  <p className="text-zinc-500 mb-8 text-lg">Введите ИНН вашей компании, мы заполним остальное.</p>

                  <div className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">ИНН Компании или ИП</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-zinc-400" />
                        </div>
                        <input
                          type="text"
                          value={inn}
                          onChange={(e) => handleInnSearch(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="Например, 7707083893"
                          className="block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow text-lg"
                        />
                        {isSearching && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {companyData && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 space-y-3"
                        >
                          <div>
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Краткое наименование</span>
                            <p className="font-medium text-zinc-900">{companyData.name}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Полное наименование</span>
                            <p className="text-sm text-zinc-700">{companyData.full_name}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Руководитель</span>
                            <p className="text-sm text-zinc-700">{companyData.director}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Niche Selection */}
              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2">Выберите вашу нишу</h2>
                  <p className="text-zinc-500 mb-8 text-lg">Мы адаптируем боковое меню и модули под ваш бизнес.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SPHERES.map((sphere) => {
                      const Icon = sphere.icon;
                      const isSelected = selectedSphere === sphere.id;
                      return (
                        <button
                          key={sphere.id}
                          onClick={() => setSelectedSphere(sphere.id)}
                          className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 group
                            ${isSelected ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-4 ring-indigo-600/10' : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50'}
                          `}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors
                            ${isSelected ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-indigo-900' : 'text-zinc-900'}`}>
                            {sphere.label}
                          </h3>
                          <p className={`text-sm ${isSelected ? 'text-indigo-700/70' : 'text-zinc-500'}`}>
                            {sphere.desc}
                          </p>
                          {isSelected && (
                            <div className="absolute top-4 right-4 text-indigo-600">
                              <Check className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Team & Finish */}
              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2">Почти готово!</h2>
                  <p className="text-zinc-500 mb-8 text-lg">Пригласите свою команду, чтобы начать работу вместе.</p>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 max-w-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Users className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-zinc-900">Ссылка для приглашения</h3>
                    </div>
                    
                    <p className="text-sm text-zinc-500 mb-4">
                      Отправьте эту ссылку своим сотрудникам. Они смогут зарегистрироваться и сразу попасть в ваше рабочее пространство.
                    </p>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={inviteLink}
                        className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-600 focus:outline-none"
                      />
                      <button 
                        onClick={copyToClipboard}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors
                          ${copied ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Actions */}
            <div className="mt-auto pt-8 border-t border-zinc-100 flex items-center justify-between">
              {step > 1 ? (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 rounded-xl font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  Назад
                </button>
              ) : (
                <div /> // Spacer
              )}
              
              {step < 3 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!inn || inn.length < 10)}
                  className="px-8 py-3 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => completeOnboarding.mutate()}
                  disabled={completeOnboarding.isPending}
                  className="px-8 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  {completeOnboarding.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Завершить настройку
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
