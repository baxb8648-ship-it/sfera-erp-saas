import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Building2, Mail, Sparkles, ArrowLeft, ArrowRight, CheckCircle2, Check, Activity, Cpu } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(() => searchParams.get('tab') === 'register');
  
  // Register Wizard State
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // General State
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register State
  const [inn, setInn] = useState(() => searchParams.get('inn') || '');
  const [sphere, setSphere] = useState('construction');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);

  // FNS Search State
  const [suggestedCompany, setSuggestedCompany] = useState<{
    name: string;
    full_name: string;
    address: string;
    director: string;
  } | null>(null);
  const [isFetchingInn, setIsFetchingInn] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Live FNS Search
  useEffect(() => {
    if (!isRegister) return;
    const fetchCompanyInfo = async () => {
      if (inn.length === 10 || inn.length === 12) {
        setIsFetchingInn(true);
        setError('');
        try {
          const response = await fetch(`${baseUrl}/tenants/suggest/${inn}`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.name) {
              setSuggestedCompany(data);
            } else {
              setSuggestedCompany(null);
            }
          } else {
            setSuggestedCompany(null);
          }
        } catch (err) {
          console.error("Failed to suggest company:", err);
          setSuggestedCompany(null);
        } finally {
          setIsFetchingInn(false);
        }
      } else {
        setSuggestedCompany(null);
      }
    };
    const timer = setTimeout(fetchCompanyInfo, 400);
    return () => clearTimeout(timer);
  }, [inn, isRegister, baseUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.csrf_token) localStorage.setItem('csrf_token', data.csrf_token);

        const userProfileResponse = await fetch(`${baseUrl}/users/me`, { credentials: 'include' });
        if (userProfileResponse.ok) {
          const userProfile = await userProfileResponse.json();
          login(userProfile);
          navigate('/crm');
        } else {
          setError('Не удалось загрузить профиль пользователя');
        }
      } else {
        setError('Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      if (step === 1 && !suggestedCompany && inn.length > 0) {
        setError('Сначала введите корректный ИНН, чтобы система нашла вашу компанию.');
        return;
      }
      setError('');
      setStep(step + 1);
      return;
    }

    if (!legalConsent) {
      setError('Необходимо согласие на обработку персональных данных (152-ФЗ)');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inn,
          sphere,
          admin_username: regUsername,
          admin_password: regPassword,
          email: email || undefined
        })
      });

      if (response.ok) {
        setSuccessMsg(`Аккаунт ${regUsername} создан. Входите в систему.`);
        setIsRegister(false);
        setStep(1);
        setUsername(regUsername);
        setPassword('');
        setInn(''); setRegUsername(''); setRegPassword(''); setEmail(''); setSuggestedCompany(null);
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Ошибка регистрации. Проверьте данные.');
      }
    } catch (err) {
      setError('Ошибка сервера при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-['Inter'] bg-zinc-50 dark:bg-[#0A0D14] transition-colors duration-300">
      <Helmet>
        <title>{isRegister ? 'Регистрация | СФЕРА ERP' : 'Вход | СФЕРА ERP'}</title>
        <meta name="description" content="Панель управления СФЕРА ERP" />
        <link rel="icon" type="image/svg+xml" href="favicon-crm.svg" />
      </Helmet>

      {/* LEFT PANEL: BRANDING (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[#05070A] text-white flex-col justify-between p-12 relative overflow-hidden border-r border-zinc-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-[#E64D00]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between w-full">
          <Link to="/" className="text-3xl font-black font-['Montserrat'] tracking-tight flex items-center gap-2">
             СФЕРА <span className="text-[#E64D00]">ERP</span>
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-zinc-500 bg-zinc-900 px-3 py-1 border border-zinc-800">
            <Activity className="w-3 h-3 text-emerald-500" />
            System Online
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <Cpu className="w-10 h-10 text-[#E64D00] mb-6" />
          <h2 className="text-4xl font-bold font-['Montserrat'] leading-tight mb-6">
            Ваша инфраструктура больше не черная дыра.
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Автоматический сбор тендеров, генерация смет из PDF и контроль МТР с точностью до гвоздя.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 bg-zinc-900/50 p-4 border border-zinc-800/50 backdrop-blur-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-zinc-300 font-mono">Row-Level Security Active</span>
            </div>
            <div className="flex items-center gap-3 bg-zinc-900/50 p-4 border border-zinc-800/50 backdrop-blur-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-zinc-300 font-mono">End-to-End Encryption</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-mono text-zinc-600 uppercase">
          © {new Date().getFullYear()} SPHERA INDUSTRIAL GROUP
        </div>
      </div>

      {/* RIGHT PANEL: FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Mobile Header (Shown only on small screens) */}
        <div className="lg:hidden absolute top-6 left-6 right-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-black font-['Montserrat'] text-zinc-900 dark:text-white">
            СФЕРА <span className="text-[#E64D00]">ERP</span>
          </Link>
        </div>

        <div className="w-full max-w-sm mt-12 lg:mt-0">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold font-['Montserrat'] text-zinc-900 dark:text-white mb-2 transition-colors">
              {isRegister ? 'Инициализация' : 'Авторизация'}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm transition-colors">
              {isRegister ? 'Развертывание нового воркспейса' : 'Войдите в панель управления'}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-none text-xs font-mono mb-6 border border-red-200 dark:border-red-900/50">
              {'>'} ОШИБКА: {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-none text-xs font-mono mb-6 border border-emerald-200 dark:border-emerald-900/50">
              {'>'} УСПЕХ: {successMsg}
            </motion.div>
          )}

          {/* ================= LOGIN FORM ================= */}
          {!isRegister && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Логин</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors rounded-none shadow-sm"
                    placeholder="admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors rounded-none shadow-sm"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#E64D00] hover:bg-[#CC4400] text-white py-4 font-mono font-bold text-xs uppercase tracking-widest transition-colors shadow-[0_10px_30px_rgba(230,77,0,0.2)] disabled:opacity-70 mt-4">
                {isLoading ? 'АВТОРИЗАЦИЯ...' : '[ ВОЙТИ ]'}
              </button>

              <div className="text-center pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 transition-colors">
                <button type="button" onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }} className="text-xs font-mono text-zinc-500 hover:text-[#E64D00] transition-colors uppercase tracking-widest">
                  Создать новый воркспейс
                </button>
              </div>
            </form>
          )}

          {/* ================= REGISTER WIZARD ================= */}
          {isRegister && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              
              {/* Stepper Progress */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-center">
                    <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs border ${step >= num ? 'bg-[#E64D00] border-[#E64D00] text-white' : 'bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-400'} transition-colors`}>
                      {num}
                    </div>
                    {num !== 3 && <div className={`w-12 h-px ${step > num ? 'bg-[#E64D00]' : 'bg-zinc-300 dark:bg-zinc-700'} transition-colors`} />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* STEP 1: INN */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Шаг 1: Реквизиты</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                        <input
                          type="text"
                          maxLength={12}
                          value={inn}
                          onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors rounded-none shadow-sm text-lg font-mono"
                          placeholder="ИНН (10-12 цифр)"
                        />
                      </div>
                      
                      {isFetchingInn && <div className="text-xs font-mono text-zinc-400 mt-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" /> Поиск в реестре...</div>}

                      {suggestedCompany && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-emerald-50 dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 transition-colors">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold mb-2">
                            <Sparkles className="w-4 h-4" /> {suggestedCompany.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 mb-1">{suggestedCompany.address}</div>
                          {suggestedCompany.director && <div className="text-[10px] text-zinc-500">Руководитель: {suggestedCompany.director}</div>}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: SPHERE */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Шаг 2: Специализация</label>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Выберите профиль, чтобы система загрузила нужные справочники.</p>
                      
                      <div className="space-y-3">
                        {[
                          { id: 'construction', label: 'Строительство и ПМК' },
                          { id: 'service', label: 'Сервисное обслуживание' },
                          { id: 'rental', label: 'Аренда оборудования' },
                          { id: 'other', label: 'Другая сфера' }
                        ].map(opt => (
                          <label key={opt.id} onClick={() => setSphere(opt.id)} className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${sphere === opt.id ? 'border-[#E64D00] bg-[#E64D00]/5 dark:bg-[#E64D00]/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                            <div className={`w-4 h-4 border flex items-center justify-center ${sphere === opt.id ? 'border-[#E64D00] bg-[#E64D00]' : 'border-zinc-300 dark:border-zinc-600'}`}>
                              {sphere === opt.id && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-bold font-['Montserrat'] ${sphere === opt.id ? 'text-[#E64D00]' : 'text-zinc-700 dark:text-zinc-300'}`}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: ADMIN CREDENTIALS */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Шаг 3: Доступ Админа</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors shadow-sm"
                          placeholder="Email для документов"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="relative">
                          <input
                            type="text"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors shadow-sm"
                            placeholder="Логин"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="relative">
                          <input
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            required
                            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#E64D00] dark:focus:border-[#E64D00] text-zinc-900 dark:text-white focus:outline-none transition-colors shadow-sm"
                            placeholder="Пароль"
                          />
                          <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center pt-0.5">
                          <input type="checkbox" className="sr-only" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} />
                          <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${legalConsent ? 'bg-[#E64D00] border-[#E64D00]' : 'border-zinc-300 dark:border-zinc-700 group-hover:border-[#E64D00]'}`}>
                            {legalConsent && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] leading-tight text-zinc-500 font-mono">
                          Я даю согласие на обработку моих персональных данных в соответствии с <a href="#" className="text-[#E64D00] hover:underline">Политикой конфиденциальности</a> и принимаю условия <a href="#" className="text-[#E64D00] hover:underline">Пользовательского соглашения</a> (152-ФЗ).
                        </span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 pt-4">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-4 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                
                <button type="submit" disabled={isLoading} className="flex-1 bg-[#E64D00] hover:bg-[#CC4400] text-white py-4 font-mono font-bold text-xs uppercase tracking-widest transition-colors shadow-[0_10px_30px_rgba(230,77,0,0.2)] disabled:opacity-70 flex items-center justify-center gap-2">
                  {isLoading ? 'РАБОТА СЕРВЕРА...' : step < totalSteps ? 'СЛЕДУЮЩИЙ ШАГ' : '[ РАЗВЕРНУТЬ СИСТЕМУ ]'}
                  {step < totalSteps && !isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-center pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-8 transition-colors">
                <button type="button" onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); setStep(1); }} className="text-xs font-mono text-zinc-500 hover:text-[#E64D00] transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                  <Lock className="w-3 h-3" /> У меня уже есть воркспейс
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
