import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckSquare, User, Clock, ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';

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

export const TmaKanban: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeColumn, setActiveColumn] = useState<'Новая' | 'В процессе' | 'Выполнена'>('Новая');
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  // Telegram WebApp API
  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      // Set headers and background based on Telegram theme
      if (tg.themeParams?.bg_color) {
        document.body.style.backgroundColor = tg.themeParams.bg_color;
      }
    }
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Task[]>('/tasks/');
      if (data) setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (task: Task, nextStatus: string) => {
    // Medium haptic feedback when changing status
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    try {
      const updated = await apiClient.put(`/tasks/${task.id}`, {
        title: task.title,
        status: nextStatus,
        priority: task.priority
      });
      if (updated) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
        
        // Success notification haptic feedback on completion
        if (nextStatus === 'Выполнена' && tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'Высокий': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'Средний': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const getDueDateStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Просрочено', color: 'text-rose-400' };
    if (days <= 1) return { label: 'Сегодня/Завтра', color: 'text-amber-400' };
    return { label: `Срок: ${new Date(dateStr).toLocaleDateString('ru-RU')}`, color: 'text-zinc-400' };
  };

  const handleColumnSwitch = (col: 'Новая' | 'В процессе' | 'Выполнена') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
    setActiveColumn(col);
  };

  const filteredTasks = tasks.filter(t => t.status === activeColumn);

  return (
    <div className="min-h-screen text-white p-4 font-sans select-none flex flex-col" style={{
      background: tg?.themeParams?.bg_color || '#09090b',
      color: tg?.themeParams?.text_color || '#ffffff'
    }}>
      <Helmet>
        <title>CRM Mini App | СФЕРУМ</title>
      </Helmet>

      {/* Header Info Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 backdrop-blur-[20px] bg-white/5 dark:bg-zinc-950/20 shadow-xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg shadow-red-500/20">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase font-['Montserrat']">
              СФЕРУМ
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">
              Telegram Mini App • Задачи
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Онлайн
        </div>
      </div>

      {/* Swipeable Columns Menu selector */}
      <div className="grid grid-cols-3 gap-1.5 bg-white/5 dark:bg-zinc-900/40 p-1 rounded-xl border border-white/5 mb-4 backdrop-blur-md">
        {(['Новая', 'В процессе', 'Выполнена'] as const).map(col => (
          <button
            key={col}
            onClick={() => handleColumnSwitch(col)}
            className={`py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeColumn === col
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {col}
            <span className="ml-1 px-1.5 py-0.5 bg-black/20 rounded-md text-[8px] font-bold">
              {tasks.filter(t => t.status === col).length}
            </span>
          </button>
        ))}
      </div>

      {/* Kanban Tasks Body */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-2">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Загрузка задач...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-550 border border-dashed border-white/5 rounded-2xl bg-white/2 animate-fade-in p-6">
            <Sparkles className="w-8 h-8 text-zinc-600 mb-2" />
            <span className="text-xs font-bold">Нет задач в этой колонке</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Все дела на сегодня выполнены!</span>
          </div>
        ) : (
          filteredTasks.map(task => {
            const due = getDueDateStatus(task.due_date);
            return (
              <div
                key={task.id}
                onClick={() => setExpandedTaskId(prev => prev === task.id ? null : task.id)}
                className="glass-panel p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-[20px] shadow-lg flex flex-col justify-between min-h-[120px] transition-all relative overflow-hidden group animate-fade-in cursor-pointer"
              >
                {/* Visual Glass Accent */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />

                <div className="space-y-2 pr-10">
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white leading-snug">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p 
                      className={`text-[10px] text-zinc-450 leading-relaxed font-medium transition-all ${
                        expandedTaskId === task.id ? '' : 'line-clamp-2'
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: task.description
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br />')
                      }}
                    />
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-zinc-400">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-red-500" />
                    <span className="truncate max-w-[80px]">
                      {task.assignee_name || 'Не назначен'}
                    </span>
                  </div>

                  {due ? (
                    <div className={`flex items-center gap-1 ${due.color}`}>
                      <Clock className="w-3 h-3" />
                      <span>{due.label}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-650">Без срока</span>
                  )}
                </div>

                {/* Quick actions for TMA swiping/taps */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                  {task.status === 'Новая' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'В процессе'); }}
                      className="flex items-center justify-center w-7 h-7 bg-amber-500/20 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm"
                      title="Взять в работу"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {task.status === 'В процессе' && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'Новая'); }}
                        className="flex items-center justify-center w-7 h-7 bg-blue-500/20 hover:bg-blue-500 border border-blue-500/30 text-blue-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm"
                        title="Вернуть в новые"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(task, 'Выполнена'); }}
                        className="flex items-center justify-center w-7 h-7 bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm"
                        title="Выполнить"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
