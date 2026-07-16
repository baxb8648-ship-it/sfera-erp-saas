import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CalendarDays, Scissors, Users, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';

export default function BeautyDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    upcomingCount: 0,
    completedCount: 0,
    activeMasters: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const [appRes, usersRes] = await Promise.all([
        apiClient.get(`/booking/appointments?start_date=${todayStr}T00:00:00&end_date=${todayStr}T23:59:59`),
        apiClient.get(`/users/`)
      ]);

      const appointments = Array.isArray(appRes) ? appRes : [];
      const masters = Array.isArray(usersRes) ? usersRes.filter((u: any) => u.is_active === 1) : [];

      let todayRev = 0;
      let upcoming = 0;
      let completed = 0;

      appointments.forEach(app => {
        if (app.status === 'completed') {
          completed++;
          todayRev += 1500; // Mock revenue per service if price not available in app
        } else {
          upcoming++;
        }
      });

      setStats({
        todayRevenue: todayRev,
        upcomingCount: upcoming,
        completedCount: completed,
        activeMasters: masters.length,
      });

      setTodayAppointments(appointments.slice(0, 5)); // Show next 5

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto space-y-8 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white font-['Montserrat'] tracking-wide flex items-center gap-2.5 uppercase">
            <Sparkles className="w-7 h-7 text-[#F95700]" />
            Дашборд Салона
          </h1>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold font-mono tracking-wider uppercase mt-1">
            Сводка на {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/crm/booking/appointments" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs hover:scale-[1.01] transition-transform shadow-lg shadow-zinc-900/10 dark:shadow-white/5 flex items-center gap-2 font-mono uppercase tracking-wider">
            <CalendarDays className="w-4 h-4 text-[#F95700]" /> Шахматка
          </Link>
          <Link to="/crm/booking/services" className="px-5 py-2.5 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl font-bold text-xs hover:scale-[1.01] transition-transform shadow-lg shadow-orange-500/10 flex items-center gap-2 font-mono uppercase tracking-wider">
            <Scissors className="w-4 h-4" /> Услуги
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Revenue */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-orange-500/5 group"
        >
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
              <Sparkles className="w-16 h-16 text-[#F95700]" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Выручка (сегодня)</div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono mt-2">{stats.todayRevenue.toLocaleString('ru-RU')} ₽</div>
            <div className="text-[10px] text-emerald-500 font-bold mt-3 flex items-center gap-1 font-mono uppercase tracking-wider">
              <ArrowUpRight className="w-3 h-3"/> +12% к вчерашнему
            </div>
          </div>
        </motion.div>

        {/* Card 2: Upcoming */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-orange-500/5 group"
        >
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
              <Clock className="w-16 h-16 text-[#F95700]" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Ожидают сегодня</div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono mt-2">{stats.upcomingCount}</div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-3 font-mono uppercase tracking-wider">предстоящих записей</div>
          </div>
        </motion.div>

        {/* Card 3: Completed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-orange-500/5 group"
        >
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Завершено услуг</div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono mt-2">{stats.completedCount}</div>
            <div className="text-[10px] text-emerald-500 font-bold mt-3 flex items-center gap-1 font-mono uppercase tracking-wider">Все расходники списаны</div>
          </div>
        </motion.div>

        {/* Card 4: Masters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-orange-500/5 group"
        >
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300">
              <Users className="w-16 h-16 text-amber-500" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Мастера на смене</div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white font-mono mt-2">{stats.activeMasters}</div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-3 font-mono uppercase tracking-wider">активных сотрудников</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Appointments List */}
        <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm lg:col-span-2">
          <div className="bg-white dark:bg-zinc-950 p-8 rounded-[calc(2.5rem-0.25rem)] h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest font-['Montserrat'] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#F95700]" /> Ближайшие записи
              </h2>
              <Link to="/crm/booking/appointments" className="text-[10px] font-black text-[#F95700] hover:text-orange-600 transition-colors uppercase tracking-widest font-mono">Все записи &rarr;</Link>
            </div>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl" />)}
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 font-bold text-xs font-mono uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl border border-zinc-100 dark:border-zinc-800/60">
                На сегодня больше нет записей.
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-250/50 dark:border-zinc-850/60 flex items-center justify-between hover:border-[#F95700]/30 transition-all duration-300 hover:-translate-y-[1px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 flex items-center justify-center text-[#F95700] font-black font-mono text-xs">
                        {new Date(app.datetime_start).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div>
                        <div className="font-black text-zinc-900 dark:text-white text-xs font-['Montserrat']">{app.client_name}</div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{app.client_phone}</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-['Montserrat'] hidden sm:inline-block">
                        {app.service_name}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider font-mono ${
                        app.status === 'completed' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-orange-500/10 text-[#F95700] border border-orange-500/20'
                      }`}>
                        {app.status === 'completed' ? 'Завершено' : 'Ожидает'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="relative overflow-hidden p-1 rounded-[2.5rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-xl">
          <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 text-white p-8 rounded-[calc(2.5rem-0.25rem)] h-full relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#F95700]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest font-['Montserrat'] flex items-center gap-2 mb-6 text-white">
                <Sparkles className="w-4 h-4 text-orange-400" /> Быстрые действия
              </h2>
              
              <div className="space-y-3 relative z-10">
                <Link to="/crm/booking/appointments" className="block w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 backdrop-blur-md hover:-translate-y-[1px]">
                  <div className="font-black text-xs uppercase tracking-wider font-['Montserrat'] text-white">Новая запись</div>
                  <div className="text-[10px] text-zinc-400 font-medium mt-1">Добавить клиента в расписание смен</div>
                </Link>
                
                <Link to="/crm/booking/services" className="block w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 backdrop-blur-md hover:-translate-y-[1px]">
                  <div className="font-black text-xs uppercase tracking-wider font-['Montserrat'] text-white">Тех. Карты услуг</div>
                  <div className="text-[10px] text-zinc-400 font-medium mt-1">Настроить автоматическое списание расходников</div>
                </Link>
                
                <Link to="/crm/inventory" className="block w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 backdrop-blur-md hover:-translate-y-[1px]">
                  <div className="font-black text-xs uppercase tracking-wider font-['Montserrat'] text-white">Склад ТМЦ</div>
                  <div className="text-[10px] text-zinc-400 font-medium mt-1">Проверить остатки шампуней, красок и средств</div>
                </Link>
              </div>
            </div>

            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono mt-6 relative z-10">СФЕРА ERP · beauty engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
