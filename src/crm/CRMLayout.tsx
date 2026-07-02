import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Wallet, Package, PenTool, LogOut, FileText, Sun, Moon, ShieldCheck, Gavel, TrendingUp, Menu, X, Mail, CheckSquare, Bell, Crown } from 'lucide-react';
import { CommandMenu } from './components/CommandMenu';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toast';
import { Helmet } from 'react-helmet-async';
import { useAuth } from './context/AuthContext';
import { apiClient } from '../api/client';
import packageJson from '../../package.json';

export const CRMLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isDark, setIsDark] = React.useState<boolean>(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = React.useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [emailRecipient, setEmailRecipient] = React.useState<string>('');
  const [emailSubject, setEmailSubject] = React.useState<string>('');
  const [emailBody, setEmailBody] = React.useState<string>('');
  const [emailDocId, setEmailDocId] = React.useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = React.useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = React.useState<boolean | null>(null);
  const [emailError, setEmailError] = React.useState<string>('');
  const [wsStatus, setWsStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [unreadTasksCount, setUnreadTasksCount] = React.useState<number>(0);

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings/'),
    enabled: true
  });

  React.useEffect(() => {
    if (settings && (settings as any).brand_color) {
      document.documentElement.style.setProperty('--brand-color', (settings as any).brand_color);
      localStorage.setItem('brand_color', (settings as any).brand_color);
    } else {
      const savedColor = localStorage.getItem('brand_color');
      if (savedColor) {
        document.documentElement.style.setProperty('--brand-color', savedColor);
      }
    }
  }, [settings]);

  React.useEffect(() => {
    const handleBrandUpdate = (e: any) => {
      if (e.detail && e.detail.brand_color) {
        document.documentElement.style.setProperty('--brand-color', e.detail.brand_color);
      }
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    };
    window.addEventListener('brand_settings_updated', handleBrandUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleBrandUpdate);
  }, [queryClient]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.get('/clients/'),
    enabled: isEmailModalOpen
  });

  const { data: objects = [] } = useQuery({
    queryKey: ['objects'],
    queryFn: () => apiClient.get('/objects/'),
    enabled: isEmailModalOpen
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiClient.get('/documents/'),
    enabled: isEmailModalOpen
  });

  React.useEffect(() => {
    const handleOpen = () => {
      setIsEmailModalOpen(true);
    };
    window.addEventListener('open_email_modal', handleOpen);
    return () => {
      window.removeEventListener('open_email_modal', handleOpen);
    };
  }, []);

  const updateEmailTemplate = (client: any, docIdStr: string) => {
    let template = '';
    let docName = '';
    let objectName = 'Без объекта';

    const docId = docIdStr ? parseInt(docIdStr) : null;
    const doc = docId ? documents.find((d: any) => d.id === docId) : null;

    if (doc) {
      docName = doc.name || '';
      if (doc.doc_type === 'contract') {
        template = settings.email_template_contract || '';
      } else if (doc.doc_type === 'act') {
        template = settings.email_template_act || '';
      } else if (doc.doc_type === 'kp') {
        template = settings.email_template_kp || '';
      } else if (doc.doc_type === 'invoice') {
        template = settings.email_template_invoice || '';
      } else if (doc.doc_type === 'factura') {
        template = settings.email_template_invoice || '';
      } else if (doc.doc_type === 'upd') {
        template = settings.email_template_invoice || '';
      } else {
        template = settings.email_template_other || '';
      }
      
      const matchedObject = objects.find((o: any) => o.id === doc.object_id);
      if (matchedObject) {
        objectName = matchedObject.name;
      }
    } else {
      template = settings.email_template_other || '';
    }

    const contactName = client.contact_person || 'Уважаемый партнер';
    const repText = template
      .replace(/\{\{client_name\}\}/g, client.name || '')
      .replace(/\{\{client_contact\}\}/g, contactName)
      .replace(/\{\{doc_name\}\}/g, docName)
      .replace(/\{\{object_name\}\}/g, objectName)
      .replace(/\{\{company_name\}\}/g, settings.company_name || 'СФЕРА')
      .replace(/\{\{company_phone\}\}/g, settings.company_phone || '');

    setEmailSubject(docName || 'Документ от СФЕРА');
    setEmailBody(repText);
  };

  React.useEffect(() => {
    if (!selectedClientId) {
      setEmailRecipient('');
      setEmailSubject('');
      setEmailBody('');
      setEmailDocId('');
      return;
    }
    const client = clients.find((c: any) => c.id.toString() === selectedClientId);
    if (client) {
      setEmailRecipient(client.email || '');
      updateEmailTemplate(client, emailDocId);
    }
  }, [selectedClientId, clients]);

  React.useEffect(() => {
    const client = clients.find((c: any) => c.id.toString() === selectedClientId);
    if (client) {
      updateEmailTemplate(client, emailDocId);
    }
  }, [emailDocId]);

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) {
      alert("Пожалуйста, укажите email получателя");
      return;
    }
    setIsSendingEmail(true);
    setEmailError('');
    setEmailSuccess(null);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doc_id: emailDocId ? parseInt(emailDocId) : undefined,
          recipient_email: emailRecipient,
          subject: emailSubject,
          body: emailBody
        })
      });
      const data = await response.json();
      if (response.ok) {
        setEmailSuccess(true);
        setTimeout(() => {
          setIsEmailModalOpen(false);
          // Clear states
          setSelectedClientId('');
          setEmailRecipient('');
          setEmailSubject('');
          setEmailBody('');
          setEmailDocId('');
          setEmailSuccess(null);
        }, 2000);
      } else {
        setEmailError(data.detail || "Не удалось отправить письмо");
      }
    } catch (e) {
      console.error(e);
      setEmailError("Сетевая ошибка при отправке почты");
    } finally {
      setIsSendingEmail(false);
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);
  const [currentTime, setCurrentTime] = React.useState<Date>(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Get user details from AuthContext
  const { user, logout } = useAuth();
  const userRole = user?.role || 'manager';
  const usernameVal = user?.username ? user.username.charAt(0).toUpperCase() : 'А';

  const allMenuItems = [
    { name: 'Дашборд', path: '/crm', icon: LayoutDashboard, roles: ['admin', 'manager', 'accountant'] },
    { name: 'Задачи', path: '/crm/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'accountant'] },
    { name: 'Аналитика', path: '/crm/analytics', icon: TrendingUp, roles: ['admin', 'accountant'] },
    { name: 'Клиенты', path: '/crm/clients', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Объекты', path: '/crm/objects', icon: Building2, roles: ['admin', 'manager', 'accountant'] },
    { name: 'Тендеры', path: '/crm/tenders', icon: Gavel, roles: ['admin', 'manager'] },
    { name: 'Финансы', path: '/crm/finance', icon: Wallet, roles: ['admin', 'accountant'] },
    { name: 'Склад', path: '/crm/inventory', icon: Package, roles: ['admin', 'accountant'] },
    { name: 'Оборудование', path: '/crm/equipment', icon: PenTool, roles: ['admin', 'accountant'] },
    { name: 'Шаблоны и Контент', path: '/crm/templates', icon: FileText, roles: ['admin', 'manager', 'accountant'] },
    { name: 'Администрирование', path: '/crm/admin', icon: ShieldCheck, roles: ['admin', 'superadmin'] },
    { name: 'Супер-Админ (SaaS)', path: '/crm/superadmin', icon: Crown, roles: ['superadmin'] },

  ];

  React.useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setIsDark(isDarkTheme);
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  React.useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/crm/tasks') {
      setUnreadTasksCount(0);
    }
    const matchedItem = allMenuItems.find(item => {
      if (item.path === '/crm') {
        return currentPath === '/crm';
      }
      return currentPath.startsWith(item.path);
    });
    if (matchedItem && !matchedItem.roles.includes(userRole)) {
      navigate('/crm', { replace: true });
    }
  }, [location.pathname, userRole]);

  // Real-time WebSocket Notifications
  const locationRef = React.useRef(location.pathname);
  React.useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const userRef = React.useRef(user);
  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Recalculate unread notification count based on assigned new tasks and unread chat messages
  const recalculateCounts = React.useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    try {
      // Fetch tasks list
      const tasks = await apiClient.get<any[]>('/tasks/');
      const newTasks = tasks.filter(t => t.assigned_to_id === currentUser.id && t.status === 'Новая');

      // Fetch chat messages
      const chatMessages = await apiClient.get<any[]>('/tasks/chat');
      const lastReadMsgId = Number(localStorage.getItem(`last_read_chat_msg_id_${currentUser.id}`) || '0');
      const unreadMsgs = chatMessages.filter(m => m.id > lastReadMsgId && m.user_id !== currentUser.id);

      setUnreadTasksCount(newTasks.length + unreadMsgs.length);
    } catch (err) {
      console.error('Failed to recalculate notification counts:', err);
    }
  }, []);

  // Fetch initial counts when user or tasks page changes
  React.useEffect(() => {
    recalculateCounts();
  }, [user, location.pathname, recalculateCounts]);

  // Listen to custom chat_messages_read event
  React.useEffect(() => {
    const handleChatRead = () => {
      recalculateCounts();
    };
    window.addEventListener('chat_messages_read', handleChatRead);
    return () => {
      window.removeEventListener('chat_messages_read', handleChatRead);
    };
  }, [recalculateCounts]);

  const recalculateCountsRef = React.useRef(recalculateCounts);
  React.useEffect(() => {
    recalculateCountsRef.current = recalculateCounts;
  }, [recalculateCounts]);

  React.useEffect(() => {
    const defaultTitle = 'СФЕРА';
    if (unreadTasksCount > 0) {
      document.title = `(${unreadTasksCount}) ${defaultTitle}`;
    } else {
      document.title = defaultTitle;
    }
  }, [unreadTasksCount]);

  React.useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    const connectWebSocket = () => {
      if (!isMounted) return;

      const apiVal = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const wsProtocol = apiVal.startsWith('https') ? 'wss:' : 'ws:';
      const host = apiVal.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${host}/ws/notifications`;

      console.log('Connecting to WebSocket:', wsUrl);
      setWsStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket notification received:', data);

          const currentUserId = userRef.current?.id;

          if (data.type === 'chat_message') {
            window.dispatchEvent(new CustomEvent('ws_chat_message', { detail: data }));
            
            // Only show toast and increment unread badge if the message is from another user
            if (data.user_id !== currentUserId) {
              const isTasksPage = locationRef.current === '/crm/tasks';
              if (!isTasksPage) {
                recalculateCountsRef.current();
                showToast(`💬 ${data.username}: ${data.message}`, 'info');
              } else {
                recalculateCountsRef.current();
                if (window.innerWidth < 1024) {
                  showToast(`💬 ${data.username}: ${data.message}`, 'info');
                }
              }
            }
            return;
          }

          if (data.type === 'chat_message_status') {
            window.dispatchEvent(new CustomEvent('ws_chat_message', { detail: data }));
            return;
          }

          if (data.type === 'task_created') {
            if (data.created_by_id !== currentUserId) {
              recalculateCountsRef.current();
              if (data.assigned_to_id === currentUserId) {
                showToast(`🎯 Вам назначена новая задача: ${data.title}`, 'success');
              } else {
                showToast(`🎯 Новая задача: ${data.title}`, 'success');
              }
            }
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            return;
          }

          if (data.type === 'task_updated') {
            if (data.updated_by_id !== currentUserId) {
              recalculateCountsRef.current();
              if (data.assigned_to_id === currentUserId) {
                showToast(`🔄 Статус вашей задачи "${data.title}" изменен на: ${data.status}`, 'info');
              } else {
                showToast(`🔄 Задача "${data.title}" обновлена (Статус: ${data.status})`, 'info');
              }
            }
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            return;
          }

          if (data.message) {
            const toastType = data.type || 'info';
            showToast(data.message, toastType);
          }

          if (data.refetchKey) {
            console.log(`Invalidating query key: ${data.refetchKey}`);
            queryClient.invalidateQueries({ queryKey: [data.refetchKey] });
          }

          // Invalidate general dashboards & statistics keys upon any changes
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
          queryClient.invalidateQueries({ queryKey: ['analyticsStats'] });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('disconnected');
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        setWsStatus('disconnected');
        console.log(`WebSocket disconnected. Reconnecting in 3 seconds... (Reason: ${event.reason || 'none'})`);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient, showToast]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/crm/login');
  };

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 text-[#1a1a1a] dark:text-zinc-100 font-['Inter'] relative overflow-hidden">
      <Helmet>
        <link rel="icon" type="image/svg+xml" href="favicon-crm.svg?v=2" />
      </Helmet>
      <CommandMenu />
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-fade-in" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
          <Link to="/crm" className="flex items-center gap-2.5 overflow-hidden">
            {(settings as any).brand_logo_url ? (
              <img src={(settings as any).brand_logo_url} alt="Logo" className="h-8 w-auto object-contain max-w-[120px]" />
            ) : null}
            <h1 className="text-2xl font-bold font-['Montserrat'] tracking-tight text-[#1a1a1a] dark:text-white truncate">
              {(settings as any).brand_name ? (
                <span style={{ color: (settings as any).brand_color || '#F95700' }}>{(settings as any).brand_name}</span>
              ) : (
                <>СФЕРА <span style={{ color: (settings as any).brand_color || '#F95700' }}>ERP</span></>
              )}
            </h1>
          </Link>
          <button 
            type="button" 
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden p-1.5 -mr-1.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/crm' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-[#F95700]/10 dark:bg-[#F95700]/20 text-[#F95700] font-medium' 
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-[#1a1a1a] dark:hover:text-white'
                    }`}
                    style={isActive ? { color: (settings as any).brand_color || '#F95700', backgroundColor: `${(settings as any).brand_color || '#F95700'}20` } : {}}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#F95700]' : 'text-gray-400 dark:text-zinc-500'}`} style={isActive ? { color: (settings as any).brand_color || '#F95700' } : {}} />
                    <span className="flex-1">{item.name}</span>
                    {item.path === '/crm/tasks' && unreadTasksCount > 0 && (
                      <span className="bg-[#F95700] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2 animate-pulse" style={{ backgroundColor: (settings as any).brand_color || '#F95700' }}>
                        {unreadTasksCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex flex-col gap-2 bg-gray-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-[#F95700] text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-orange-500/10" style={{ backgroundColor: (settings as any).brand_color || '#F95700', backgroundImage: 'none' }}>
                {usernameVal}
              </div>
              {unreadTasksCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" style={{ backgroundColor: (settings as any).brand_color || '#F95700' }}></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F95700] border border-white dark:border-zinc-900" style={{ backgroundColor: (settings as any).brand_color || '#F95700' }}></span>
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {user?.username || 'Пользователь'}
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                {userRole === 'admin' ? 'Администратор' : userRole === 'accountant' ? 'Бухгалтер' : 'Менеджер'}
              </p>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-zinc-550 mt-1 flex justify-between items-center font-semibold font-mono">
            <span>СФЕРА ERP</span>
            <span>v{packageJson.version}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-[#F95700] hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer active:scale-95"
              title="Открыть меню"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-sm sm:text-xl font-semibold font-['Montserrat'] text-[#1a1a1a] dark:text-white truncate max-w-[140px] sm:max-w-none">
              {menuItems.find(i => location.pathname === i.path || (i.path !== '/crm' && location.pathname.startsWith(i.path)))?.name || 'CRM'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            {userRole === 'superadmin' && (
              <button
                onClick={() => navigate('/crm/superadmin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-500 hover:text-white hover:bg-amber-500 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                title="👑 Консоль Владельца Платформы (SaaS SuperAdmin)"
              >
                <Crown className="w-4 h-4 animate-pulse" />
                <span className="hidden sm:inline">SaaS Владелец</span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/40 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 select-none">
              <div>
                <span className="text-gray-400 dark:text-zinc-550 font-sans mr-1">МСК:</span>
                <span className="font-semibold text-gray-700 dark:text-zinc-200">
                  {new Intl.DateTimeFormat('ru-RU', {
                    timeZone: 'Europe/Moscow',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }).format(currentTime)}
                </span>
              </div>
              <div className="h-3 w-px bg-gray-200 dark:bg-zinc-700" />
              <div>
                <span className="text-gray-400 dark:text-zinc-550 font-sans mr-1">Местное:</span>
                <span className="font-semibold text-[#F95700]">
                  {new Intl.DateTimeFormat('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }).format(currentTime)}
                </span>
              </div>
            </div>

            {/* Статус соединения */}
            <div 
              className="flex items-center justify-center px-1" 
              title={wsStatus === 'connected' ? 'Соединение установлено (Онлайн)' : wsStatus === 'connecting' ? 'Подключение...' : 'Соединение разорвано (Офлайн)'}
            >
              <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : wsStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'}`} />
            </div>

            {/* Кнопка уведомлений */}
            <button 
              onClick={() => {
                navigate('/crm/tasks');
              }}
              className={`p-2 transition-colors rounded-full active:scale-95 cursor-pointer relative ${
                unreadTasksCount > 0 
                  ? 'bg-orange-500/10 dark:bg-orange-500/20 text-[#F95700]' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-[#F95700] hover:bg-gray-100 dark:hover:bg-zinc-800/60'
              }`}
              title={unreadTasksCount > 0 ? `Непрочитанные уведомления (${unreadTasksCount})` : 'Уведомления'}
            >
              <Bell className={`w-5 h-5 ${unreadTasksCount > 0 ? 'animate-wiggle text-[#F95700]' : ''}`} />
              {unreadTasksCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#F95700] text-white text-[8px] px-1 rounded-full font-black min-w-[14px] text-center shadow-sm shadow-orange-500/20">
                  {unreadTasksCount}
                </span>
              )}
            </button>

            {/* Кнопка отправки email */}
            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-[#F95700] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800/60 active:scale-95 cursor-pointer"
              title="Отправить Email клиенту"
            >
              <Mail className="w-5 h-5" />
            </button>

            {/* Кнопка темной темы */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-[#F95700] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800/60 active:scale-95 cursor-pointer"
              title="Переключить тему"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-550" /> : <Moon className="w-5 h-5 text-indigo-550" />}
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 cursor-pointer"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>

          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto px-4 md:px-8 pt-4 md:pt-8 pb-16 bg-[#f8f9fa] dark:bg-zinc-950">
          <Outlet />
        </div>
      </main>

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Inter']">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4.5 h-4.5 text-indigo-650 dark:text-indigo-400" /> Отправить Email клиенту
              </h3>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 dark:text-zinc-505 hover:text-gray-650 dark:hover:text-zinc-300 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Контрагент</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  required
                >
                  <option value="">Выберите контрагента...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <>
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Вложение (документ)</label>
                    <select
                      value={emailDocId}
                      onChange={(e) => setEmailDocId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-250 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                    >
                      <option value="">Без вложения (только текст письма)</option>
                      {documents
                        .filter((d: any) => d.client_id === Number(selectedClientId))
                        .map((doc: any) => (
                          <option key={doc.id} value={doc.id.toString()}>
                            {doc.name} ({doc.doc_type === 'kp' ? 'КП' :
                                         doc.doc_type === 'invoice' ? 'Счет' :
                                         doc.doc_type === 'contract' ? 'Договор' :
                                         doc.doc_type === 'act' ? 'Акт' :
                                         doc.doc_type === 'factura' ? 'Счет-фактура' :
                                         doc.doc_type === 'upd' ? 'УПД' : doc.doc_type})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Email Получателя *</label>
                    <input
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="client@company.ru"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                      required
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Тема письма</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Тема сообщения"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                      required
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Сообщение</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                </>
              )}

              {emailError && (
                <div className="p-3 rounded-lg text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-205 dark:border-red-900/30 flex items-start gap-2">
                  <span className="font-semibold">{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 rounded-lg text-xs bg-green-50 dark:bg-emerald-950/20 text-green-700 dark:text-emerald-400 border border-green-205 dark:border-emerald-900/30 flex items-start gap-2">
                  <span>Отправлено успешно! Закрытие окна...</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!selectedClientId || isSendingEmail || emailSuccess === true}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold select-none cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? "Отправка..." : "Отправить Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
