import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { History, Search, Filter, Calendar, User, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  object_type: string;
  object_id: number | null;
  object_name: string | null;
  changes: string | null;
  timestamp: string;
}

export const AuditLogs: React.FC<{ isTab?: boolean }> = ({ isTab = false }) => {
  const [skip, setSkip] = useState(0);
  const [limit] = useState(50);
  const [objectType, setObjectType] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchUser, setSearchUser] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs', skip, limit, objectType, actionFilter, searchUser],
    queryFn: () => {
      const params: any = { skip, limit };
      if (objectType) params.object_type = objectType;
      if (actionFilter) params.action = actionFilter;
      if (searchUser) params.username = searchUser;
      return apiClient.get('/audit/logs', { params });
    }
  });

  const objectTypes = [
    { label: 'Все разделы', value: '' },
    { label: 'Клиенты', value: 'Клиент' },
    { label: 'Объекты', value: 'Объект' },
    { label: 'Тендеры', value: 'Тендер' },
    { label: 'Задачи', value: 'Задача' },
    { label: 'Финансы', value: 'Транзакция' },
  ];

  const actions = [
    { label: 'Все действия', value: '' },
    { label: 'Создание', value: 'создание' },
    { label: 'Обновление', value: 'обновление' },
    { label: 'Удаление', value: 'удаление' },
  ];

  const toggleExpand = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const parseChanges = (changesStr: string | null) => {
    if (!changesStr) return null;
    try {
      return JSON.parse(changesStr);
    } catch {
      return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'создание':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'обновление':
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'удаление':
        return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-50 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50';
    }
  };

  return (
    <div className={isTab ? "space-y-6" : "h-full flex flex-col space-y-6"}>
      {!isTab && (
        <Helmet>
          <title>История изменений | СФЕРА</title>
        </Helmet>
      )}

      {/* Header */}
      {isTab ? (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-5 h-5 text-[#F95700]" /> История изменений (Audit Trail)
          </h3>
          
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-400 hover:text-[#F95700] bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl shadow-sm shrink-0">
          <div>
            <h1 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight font-['Montserrat'] text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-zinc-600 to-zinc-900 dark:from-zinc-550 dark:to-zinc-800 rounded-xl text-white shadow-md">
                <History className="w-5 h-5" />
              </div>
              История изменений (Audit Trail)
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Протокол действий пользователей: отслеживание создания, изменений и удалений
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center p-3 border border-zinc-200 dark:border-zinc-750/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-850 active:scale-95 transition-all text-xs font-bold text-zinc-700 dark:text-zinc-350 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className={isTab ? "p-4 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-950 flex flex-col lg:flex-row gap-4 items-center" : "glass-panel p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center shrink-0"}>
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            placeholder="Поиск по имени пользователя..."
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 text-xs font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <select
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 text-xs font-bold cursor-pointer w-full"
            >
              {objectTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 text-xs font-bold cursor-pointer w-full"
            >
              {actions.map(act => (
                <option key={act.value} value={act.value}>{act.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className={isTab ? "space-y-3" : "glass-panel rounded-3xl flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar shadow-sm"}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-650" />
            <span className="text-xs text-zinc-500 font-bold">Загрузка логов изменений...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-450 dark:text-zinc-550">
            <History className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-xs font-black uppercase tracking-wider">История изменений пуста</span>
            <p className="text-[10px] mt-1">Возможно, действия с выбранными фильтрами отсутствуют</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const changes = parseChanges(log.changes);
              
              return (
                <div
                  key={log.id}
                  className={`border rounded-2xl transition-all duration-300 ${
                    isExpanded
                      ? 'border-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30'
                      : 'border-zinc-200/60 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Log Row Header */}
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Action tag */}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      
                      {/* Description */}
                      <div className="text-left">
                        <span className="font-bold text-zinc-900 dark:text-zinc-150 text-xs sm:text-sm">
                          {log.object_type}: <span className="text-[#F95700] dark:text-orange-400 font-extrabold">{log.object_name || `ID ${log.object_id}`}</span>
                        </span>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-450 dark:text-zinc-500 font-bold mt-1">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {log.username}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(log.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <div className="flex justify-end items-center">
                      {changes ? (
                        <button className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold">Без деталей</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && changes && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60 animate-in slide-in-from-top-1 duration-200">
                      <h4 className="text-[10px] font-black uppercase text-zinc-450 dark:text-zinc-550 tracking-wider mb-2 text-left">
                        Измененные поля:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        {Object.entries(changes).map(([field, diff]: [string, any]) => (
                          <div
                            key={field}
                            className="bg-white/60 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800/80 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                          >
                            <span className="font-extrabold text-[#F95700] dark:text-orange-400 uppercase tracking-widest text-[9px]">
                              {field}
                            </span>
                            <div className="grid grid-cols-2 gap-2 mt-1 bg-zinc-50 dark:bg-zinc-850/50 p-2 rounded-lg text-[11px] font-bold text-zinc-650 dark:text-zinc-350">
                              <div>
                                <span className="text-[9px] text-zinc-400 block mb-0.5">БЫЛО</span>
                                <span className="line-through text-rose-500">{String(diff.old)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-400 block mb-0.5">СТАЛО</span>
                                <span className="text-emerald-500">{String(diff.new)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex justify-between items-center px-4 shrink-0">
        <button
          onClick={() => setSkip(prev => Math.max(0, prev - limit))}
          disabled={skip === 0}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors select-none cursor-pointer"
        >
          Назад
        </button>
        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          Страница {Math.floor(skip / limit) + 1}
        </span>
        <button
          onClick={() => setSkip(prev => prev + limit)}
          disabled={logs.length < limit}
          className="px-4 py-2 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors select-none cursor-pointer"
        >
          Вперед
        </button>
      </div>
    </div>
  );
};
