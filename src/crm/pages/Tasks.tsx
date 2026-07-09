import React, { useState, useEffect, useRef } from 'react';
import { Plus, CheckSquare, User, Clock, Send, MessageSquare, Trash2, Edit2, CheckCircle2, ChevronRight, MessageCircle, CornerUpLeft, ChevronDown, Target, Search } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../context/AuthContext';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  created_by_id: number;
  assigned_to_id?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  assignee_name?: string;
}

interface ChatMessage {
  id: number;
  task_id?: number;
  user_id: number;
  message: string;
  created_at: string;
  username: string;
}

interface CRMUser {
  id: number;
  username: string;
  role: string;
  is_active: number;
}

const getAvatarGradient = (username: string) => {
  const colors = [
    'from-blue-500 to-indigo-600 shadow-blue-500/10',
    'from-purple-500 to-pink-600 shadow-purple-500/10',
    'from-emerald-500 to-teal-600 shadow-emerald-500/10',
    'from-amber-500 to-orange-650 shadow-amber-500/10',
    'from-rose-500 to-red-600 shadow-rose-500/10',
    'from-cyan-500 to-blue-600 shadow-cyan-500/10',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const renderMessageText = (text: string, isMe: boolean) => {
  const parts = text.split(/(@[a-zA-Z0-9_а-яА-ЯёЁ]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      if (isMe) {
        return (
          <span key={index} className="bg-white/25 text-white px-2 py-0.5 rounded-lg font-bold inline-block my-0.5 select-all border border-white/10 shadow-sm">
            {part}
          </span>
        );
      } else {
        return (
          <span key={index} className="bg-orange-500/10 dark:bg-orange-500/20 text-[#F95700] dark:text-orange-400 px-2 py-0.5 rounded-lg font-bold inline-block my-0.5 select-all border border-orange-500/20 dark:border-orange-500/10 shadow-sm">
            {part}
          </span>
        );
      }
    }
    return part;
  });
};

export const Tasks: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Swipe-to-reply states
  const [swipingMessageId, setSwipingMessageId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  
  // Kanban columns collapse states for mobile view
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    'Новая': true,
    'В процессе': false,
    'Выполнена': false
  });

  const toggleColumn = (colTitle: string) => {
    if (window.innerWidth < 768) {
      setExpandedColumns((prev) => ({
        ...prev,
        [colTitle]: !prev[colTitle]
      }));
    }
  };
  
  // States
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'chat'>('board');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => localStorage.getItem('crm_tasks_chat_open') !== 'false');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('Новая');
  const [priority, setPriority] = useState<string>('Средний');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  // @Mention states
  const [showMentionList, setShowMentionList] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch Users
  const { data: users = [] } = useQuery<CRMUser[]>({
    queryKey: ['usersList'],
    queryFn: () => apiClient.get('/users/list')
  });

  // Fetch Tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', selectedAssignee, selectedStatus],
    queryFn: () => {
      const params: any = {};
      if (selectedAssignee !== 'all') params.assigned_to_id = Number(selectedAssignee);
      if (selectedStatus !== 'all') params.status_filter = selectedStatus;
      return apiClient.get('/tasks/', params);
    }
  });

  // Fetch Chat History
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const data = await apiClient.get<ChatMessage[]>('/tasks/chat');
        setChatMessages(data);
      } catch (err) {
        console.error('Failed to fetch chat history', err);
      }
    };
    fetchChat();
  }, []);

  // Listen to WebSocket events for Chat & Task updates
  useEffect(() => {
    const handleWsChatMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data && data.type === 'chat_message') {
        setChatMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id,
            task_id: data.task_id,
            user_id: data.user_id,
            message: data.message,
            created_at: data.created_at,
            username: data.username
          }];
        });

        if (data.username === 'AI-Копилот') {
          setIsAiThinking(false);
        }

        // Increment unread chat count on mobile if user is not on chat tab and it is not their own message
        if (data.user_id !== currentUser?.id) {
          if (window.innerWidth < 1024 && activeTab !== 'chat') {
            setUnreadChatCount((prev) => prev + 1);
          }
        }
      } else if (data && data.type === 'chat_message_status') {
        if (data.status === 'thinking') {
          setIsAiThinking(true);
        }
      }
    };

    const handleTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    window.addEventListener('ws_chat_message', handleWsChatMessage);
    window.addEventListener('open_email_modal', handleTaskUpdated); // Or other triggers
    
    return () => {
      window.removeEventListener('ws_chat_message', handleWsChatMessage);
    };
  }, [queryClient, activeTab, currentUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Mark chat messages as read
  useEffect(() => {
    if (!currentUser || chatMessages.length === 0) return;
    
    const maxMsgId = Math.max(...chatMessages.map(m => m.id));
    const key = `last_read_chat_msg_id_${currentUser.id}`;
    const storedId = Number(localStorage.getItem(key) || '0');
    
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop || activeTab === 'chat') {
      if (maxMsgId > storedId) {
        localStorage.setItem(key, maxMsgId.toString());
        window.dispatchEvent(new CustomEvent('chat_messages_read', { detail: { maxMsgId } }));
      }
    }
  }, [chatMessages, activeTab, currentUser]);

  // Handle Mentions Filter
  const filteredMentionUsers = users.filter((u) =>
    u.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (newTask: any) => apiClient.post('/tasks/', newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedFields }: { id: number; updatedFields: any }) =>
      apiClient.put(`/tasks/${id}`, updatedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/tasks/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (oldData) => {
        if (!oldData) return [];
        return oldData.filter(task => task.id !== variables);
      });
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('Новая');
    setPriority('Средний');
    setAssignedToId('');
    setDueDate('');
    setEditingTaskId(null);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setModalMode('edit');
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setAssignedToId(task.assigned_to_id ? task.assigned_to_id.toString() : '');
    setDueDate(task.due_date ? task.due_date.substring(0, 16) : '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigned_to_id: assignedToId ? Number(assignedToId) : undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined
    };

    if (modalMode === 'create') {
      createTaskMutation.mutate(taskData);
    } else if (modalMode === 'edit' && editingTaskId) {
      updateTaskMutation.mutate({ id: editingTaskId, updatedFields: taskData });
    }
  };

  const handleStatusChange = (task: Task, nextStatus: string) => {
    updateTaskMutation.mutate({
      id: task.id,
      updatedFields: { status: nextStatus }
    });
  };

  // Chat message submit
  const handleSendChatMessage = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const sentMsg = await apiClient.post<ChatMessage>('/tasks/chat', { message: newMessage.trim() });
      if (sentMsg) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
      setNewMessage('');
      setShowMentionList(false);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Touch event handlers for swipe-to-reply
  const handleTouchStart = (e: React.TouchEvent, msgId: number) => {
    touchStartXRef.current = e.touches[0].clientX;
    setSwipingMessageId(msgId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipingMessageId === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;
    
    // Only allow swipe to the right, max offset 80px
    if (diffX > 0) {
      setSwipeOffset(Math.min(diffX, 80));
    }
  };

  const handleTouchEnd = (msg: ChatMessage) => {
    if (swipingMessageId === null) return;
    
    if (swipeOffset >= 50) {
      const userMention = `@${msg.username} `;
      if (!newMessage.includes(userMention)) {
        setNewMessage((prev) => {
          const trimmed = prev.trim();
          if (trimmed) {
            return `${userMention}${trimmed}`;
          }
          return userMention;
        });
      }
      
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
      
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const newPos = chatInputRef.current.value.length;
          chatInputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
    
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  const handleReplyClick = (username: string) => {
    const userMention = `@${username} `;
    if (!newMessage.includes(userMention)) {
      setNewMessage((prev) => {
        const trimmed = prev.trim();
        if (trimmed) {
          return `${userMention}${trimmed}`;
        }
        return userMention;
      });
    }
    
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        const newPos = chatInputRef.current.value.length;
        chatInputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    // Detect @ symbol for mention autocomplete
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1 && lastAtIdx >= textBeforeCursor.lastIndexOf(' ')) {
      const q = textBeforeCursor.substring(lastAtIdx + 1);
      setMentionQuery(q);
      setShowMentionList(true);
      setMentionIndex(0);
    } else {
      setShowMentionList(false);
    }
  };

  const insertMention = (user: CRMUser) => {
    const cursor = chatInputRef.current?.selectionStart || 0;
    const textBeforeCursor = newMessage.substring(0, cursor);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIdx !== -1) {
      const textAfterCursor = newMessage.substring(cursor);
      const mentionText = `@${user.username} `;
      const newText = newMessage.substring(0, lastAtIdx) + mentionText + textAfterCursor;
      setNewMessage(newText);
      setShowMentionList(false);
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          const newPos = lastAtIdx + mentionText.length;
          chatInputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const handleChatInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredMentionUsers[mentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionList(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage(e);
    }
  };

  const getPriorityBadgeColor = (prio: string) => {
    switch (prio) {
      case 'Высокий': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'Средний': return 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    }
  };

  const getDueDateStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { label: 'Просрочено', color: 'text-rose-500 dark:text-rose-400' };
    if (days <= 1) return { label: 'Сегодня/Завтра', color: 'text-amber-500 dark:text-amber-400 animate-pulse' };
    return { label: `Срок: ${new Date(dateStr).toLocaleDateString('ru-RU')}`, color: 'text-gray-500 dark:text-zinc-400' };
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.assignee_name && t.assignee_name.toLowerCase().includes(q))
    );
  });

  // Group tasks by status for Kanban Board
  const tasksByStatus = {
    'Новая': filteredTasks.filter((t) => t.status === 'Новая'),
    'В процессе': filteredTasks.filter((t) => t.status === 'В процессе'),
    'Выполнена': filteredTasks.filter((t) => t.status === 'Выполнена')
  };

  return (
    <div className={`flex flex-col lg:flex-row h-[calc(100dvh-150px)] lg:h-[calc(100vh-80px)] min-h-0 relative font-['Inter'] transition-all duration-300 ${
      isChatOpen ? 'gap-6' : 'gap-0'
    }`}>
      <Helmet>
        <title>Задачи и Командный Чат | СФЕРА</title>
      </Helmet>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden flex border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-1 shrink-0">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'board'
              ? 'bg-[#F95700]/10 text-[#F95700]'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Доска задач
        </button>
        <button
          onClick={() => {
            setActiveTab('chat');
            setUnreadChatCount(0);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-[#F95700]/10 text-[#F95700]'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Чат команды
          {unreadChatCount > 0 && (
            <span className="bg-[#F95700] text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse font-black">
              {unreadChatCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Board Area (Kanban) */}
      <div className={`flex-1 flex flex-col min-w-0 space-y-4 h-full ${activeTab === 'board' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Header Filters */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-start gap-4 md:gap-8">
          <div className="flex items-center gap-2 shrink-0">
            <CheckSquare className="w-6 h-6 text-[#F95700]" />
            <h1 className="text-xl font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100">
              Задачи команды
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по задачам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
            >
              <option value="all">Все исполнители</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setIsChatOpen(prev => {
                  const next = !prev;
                  localStorage.setItem('crm_tasks_chat_open', next.toString());
                  return next;
                });
              }}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isChatOpen
                  ? 'bg-[#F95700]/10 border-[#F95700]/30 text-[#F95700]'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isChatOpen ? "Скрыть чат" : "Показать чат"}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{isChatOpen ? "Скрыть чат" : "Чат"}</span>
            </button>

            <button
              onClick={() => navigate('/crm/special-tasks')}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl active:scale-95 transition-all select-none cursor-pointer"
            >
              <Target className="w-4 h-4 text-[#F95700]" /> Спецзадания
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F95700] hover:bg-[#ff7324] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-orange-500/10 select-none cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Добавить задачу
            </button>
          </div>
        </div>

        {/* Board Columns Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-y-auto">
          {(Object.keys(tasksByStatus) as Array<keyof typeof tasksByStatus>).map((colTitle) => {
            const colTasks = tasksByStatus[colTitle];
            const isExpanded = expandedColumns[colTitle] !== false;
            const colHeaderColor = 
              colTitle === 'Новая' ? 'border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400' :
              colTitle === 'В процессе' ? 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400' :
              'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400';

            return (
              <div 
                key={colTitle} 
                className={`flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl transition-all duration-300 ${
                  isExpanded ? 'p-4 h-full' : 'p-3 h-auto md:p-4 md:h-full'
                }`}
              >
                <div 
                  onClick={() => toggleColumn(colTitle)}
                  className={`flex items-center justify-between p-2 rounded-xl border font-bold text-xs uppercase tracking-wider select-none cursor-pointer md:cursor-default ${colHeaderColor} ${
                    isExpanded ? 'mb-4' : 'mb-0 md:mb-4'
                  } transition-all duration-200`}
                >
                  <div className="flex items-center gap-1.5">
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform duration-200 md:hidden ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      }`} 
                    />
                    <span>{colTitle}</span>
                  </div>
                  <span className="bg-white/90 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-inherit shadow-sm">{colTasks.length}</span>
                </div>

                <div className={`flex-1 overflow-y-auto space-y-3 pr-1 transition-all duration-300 ${
                  isExpanded ? 'block opacity-100' : 'hidden md:block md:opacity-100'
                }`}>
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 text-[10px] font-bold">
                      Нет задач
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const dueStatus = getDueDateStatus(task.due_date);
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleOpenEditModal(task)}
                          className="glass-panel p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800/45 bg-white dark:bg-zinc-900 hover:border-[#F95700]/30 dark:hover:border-[#F95700]/30 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 shadow-sm relative group flex flex-col justify-between min-h-[140px] text-left cursor-pointer"
                        >
                          <div className="space-y-1.5 pr-14">
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md ${getPriorityBadgeColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(task); }}
                                  className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmTaskId(task.id); }}
                                  className="p-1 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3 font-normal leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] font-bold">
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                              <User className="w-3 h-3 text-[#F95700]" />
                              <span className="truncate max-w-[80px]" title={task.assignee_name || 'Не назначен'}>
                                {task.assignee_name || 'Не назначен'}
                              </span>
                            </div>

                            {dueStatus ? (
                              <div className={`flex items-center gap-1 ${dueStatus.color}`}>
                                <Clock className="w-3 h-3" />
                                <span>{dueStatus.label}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700">Без срока</span>
                            )}
                          </div>

                          {/* Quick transition shortcuts */}
                          <div className="absolute right-3 top-10 flex flex-col gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            {task.status !== 'В процессе' && task.status !== 'Выполнена' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'В процессе'); }}
                                className="flex items-center justify-center w-7 h-7 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg border border-amber-500/20 transition-all cursor-pointer"
                                title="Взять в работу"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                            {task.status !== 'Выполнена' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'Выполнена'); }}
                                className="flex items-center justify-center w-7 h-7 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
                                title="Выполнить задачу"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Chat Sidebar Widget (General Team Chat) - Premium Bento-glass design */}
      <div className={`w-full lg:w-80 glass-panel rounded-3xl flex flex-col shadow-xl h-full min-h-0 border border-zinc-200/50 dark:border-zinc-800/80 transition-all duration-300 ${
        activeTab === 'chat' 
          ? 'flex' 
          : isChatOpen 
            ? 'hidden lg:flex opacity-100 transform translate-x-0' 
            : 'hidden lg:flex lg:w-0 lg:opacity-0 lg:translate-x-4 lg:pointer-events-none lg:border-none'
      }`}>
        <div className="p-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-white/20 dark:bg-zinc-900/20 backdrop-blur-md rounded-t-3xl">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#F95700]" />
            <h3 className="font-extrabold text-xs text-[#1a1a1a] dark:text-zinc-150 tracking-wider font-['Montserrat'] uppercase">
              Чат команды
            </h3>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0 bg-zinc-50/10 dark:bg-zinc-950/5 scrollbar-thin">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-550">
              <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold">Сообщений пока нет</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">Начните диалог первым!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMe = msg.user_id === currentUser?.id;
              const formattedTime = new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              });
              const initials = msg.username ? msg.username.substring(0, 2).toUpperCase() : '??';
              const isSwiping = swipingMessageId === msg.id;
              const translateStyle = isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0px)';

              return (
                <div 
                  key={msg.id} 
                  className="relative overflow-hidden w-full select-none"
                  style={{ touchAction: 'pan-y' }}
                  onTouchStart={(e) => handleTouchStart(e, msg.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(msg)}
                  onTouchCancel={() => {
                    setSwipingMessageId(null);
                    setSwipeOffset(0);
                  }}
                >
                  {/* Reply icon revealed behind bubble */}
                  <div 
                     className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-[#F95700] transition-all duration-100 pointer-events-none"
                    style={{
                      opacity: isSwiping ? Math.min(swipeOffset / 50, 1) : 0,
                      transform: isSwiping ? `scale(${Math.min(swipeOffset / 50, 1)})` : 'scale(0)',
                    }}
                  >
                    <CornerUpLeft className="w-4 h-4" />
                  </div>

                  <div 
                    className={`flex items-start gap-3.5 ${isMe ? 'flex-row-reverse' : ''} text-left group animate-in fade-in slide-in-from-bottom-3 duration-300`}
                    style={{
                      transform: translateStyle,
                      transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* Avatar bubble with premium gradients */}
                    <div 
                      onClick={() => !isMe && handleReplyClick(msg.username)}
                      title={!isMe ? "Ответить" : undefined}
                      className={`w-9 h-9 rounded-full text-[11px] font-bold flex items-center justify-center shadow-lg select-none shrink-0 transition-transform hover:scale-110 active:scale-95 duration-200 bg-gradient-to-tr ${
                        isMe 
                          ? 'from-orange-500 to-[#F95700] text-white shadow-orange-500/20' 
                          : msg.username === 'AI-Копилот'
                            ? 'from-indigo-600 via-purple-600 to-indigo-400 text-white border border-indigo-400/20 shadow-indigo-500/25 cursor-pointer text-xs'
                            : `${getAvatarGradient(msg.username)} text-white cursor-pointer`
                      }`}
                    >
                      {msg.username === 'AI-Копилот' ? '🤖' : initials}
                    </div>

                    {/* Message bubble */}
                    <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span 
                          onClick={() => handleReplyClick(msg.username)}
                          title="Ответить"
                          className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 ml-2 mb-1 uppercase tracking-wider cursor-pointer hover:text-[#F95700] transition-colors"
                        >
                          {msg.username}
                        </span>
                      )}
                      <div className={`px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed break-words shadow-md transition-all duration-200 hover:shadow-lg ${
                        isMe 
                          ? 'bg-gradient-to-br from-orange-500 via-[#F95700] to-[#e04e00] text-white rounded-tr-none shadow-orange-500/10 hover:shadow-orange-500/25' 
                          : msg.username === 'AI-Копилот'
                            ? 'bg-gradient-to-br from-indigo-950 via-zinc-900 to-purple-950 text-zinc-100 dark:text-zinc-100 border border-indigo-500/30 rounded-tl-none shadow-indigo-500/10 hover:border-indigo-500/50'
                            : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/80 rounded-tl-none hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}>
                        {renderMessageText(msg.message, isMe)}
                      </div>
                      <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-550 mt-1 px-1.5 select-none">{formattedTime}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* AI Thinking Bubble */}
          {isAiThinking && (
            <div className="flex items-start gap-3.5 text-left group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shadow-lg select-none shrink-0 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-400 text-white border border-indigo-400/20 shadow-indigo-500/25 animate-pulse">
                🤖
              </div>
              <div className="max-w-[78%] flex flex-col items-start">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 ml-2 mb-1 uppercase tracking-wider">
                  AI-Копилот
                </span>
                <div className="px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-indigo-500/30 rounded-tl-none shadow-md shadow-indigo-500/5 dark:shadow-none flex items-center gap-1.5 min-w-[90px] relative overflow-hidden">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F95700] dark:bg-orange-550 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-bounce"></span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold ml-1">думает...</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Form with @Mention Autocomplete */}
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/20 dark:bg-zinc-900/20 backdrop-blur-md rounded-b-3xl relative shrink-0">
          {showMentionList && filteredMentionUsers.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-36 overflow-y-auto mb-1 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left">
              {filteredMentionUsers.map((u, idx) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => insertMention(u)}
                  className={`w-full flex items-center px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${idx === mentionIndex ? 'bg-orange-50 dark:bg-orange-950/20 text-[#F95700]' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <User className="w-3.5 h-3.5 mr-2 opacity-60" />
                  <span>{u.username}</span>
                  <span className="ml-auto text-[9px] text-zinc-400 dark:text-zinc-550 capitalize">{u.role === 'admin' ? 'Админ' : 'Менеджер'}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendChatMessage} className="flex gap-2 items-end">
            <textarea
              ref={chatInputRef}
              value={newMessage}
              onChange={handleChatInputChange}
              onKeyDown={handleChatInputKeyDown}
              placeholder="Напишите сообщение..."
              rows={1}
              className="flex-1 resize-none bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-850 rounded-2xl px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#F95700]/40 placeholder-zinc-400 scrollbar-none max-h-20 transition-all duration-200"
              style={{ height: '38px' }}
            />
            <button
              type="submit"
              onClick={handleSendChatMessage}
              disabled={!newMessage.trim()}
              className="p-2.5 bg-gradient-to-r from-orange-500 to-[#F95700] hover:from-[#ff7324] hover:to-orange-500 text-white rounded-2xl active:scale-95 disabled:opacity-40 transition-all select-none cursor-pointer shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/45 backdrop-blur-[5px] p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200/40 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4.5 h-4.5 text-[#F95700]" />
                {modalMode === 'create' ? 'Создать новую задачу' : 'Редактировать задачу'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Название задачи *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Что необходимо сделать?"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Добавьте подробности или требования к задаче..."
                  rows={4}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Приоритет</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  >
                    <option value="Низкий">Низкий</option>
                    <option value="Средний">Средний</option>
                    <option value="Высокий">Высокий</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Исполнитель</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  >
                    <option value="">Не назначен</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Срок выполнения (Due Date)</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 uppercase">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  >
                    <option value="Новая">Новая</option>
                    <option value="В процессе">В процессе</option>
                    <option value="Выполнена">Выполнена</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  className="px-5 py-2 bg-[#F95700] hover:bg-[#ff7324] text-white rounded-xl text-xs font-bold select-none cursor-pointer disabled:opacity-50"
                >
                  {modalMode === 'create' ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmTaskId !== null && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[5px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 transform scale-95 transition-all text-left">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <Trash2 className="w-4.5 h-4.5 text-rose-500" /> Подтверждение удаления
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
              Вы уверены, что хотите безвозвратно удалить эту задачу? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTaskId(null)}
                className="px-4 py-2 border border-zinc-250 dark:border-zinc-700 text-xs font-bold text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTaskId !== null) {
                    deleteTaskMutation.mutate(deleteConfirmTaskId);
                    setDeleteConfirmTaskId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
