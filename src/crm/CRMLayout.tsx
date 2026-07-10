import React, { useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, LayoutDashboard, Users, Building2, Wallet, Package, LogOut, FileText, Sun, Moon, ShieldCheck, Gavel, TrendingUp, Menu, X, Mail, CheckSquare, Bell, Crown, LifeBuoy, HelpCircle, HardHat, Globe, Truck, Wrench, Tractor, Hammer, Wheat, Sparkles, Bot, Star, Eye, EyeOff, Settings, ArrowUp, ArrowDown, Landmark } from 'lucide-react';
import { CommandMenu } from './components/CommandMenu';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toast';
import { Helmet } from 'react-helmet-async';
import { useAuth, hasPermission } from './context/AuthContext';
import { apiClient } from '../api/client';
import packageJson from '../../package.json';
import { SetupWizard } from './components/SetupWizard';

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

  // Режим «Вездесущего Ока» (Impersonation Mode / Гостевой вход)
  const [impersonatedTenant, setImpersonatedTenant] = React.useState<{ id: number; name: string; inn: string } | null>(() => {
    const saved = localStorage.getItem('impersonated_tenant');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    const handleImpersonation = (e: any) => {
      if (e.detail) {
        setImpersonatedTenant(e.detail);
      } else {
        const saved = localStorage.getItem('impersonated_tenant');
        setImpersonatedTenant(saved ? JSON.parse(saved) : null);
      }
    };
    window.addEventListener('tenant_impersonated', handleImpersonation);
    return () => window.removeEventListener('tenant_impersonated', handleImpersonation);
  }, []);

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
      // BUG-001 FIX: использовать порт 8001 (СФЕРА ERP), а не 8000 (устаревший порт ЛЕОНИКА CRM)
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/documents/send-email', {
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

  // Get user details and permissions from AuthContext
  const { user, permissions, logout } = useAuth();
  
  const { data: billingStatus } = useQuery({
    queryKey: ['billingStatus'],
    queryFn: () => apiClient.get('/billing/status'),
    enabled: !!user && !permissions?.is_superadmin // don't check for superadmin
  });
  
  const isPaywallActive = billingStatus && !billingStatus.is_active && location.pathname !== '/crm/admin';
  const userRole = user?.role || 'manager';
  
  // Вычисляем дни до конца подписки для Soft Paywall
  const daysLeft = useMemo(() => {
    if (!user?.subscription_ends_at) return null;
    const endsAt = new Date(user.subscription_ends_at);
    const now = new Date();
    const diffTime = endsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [user?.subscription_ends_at]);

  const showSoftPaywall = daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && userRole === 'admin';
  const usernameVal = user?.username ? user.username.charAt(0).toUpperCase() : 'А';

  const allMenuItems = [
    { name: 'Дашборд', path: '/crm', icon: LayoutDashboard, module: null }, // Всегда доступен (главная)
    { name: 'Холдинг / Компании', path: '/crm/holding', icon: Landmark, module: null }, // Мульти-компании и Холдинг
    { name: 'Биржа Заказов', path: '/crm/marketplace', icon: Globe, module: null }, // Внутренний SaaS маркетплейс
    { name: 'Задачи', path: '/crm/tasks', icon: CheckSquare, module: 'tasks' },
    { name: 'Техподдержка', path: '/crm/support', icon: LifeBuoy, module: 'support' },
    { name: 'Аналитика', path: '/crm/analytics', icon: TrendingUp, module: 'analytics' },
    { name: 'Клиенты', path: '/crm/clients', icon: Users, module: 'clients' },
    { name: 'База лидов', path: '/crm/leads', icon: TrendingUp, module: 'clients' },
    { name: 'Объекты', path: '/crm/objects', icon: Building2, module: 'objects' },
    { name: 'Строительство', path: '/crm/construction', icon: HardHat, module: 'construction' },
    { name: 'Тендеры', path: '/crm/tenders', icon: Gavel, module: 'tenders' },
    { name: 'Финансы', path: '/crm/finance', icon: Wallet, module: 'finance' },
    { name: 'Снабжение', path: '/crm/supply', icon: Truck, module: 'inventory' },
    { name: 'Склад', path: '/crm/inventory', icon: Package, module: 'inventory' },
    { name: 'Оборудование и Инструмент', path: '/crm/equipment', icon: Wrench, module: 'inventory' },
    { name: 'Мебельное производство', path: '/crm/furniture', icon: Hammer, module: 'furniture' },
    { name: 'Агропромышленность', path: '/crm/agro', icon: Wheat, module: 'agro' },
    { name: '🚜 Автопарк (Шахматка)', path: '/crm/fleet', icon: Tractor, module: 'fleet' },
    { name: 'Салон Красоты', path: '/crm/beauty', icon: Sparkles, module: 'beauty' },
    { name: 'ТОиР (Механики)', path: '/crm/service', icon: Wrench, module: 'service' },
    { name: 'ИИ-Центр (Агенты & База)', path: '/crm/ai-agents', icon: Bot, module: null },
    { name: 'Шаблоны и Контент', path: '/crm/templates', icon: FileText, module: 'templates' },
    { name: 'Администрирование', path: '/crm/admin', icon: ShieldCheck, module: 'audit' }, // Settings/Audit
    { name: 'Супер-Админ (SaaS)', path: '/crm/superadmin', icon: Crown, isSuperadminOnly: true },
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
    
    if (matchedItem && permissions) {
      const canAccess = matchedItem.isSuperadminOnly 
        ? permissions.is_superadmin 
        : (!matchedItem.module || hasPermission(permissions, matchedItem.module, 'read'));
        
      if (!canAccess) {
        navigate('/crm', { replace: true });
      }
    }
  }, [location.pathname, permissions]);

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

      const apiVal = import.meta.env.VITE_API_URL || 'http://localhost:8001';
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

  const menuItems = allMenuItems.filter(item => {
    if (item.isSuperadminOnly) return permissions?.is_superadmin;
    if (!item.module) return true;
    
    // Администраторы тенанта и супер-админы видят все доступные отраслевые модули СФЕРА ERP (включая Автопарк, Агро и др.)
    if (userRole === 'admin' || permissions?.is_superadmin || permissions?.role === 'admin') {
      return true;
    }

    // Проверка прав пользователя
    if (!hasPermission(permissions, item.module, 'read')) return false;

    // Проверка тарифного плана компании
    if (permissions?.plan_modules && Array.isArray(permissions.plan_modules)) {
      if (!permissions.plan_modules.includes(item.module)) {
        return false;
      }
    }
    
    return true;
  });

  // ─── God-Tier Sidebar Customization State (localStorage per user) ───
  const storageKey = `sfera_sidebar_customization_${user?.id || 'default'}`;
  const DEFAULT_PINNED = ['/crm', '/crm/ai-agents', '/crm/tasks', '/crm/clients'];

  const [isCustomizingMenu, setIsCustomizingMenu] = React.useState(false);
  const [pinnedPaths, setPinnedPaths] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.pinnedPaths) ? parsed.pinnedPaths : DEFAULT_PINNED;
      }
    } catch (e) {}
    return DEFAULT_PINNED;
  });

  const [hiddenPaths, setHiddenPaths] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.hiddenPaths) ? parsed.hiddenPaths : [];
      }
    } catch (e) {}
    return [];
  });

  const [customOrder, setCustomOrder] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.customOrder) ? parsed.customOrder : [];
      }
    } catch (e) {}
    return [];
  });

  const saveSidebarSettings = (newPinned: string[], newHidden: string[], newOrder: string[]) => {
    setPinnedPaths(newPinned);
    setHiddenPaths(newHidden);
    setCustomOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify({
      pinnedPaths: newPinned,
      hiddenPaths: newHidden,
      customOrder: newOrder
    }));
  };

  const togglePin = (path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isPinned = pinnedPaths.includes(path);
    const nextPinned = isPinned ? pinnedPaths.filter(p => p !== path) : [...pinnedPaths, path];
    saveSidebarSettings(nextPinned, hiddenPaths, customOrder);
    showToast(isPinned ? '📌 Раздел откреплён из избранного' : '★ Раздел закреплён в Избранное', 'info');
  };

  const toggleHide = (path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (path === '/crm') {
      showToast('⚠️ Главный дашборд нельзя скрыть', 'warning');
      return;
    }
    const isHidden = hiddenPaths.includes(path);
    const nextHidden = isHidden ? hiddenPaths.filter(p => p !== path) : [...hiddenPaths, path];
    saveSidebarSettings(pinnedPaths, nextHidden, customOrder);
  };

  const moveItemOrder = (path: string, direction: 'up' | 'down') => {
    const list = customOrder.length > 0 ? [...customOrder] : menuItems.map(i => i.path);
    const idx = list.indexOf(path);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    saveSidebarSettings(pinnedPaths, hiddenPaths, list);
  };

  const resetSidebarCustomization = () => {
    saveSidebarSettings(DEFAULT_PINNED, [], []);
    showToast('🔄 Настройки меню сброшены по умолчанию', 'info');
  };

  const orderedMenuItems = React.useMemo(() => {
    if (!customOrder || customOrder.length === 0) return menuItems;
    const itemMap = new Map(menuItems.map(i => [i.path, i]));
    const result: typeof menuItems = [];
    customOrder.forEach(path => {
      const item = itemMap.get(path);
      if (item) {
        result.push(item);
        itemMap.delete(path);
      }
    });
    itemMap.forEach(item => result.push(item));
    return result;
  }, [menuItems, customOrder]);

  const pinnedMenuItems = React.useMemo(() => {
    return orderedMenuItems.filter(item => pinnedPaths.includes(item.path) && !hiddenPaths.includes(item.path));
  }, [orderedMenuItems, pinnedPaths, hiddenPaths]);

  const regularMenuItems = React.useMemo(() => {
    return orderedMenuItems.filter(item => !pinnedPaths.includes(item.path) && !hiddenPaths.includes(item.path));
  }, [orderedMenuItems, pinnedPaths, hiddenPaths]);

  return (
    <>
      <Helmet>
        <title>{document.title || settings?.company_name || 'СФЕРА'}</title>
      </Helmet>

      {user && user.is_onboarded === false && <SetupWizard />}

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
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* ── Режим настройки меню (Редактор) ── */}
          {isCustomizingMenu ? (
            <div className="px-3 space-y-2">
              <div className="p-3 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 text-xs">
                <div className="font-extrabold text-[#F95700] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 animate-spin" />
                    Редактор меню
                  </span>
                  <button
                    onClick={resetSidebarCustomization}
                    className="text-[10px] underline text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    Сбросить
                  </button>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[10px] mt-1 leading-snug">
                  ★ — Избранное, 👁️ — Скрыть/показать, ↑↓ — Порядок
                </p>
              </div>

              <ul className="space-y-1">
                {orderedMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isPinned = pinnedPaths.includes(item.path);
                  const isHidden = hiddenPaths.includes(item.path);

                  return (
                    <li
                      key={item.path}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs transition-all ${
                        isHidden
                          ? 'bg-zinc-100/50 dark:bg-zinc-900/30 border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveItemOrder(item.path, 'up')}
                            disabled={index === 0}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white disabled:opacity-20 transition-colors"
                            title="Вверх"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveItemOrder(item.path, 'down')}
                            disabled={index === orderedMenuItems.length - 1}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white disabled:opacity-20 transition-colors"
                            title="Вниз"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <Icon className={`w-4 h-4 shrink-0 ${isHidden ? 'text-zinc-400' : 'text-[#F95700]'}`} />
                        <span className={`truncate font-semibold ${isHidden ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => togglePin(item.path, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPinned
                              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                          title={isPinned ? 'Открепить из избранного' : 'Закрепить в избранное'}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => toggleHide(item.path, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isHidden
                              ? 'text-zinc-400 hover:text-emerald-500 bg-zinc-200/50 dark:bg-zinc-800'
                              : 'text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                          title={isHidden ? 'Показать в меню' : 'Скрыть из меню'}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => setIsCustomizingMenu(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-500 text-white text-xs font-black shadow-md hover:opacity-90 transition-all cursor-pointer mt-2"
              >
                ✓ Сохранить и выйти
              </button>
            </div>
          ) : (
            /* ── Стандартный режим (с блоком Избранного) ── */
            <div className="space-y-4 px-3">
              {/* 1. Блок ИЗБРАННОЕ */}
              {pinnedMenuItems.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      Избранное
                    </span>
                    <span className="text-[9px] text-zinc-400">{pinnedMenuItems.length}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {pinnedMenuItems.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/crm' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      return (
                        <li key={`pin-${item.path}`} className="group relative">
                          <Link
                            to={item.path}
                            className={`flex items-center px-3 py-2 rounded-xl transition-all ${
                              isActive
                                ? 'bg-[#F95700]/10 dark:bg-[#F95700]/20 text-[#F95700] font-extrabold shadow-sm'
                                : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-white font-medium'
                            }`}
                            style={isActive ? { color: (settings as any).brand_color || '#F95700', backgroundColor: `${(settings as any).brand_color || '#F95700'}18` } : {}}
                          >
                            <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-[#F95700]' : 'text-gray-400 dark:text-zinc-400'}`} style={isActive ? { color: (settings as any).brand_color || '#F95700' } : {}} />
                            <span className="flex-1 truncate text-xs sm:text-sm">{item.name}</span>
                            {item.path === '/crm/tasks' && unreadTasksCount > 0 && (
                              <span className="bg-[#F95700] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2 animate-pulse" style={{ backgroundColor: (settings as any).brand_color || '#F95700' }}>
                                {unreadTasksCount}
                              </span>
                            )}
                          </Link>
                          <button
                            onClick={(e) => togglePin(item.path, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-amber-500 hover:text-amber-600 transition-opacity bg-white dark:bg-zinc-900 rounded-md shadow-xs"
                            title="Открепить из избранного"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Разделитель если есть Избранное */}
              {pinnedMenuItems.length > 0 && regularMenuItems.length > 0 && (
                <div className="border-t border-gray-200 dark:border-zinc-800/80 my-2" />
              )}

              {/* 2. Блок ВСЕ РАЗДЕЛЫ */}
              {regularMenuItems.length > 0 && (
                <div className="space-y-1">
                  {pinnedMenuItems.length > 0 && (
                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Все разделы
                    </div>
                  )}
                  <ul className="space-y-0.5">
                    {regularMenuItems.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/crm' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      return (
                        <li key={item.path} className="group relative">
                          <Link
                            to={item.path}
                            className={`flex items-center px-3 py-2 rounded-xl transition-all ${
                              isActive
                                ? 'bg-[#F95700]/10 dark:bg-[#F95700]/20 text-[#F95700] font-extrabold shadow-sm'
                                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-[#1a1a1a] dark:hover:text-white font-medium'
                            }`}
                            style={isActive ? { color: (settings as any).brand_color || '#F95700', backgroundColor: `${(settings as any).brand_color || '#F95700'}18` } : {}}
                          >
                            <Icon className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-[#F95700]' : 'text-gray-400 dark:text-zinc-500'}`} style={isActive ? { color: (settings as any).brand_color || '#F95700' } : {}} />
                            <span className="flex-1 truncate text-xs sm:text-sm">{item.name}</span>
                            {item.path === '/crm/tasks' && unreadTasksCount > 0 && (
                              <span className="bg-[#F95700] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2 animate-pulse" style={{ backgroundColor: (settings as any).brand_color || '#F95700' }}>
                                {unreadTasksCount}
                              </span>
                            )}
                          </Link>
                          <button
                            onClick={(e) => togglePin(item.path, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-amber-500 transition-opacity bg-white dark:bg-zinc-900 rounded-md shadow-xs"
                            title="Закрепить в Избранное"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Кнопка входа в настройки меню */}
              <div className="pt-2">
                <button
                  onClick={() => setIsCustomizingMenu(true)}
                  className="w-full px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-orange-500/50 text-zinc-500 dark:text-zinc-400 hover:text-[#F95700] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Настроить меню</span>
                </button>
              </div>
            </div>
          )}
        </nav>
        <div className="p-4 pb-10 sm:pb-12 border-t border-gray-200 dark:border-zinc-800 flex flex-col gap-2 bg-gray-50/50 dark:bg-zinc-900/30 shrink-0">
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
                {userRole === 'superadmin' ? 'Супер-Админ (SaaS)' : userRole === 'support_agent' ? 'Техподдержка' : userRole === 'admin' ? 'Администратор' : userRole === 'accountant' ? 'Бухгалтер' : 'Менеджер'}
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
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* PAYWALL OVERLAY */}
        {isPaywallActive && (
          <div className="absolute inset-0 z-[100] bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-red-500/10 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black font-['Montserrat'] text-zinc-900 dark:text-white mb-2">
                Подписка истекла
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
                Пробный период или оплаченный тариф завершился. Для восстановления полного доступа к системе, пожалуйста, оплатите подписку.
              </p>
              <div className="space-y-3">
                {/* BUG-002 FIX: кнопка теперь ведёт в раздел администрирования (вкладка Биллинг) */}
                <button
                  onClick={() => navigate('/crm/admin')}
                  className="w-full py-4 bg-[#F95700] hover:bg-[#CC4400] text-white rounded-xl font-bold font-mono text-xs uppercase tracking-widest transition-colors shadow-lg shadow-[#F95700]/20 cursor-pointer"
                >
                  Перейти к оплате →
                </button>
                <button onClick={logout} className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold font-mono text-xs uppercase tracking-widest transition-colors">
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={`flex-1 flex flex-col overflow-y-auto ${isPaywallActive ? 'opacity-20 pointer-events-none filter blur-sm' : ''}`}>
        
        {showSoftPaywall && (
          <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-4 md:px-8 py-3 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-4 text-sm font-medium shrink-0 z-40">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              </span>
              <span>
                Ваш пробный период заканчивается через <strong>{daysLeft} {daysLeft === 1 ? 'день' : 'дня'}</strong>. 
                Чтобы продолжить использовать все функции системы, пожалуйста, оплатите тариф.
              </span>
            </div>
            <button
              onClick={() => navigate('/crm/admin')}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Перейти к оплате
            </button>
          </div>
        )}

        {impersonatedTenant && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white px-4 md:px-8 py-2.5 shadow-md flex items-center justify-between gap-4 text-xs font-mono font-semibold animate-fadeIn shrink-0 z-50">
            <div className="flex items-center gap-2.5 truncate">
              <span className="px-2 py-0.5 rounded bg-black/30 text-amber-200 font-extrabold tracking-wider animate-pulse shrink-0">⚠️ РЕЖИМ АУДИТА</span>
              <span className="truncate font-sans text-sm font-semibold">
                Вы просматриваете кабинет клиента <strong className="underline">{impersonatedTenant.name}</strong> (ИНН: {impersonatedTenant.inn}) в режиме технической поддержки
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('impersonated_tenant');
                setImpersonatedTenant(null);
                window.dispatchEvent(new CustomEvent('tenant_impersonated', { detail: null }));
                queryClient.invalidateQueries();
                navigate('/crm/superadmin');
              }}
              className="px-3.5 py-1.5 rounded-full bg-white text-gray-900 hover:bg-zinc-100 font-bold tracking-tight shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>❌ Вернуться в консоль Вендора</span>
            </button>
          </div>
        )}
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

            {/* Кнопка техподдержки */}
            <button 
              onClick={() => navigate('/crm/support')}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-[#F95700] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800/60 active:scale-95 cursor-pointer relative"
              title="Служба Поддержки & Helpdesk"
            >
              <HelpCircle className="w-5 h-5 text-blue-500" />
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
    </>
  );
};
