import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Sparkles, CheckCircle2, ArrowRight, 
  Bot, Smartphone, CreditCard, BarChart3, Package, 
  Globe, Lock, Check
} from 'lucide-react';
import { motion } from 'framer-motion';

export const SaaSLanding: React.FC = () => {
  const navigate = useNavigate();
  const [innInput, setInnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    full_name: string;
    address: string;
    director: string;
    ogrn?: string;
    kpp?: string;
  } | null>(null);
  const [searchError, setSearchError] = useState('');

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Live FNS search debounce
  useEffect(() => {
    if (innInput.length !== 10 && innInput.length !== 12) {
      setCompanyInfo(null);
      setSearchError('');
      return;
    }

    const fetchFns = async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`${baseUrl}/tenants/suggest/${innInput}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.name) {
            setCompanyInfo(data);
          } else {
            setCompanyInfo(null);
            setSearchError('Компания не найдена в реестре ЕГРЮЛ/ЕГРИП');
          }
        } else {
          setCompanyInfo(null);
          setSearchError('Не удалось проверить ИНН в реестре ФНС');
        }
      } catch (err) {
        console.error('FNS search error:', err);
        setSearchError('Ошибка связи с сервером проверки реквизитов');
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchFns, 400);
    return () => clearTimeout(timer);
  }, [innInput, baseUrl]);

  const handleStartRegistration = () => {
    if (innInput && (innInput.length === 10 || innInput.length === 12)) {
      navigate(`/crm/login?tab=register&inn=${innInput}`);
    } else {
      navigate('/crm/login?tab=register');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] text-zinc-100 selection:bg-[#F95700]/30 font-['Inter'] overflow-hidden">
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#F95700]/20 to-orange-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-semibold text-zinc-300 mb-8 backdrop-blur-md shadow-inner"
        >
          <span className="w-2 h-2 rounded-full bg-[#F95700] animate-ping" />
          <span className="text-[#F95700]">СФЕРА ERP 2.0</span>
          <span className="text-zinc-600">|</span>
          <span>Мультитенантная SaaS-экосистема для B2B</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black font-['Montserrat'] tracking-tight max-w-5xl leading-[1.08] uppercase text-white mb-6"
        >
          Управление бизнесом <br />
          <span className="bg-gradient-to-r from-[#F95700] via-orange-400 to-amber-200 bg-clip-text text-transparent">
            в единой Сфере
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-zinc-400 max-w-3xl font-normal leading-relaxed mb-10"
        >
          Интеллектуальная облачная ERP с векторным ИИ (Pinecone RAG), нативным Telegram Mini App для объектов и автоматизированным биллингом. Герметичная защита коммерческой тайны через Row-Level Security.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={() => {
              const el = document.getElementById('fns-onboard');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base shadow-lg shadow-[#F95700]/25 hover:shadow-[#F95700]/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>Зарегистрировать компанию по ИНН</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/crm/login')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Войти в личный кабинет</span>
          </button>
        </motion.div>

        {/* Live Status Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-4xl border-t border-zinc-800/80 pt-10 text-zinc-400 text-sm">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F95700]" />
            <span>Интеграция с ФНС России</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F95700]" />
            <span>Neon PostgreSQL + RLS</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F95700]" />
            <span>Telegram Mini App (TMA)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#F95700]" />
            <span>AI RAG База знаний</span>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE B2B FNS ONBOARDING WIDGET ================= */}
      <section id="fns-onboard" className="py-20 px-6 max-w-5xl mx-auto relative z-10">
        <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-[#F95700]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/60 border border-orange-800/50 text-[#F95700] text-xs font-bold mb-4 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Онлайн B2B-Регистрация
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-['Montserrat'] text-white mb-3">
              Мгновенный старт по ИНН
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Вам не нужно вручную вводить реквизиты. Введите 10 или 12 цифр ИНН вашей организации — СФЕРА автоматически запросит данные в реестре ЕГРЮЛ/ЕГРИП и подготовит профиль компании.
            </p>
          </div>

          {/* INN Search Box */}
          <div className="max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Building2 className="absolute left-4 w-6 h-6 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                maxLength={12}
                value={innInput}
                onChange={(e) => setInnInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Введите ИНН (например: 5610248560)"
                className="w-full pl-13 pr-32 py-4 bg-zinc-950/80 border-2 border-zinc-800 focus:border-[#F95700] rounded-2xl text-white text-lg font-mono placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner"
              />
              <div className="absolute right-3 flex items-center gap-2">
                {isSearching ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-xl text-xs text-zinc-300">
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#F95700] rounded-full animate-spin" />
                    <span>ФНС...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleStartRegistration}
                    className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-md"
                  >
                    Далее
                  </button>
                )}
              </div>
            </div>

            {searchError && (
              <div className="mt-3 text-red-400 text-xs text-center font-medium bg-red-950/30 py-2 rounded-xl border border-red-900/40">
                {searchError}
              </div>
            )}
          </div>

          {/* Bento Card Live Preview from FNS */}
          {companyInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-8 max-w-xl mx-auto bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-orange-950/20 border border-orange-500/30 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#F95700] uppercase tracking-widest bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                    Проверено ФНС
                  </span>
                  <h3 className="text-xl font-bold font-['Montserrat'] text-white mt-2">
                    {companyInfo.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{companyInfo.full_name}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 text-[#F95700]">
                  <Check className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px] uppercase mb-1">Руководитель</span>
                  <span className="font-semibold text-zinc-200">{companyInfo.director || 'Не указан'}</span>
                </div>
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px] uppercase mb-1">ИНН / ОГРН</span>
                  <span className="font-semibold text-zinc-200 font-mono">{innInput} {companyInfo.ogrn ? `/ ${companyInfo.ogrn}` : ''}</span>
                </div>
                <div className="sm:col-span-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
                  <span className="text-zinc-500 block text-[10px] uppercase mb-1">Юридический адрес</span>
                  <span className="font-semibold text-zinc-200">{companyInfo.address}</span>
                </div>
              </div>

              <button
                onClick={handleStartRegistration}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#F95700] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>Создать облачную ERP для этой компании</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {!companyInfo && !isSearching && (
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-zinc-500 font-medium">
              <span>Пример ИНН: <button onClick={() => setInnInput('5610248560')} className="text-zinc-400 underline hover:text-[#F95700] cursor-pointer">5610248560</button> (ООО ЛЕОНИКА)</span>
              <span>•</span>
              <span>Или <button onClick={handleStartRegistration} className="text-[#F95700] hover:underline cursor-pointer font-bold">заполнить форму вручную ➔</button></span>
            </div>
          )}
        </div>
      </section>

      {/* ================= BENTO GRID FEATURES ================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-black font-['Montserrat'] uppercase tracking-tight text-white mb-4">
            Архитектура <span className="text-[#F95700]">превосходства</span>
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Всё, что нужно для полного контроля над проектами, финансами и техникой, собрано в одной модульной платформе.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: RAG AI */}
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 sm:p-10 hover:border-orange-500/40 transition-all group relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#F95700]/10 rounded-full blur-3xl group-hover:bg-[#F95700]/20 transition-all pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#F95700] mb-6">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-white mb-3">
              ИИ-Ассистент и Векторная база знаний (RAG)
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              Интеграция Pinecone и локальных нейросетей позволяет мгновенно находить ответы по нормативным документам (ГОСТ, СНиП), анализировать сметы и предсказывать риски в договорах заказчиков без утечки в публичные облака.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Pinecone VectorDB</span>
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Ollama Qwen 2.5</span>
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Анализ договоров</span>
            </div>
          </div>

          {/* Card 2: TMA */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 hover:border-orange-500/40 transition-all group relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-white mb-3">
              Telegram Mini App
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Полноценное CRM-приложение внутри Telegram для прорабов и мастеров. Фотоотчеты со стройплощадок, свайп задач и виброотклик Haptic Feedback без установки тяжелых приложений.
            </p>
          </div>

          {/* Card 3: RLS Security */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 hover:border-orange-500/40 transition-all group relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-white mb-3">
              Изоляция данных (RLS)
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Архитектура Row-Level Security на PostgreSQL Neon гарантирует 100% герметичность данных каждой компании-арендатора. Никаких пересечений клиентских баз.
            </p>
          </div>

          {/* Card 4: Billing & Docx */}
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 sm:p-10 hover:border-orange-500/40 transition-all group relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-white mb-3">
              B2B-Биллинг и автогенерация счетов Docx
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              Встроенный модуль подписок автоматически отслеживает тарифы, предупреждает об окончании лицензии и генерирует готовые счета на оплату и акты в формате Word Docx в соответствии с законодательством РФ.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Автореквизиты ЕГРЮЛ</span>
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Генерация Word счетов</span>
              <span className="bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-700/60">Контроль подписки</span>
            </div>
          </div>

          {/* Card 5: Finance */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 hover:border-orange-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-['Montserrat'] text-white mb-2">Финансы и ДДС</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Учет доходов и расходов по объектам, кассовые разрывы, контроль дебиторской задолженности и рентабельность работ в реальном времени.
            </p>
          </div>

          {/* Card 6: Warehouse */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 hover:border-orange-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-['Montserrat'] text-white mb-2">Склад и Техника</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Штрихкодирование МТР, история перемещений оборудования, контроль моточасов техники и материальные отчеты прорабов M-19.
            </p>
          </div>

          {/* Card 7: Tenders */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 hover:border-orange-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-['Montserrat'] text-white mb-2">Тендерный сканер</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Агрегатор коммерческих закупок с ЭТП, снайпер-кампании, расчет маржинальности участия и контроль дедлайнов подачи заявок.
            </p>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center relative z-10">
        <div className="bg-gradient-to-r from-orange-950/40 via-zinc-900/80 to-orange-950/40 border border-orange-500/30 rounded-3xl p-10 sm:p-16 shadow-2xl backdrop-blur-xl">
          <h2 className="text-3xl sm:text-5xl font-black font-['Montserrat'] uppercase text-white mb-6 tracking-tight">
            Готовы оцифровать свой <span className="text-[#F95700]">бизнес</span>?
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mb-10">
            Присоединяйтесь к современной облачной ERP-платформе. Регистрация занимает менее 30 секунд благодаря автозаполнению реквизитов ФНС.
          </p>
          <button
            onClick={() => {
              const el = document.getElementById('fns-onboard');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-10 py-5 rounded-2xl bg-[#F95700] hover:bg-orange-600 text-white font-bold text-lg shadow-xl shadow-[#F95700]/30 transition-all cursor-pointer inline-flex items-center gap-3"
          >
            <span>Начать бесплатно</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

    </div>
  );
};
