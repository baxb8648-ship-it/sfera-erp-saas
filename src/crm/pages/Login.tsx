import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Building2, Mail, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  // Состояние переключения Вход / Регистрация
  const [isRegister, setIsRegister] = useState(false);

  // Общие стейты
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Стейты Входа
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Стейты Регистрации по ИНН
  const [inn, setInn] = useState('');
  const [sphere, setSphere] = useState('construction');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Стейты автозаполнения ФНС
  const [suggestedCompany, setSuggestedCompany] = useState<{
    name: string;
    full_name: string;
    address: string;
    director: string;
  } | null>(null);
  const [isFetchingInn, setIsFetchingInn] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Живой поиск реквизитов при вводе ИНН
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

    const timer = setTimeout(fetchCompanyInfo, 500); // Debounce
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.csrf_token) {
          localStorage.setItem('csrf_token', data.csrf_token);
        }

        const userProfileResponse = await fetch(`${baseUrl}/users/me`, {
          credentials: 'include'
        });

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/tenants/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: json_payload({
          inn,
          sphere,
          admin_username: regUsername,
          admin_password: regPassword,
          email: email || undefined
        })
      });

      if (response.ok) {
        setSuccessMsg(`Компания успешно зарегистрирована! Пожалуйста, войдите в систему под созданным логином: ${regUsername}`);
        // Переключаем на вход и заполняем имя
        setIsRegister(false);
        setUsername(regUsername);
        setPassword('');
        // Сбрасываем форму регистрации
        setInn('');
        setRegUsername('');
        setRegPassword('');
        setEmail('');
        setSuggestedCompany(null);
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Не удалось зарегистрировать компанию. Проверьте ИНН и имя пользователя.');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  // Метод сборки JSON для исключения ошибок TS
  const json_payload = (obj: any) => JSON.stringify(obj);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-800/50 font-['Inter'] px-4 py-8">
      <Helmet>
        <title>{isRegister ? 'Регистрация компании | СФЕРА' : 'Вход | СФЕРА'}</title>
        <link rel="icon" type="image/svg+xml" href="favicon-crm.svg?v=2" />
      </Helmet>
      
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-zinc-800 transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-['Montserrat'] tracking-tight text-[#1a1a1a] dark:text-zinc-100 mb-2">
            СФЕРА <span className="text-[#F95700]">ERP</span>
          </h1>
          <p className="text-gray-500 dark:text-zinc-400">
            {isRegister ? 'Создание личного кабинета компании' : 'Войдите в панель управления'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center mb-6 border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm text-center mb-6 border border-green-100 dark:border-green-900/50 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isRegister ? (
          /* ================= ФОРМА ВХОДА ================= */
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Логин</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400 focus:outline-none flex items-center justify-center cursor-pointer select-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a1a1a] dark:bg-zinc-800 text-white py-2.5 rounded-lg font-medium hover:bg-black dark:hover:bg-zinc-700 transition-colors focus:ring-4 focus:ring-gray-200 dark:focus:ring-zinc-800 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-sm text-[#F95700] hover:underline font-medium cursor-pointer"
              >
                Нет компании? Зарегистрировать новую
              </button>
            </div>
          </form>
        ) : (
          /* ================= ФОРМА РЕГИСТРАЦИИ ПО ИНН ================= */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">ИНН компании</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  maxLength={12}
                  value={inn}
                  onChange={(e) => setInn(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                  placeholder="Введите 10 или 12 цифр ИНН"
                />
              </div>
              
              {isFetchingInn && (
                <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-0.5">
                  <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
                  Запрос к реестру ФНС...
                </div>
              )}

              {/* Живая Bento-карточка реквизитов из ФНС */}
              {suggestedCompany && (
                <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3.5 mt-2 text-xs space-y-1.5 text-gray-600 dark:text-zinc-300 animate-fadeIn">
                  <div className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F95700]" />
                    {suggestedCompany.name}
                  </div>
                  <div><b>Юр. адрес:</b> {suggestedCompany.address}</div>
                  {suggestedCompany.director && <div><b>Руководитель:</b> {suggestedCompany.director}</div>}
                  <div className="text-[10px] text-gray-400 pt-1">Реквизиты проверены и заполнены автоматически</div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Сфера деятельности</label>
              <select
                value={sphere}
                onChange={(e) => setSphere(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white dark:bg-zinc-900"
              >
                <option value="construction" className="dark:bg-zinc-900">Строительство и АКЗ</option>
                <option value="service" className="dark:bg-zinc-900">Сервисное обслуживание</option>
                <option value="rental" className="dark:bg-zinc-900">Аренда оборудования</option>
                <option value="other" className="dark:bg-zinc-900">Другая сфера</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Email администратора</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                  placeholder="email@company.ru (для выставления счетов)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Логин админа</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                  placeholder="alex_admin"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-200">Пароль</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="w-full pl-3 pr-8 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-transparent dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer flex items-center justify-center"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#F95700] hover:bg-[#e04f00] text-white py-2.5 rounded-lg font-medium transition-colors focus:ring-4 focus:ring-orange-200 disabled:opacity-70 cursor-pointer mt-2"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрировать компанию'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-sm text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Вернуться к авторизации
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

