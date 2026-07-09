import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { 
  ArrowLeft, Camera, FileText, MapPin, CloudRain, AlertTriangle,
  LayoutDashboard, Calendar, Receipt, ClipboardList, Truck, Plus
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function ConstructionProjectView() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'gantt' | 'estimate' | 'reports' | 'supply'>('overview');

  const { data: object, isLoading: isObjLoading, isError: isObjError } = useQuery({
    queryKey: ['objects', id],
    queryFn: () => apiClient.get(`/objects/${id}`)
  });

  const { data: estimate = [] } = useQuery({
    queryKey: ['construction_estimate', id],
    queryFn: () => apiClient.get(`/construction/objects/${id}/estimate`)
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['construction_reports', id],
    queryFn: () => apiClient.get(`/construction/objects/${id}/daily-reports`)
  });

  const generateKS2 = async () => {
    try {
      const res = await apiClient.post(`/construction/objects/${id}/generate-ks2`, {});
      if (res.html) {
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(res.html);
            w.document.close();
            setTimeout(() => w.print(), 500);
        }
      }
      showToast(res.message, 'success');
    } catch (e) {
      showToast('Ошибка генерации КС-2', 'error');
    }
  };

  const generateKS3 = async () => {
    try {
      const res = await apiClient.post(`/construction/objects/${id}/generate-ks3`, {});
      if (res.html) {
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(res.html);
            w.document.close();
            setTimeout(() => w.print(), 500);
        }
      }
      showToast(res.message, 'success');
    } catch (e) {
      showToast('Ошибка генерации КС-3', 'error');
    }
  };

  if (isObjLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-4 border-[#F95700] border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 dark:text-zinc-400 font-medium animate-pulse">Загрузка данных строительного объекта...</span>
      </div>
    );
  }

  if (isObjError || !object) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm max-w-lg mx-auto my-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Объект не найден или недоступен</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Возможно, у вас недостаточно прав для просмотра данного объекта, или он был удален.
          </p>
        </div>
        <Link 
          to="/crm/construction" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F95700] hover:bg-[#d84a00] text-white font-semibold rounded-xl shadow-md transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться к списку строительства</span>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Обзор объекта', icon: LayoutDashboard },
    { id: 'gantt', label: 'График работ (Гант)', icon: Calendar },
    { id: 'estimate', label: 'Смета и КС-2/КС-3', icon: Receipt },
    { id: 'reports', label: 'Журнал работ', icon: ClipboardList },
    { id: 'supply', label: 'Снабжение объекта', icon: Truck },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/crm/construction" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-2">
              {object.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">Клиент: <span className="font-semibold text-gray-700 dark:text-gray-200">{object.client_name}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={generateKS2}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Сформировать КС-2
          </button>
          <button
            onClick={generateKS3}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Сформировать КС-3
          </button>
        </div>
      </div>

      {/* Tabs Pill Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm flex overflow-x-auto scrollbar-none gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/20'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="font-bold font-['Montserrat'] text-base sm:text-lg text-gray-900 dark:text-white">Паспорт строительного объекта</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Статус</p>
                <p className="text-base font-black text-gray-900 dark:text-white mt-1">{object.status || 'В работе'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Площадь (м²)</p>
                <p className="text-base font-black text-gray-900 dark:text-white mt-1">{object.area_sqm || 'Не указана'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Специализация (АКЗ и др.)</p>
                <p className="text-base font-black text-gray-900 dark:text-white mt-1">{object.custom_fields?.construction_type || object.service_required || 'Общестрой'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gantt' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold font-['Montserrat'] text-base sm:text-lg text-gray-900 dark:text-white">График производства работ (Гант)</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Этапы выполнения объекта по срокам и готовности</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {[
                { stage: '1. Подготовительные работы и мобилизация', start: '01.07.2026', end: '15.07.2026', progress: 100, status: 'Завершено' },
                { stage: '2. Подготовка поверхности и пескоструйная очистка', start: '16.07.2026', end: '05.08.2026', progress: 75, status: 'В процессе' },
                { stage: '3. Нанесение грунтовочного и основного слоя АКЗ', start: '06.08.2026', end: '25.08.2026', progress: 20, status: 'В процессе' },
                { stage: '4. Контроль качества (толщинометрия, адгезия)', start: '26.08.2026', end: '31.08.2026', progress: 0, status: 'Запланировано' },
                { stage: '5. Сдача объекта и подписание КС-2 / КС-3', start: '01.09.2026', end: '05.09.2026', progress: 0, status: 'Запланировано' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-150 dark:border-zinc-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{item.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-zinc-400">{item.start} — {item.end}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        item.progress === 100
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : item.progress > 0
                          ? 'bg-[#F95700]/10 text-[#F95700]'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                      }`}>
                        {item.status} ({item.progress}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.progress === 100 ? 'bg-emerald-500' : 'bg-[#F95700]'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'estimate' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold font-['Montserrat'] text-base sm:text-lg text-gray-900 dark:text-white">План vs Факт расхода материалов и акты</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Контроль перерасхода по смете и генерация актов КС-2 / КС-3</p>
              </div>
              <div className="flex gap-2">
                <button onClick={generateKS2} className="px-4 py-2 bg-[#F95700] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer">
                  Сгенерировать КС-2
                </button>
                <button onClick={generateKS3} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer">
                  Сгенерировать КС-3
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs text-gray-500 dark:text-zinc-400">
                <thead className="bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Материал / Позиция</th>
                    <th className="px-4 py-3.5">План</th>
                    <th className="px-4 py-3.5">Факт</th>
                    <th className="px-4 py-3.5">Дельта (Отклонение)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {estimate.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center font-medium">Смета пуста</td></tr>
                  ) : estimate.map((est: any) => {
                    const overspent = est.actual_quantity > est.planned_quantity;
                    return (
                      <tr key={est.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{est.inventory_name}</td>
                        <td className="px-4 py-3">{est.planned_quantity} {est.inventory_unit}</td>
                        <td className="px-4 py-3 font-bold">{est.actual_quantity} {est.inventory_unit}</td>
                        <td className={`px-4 py-3 font-extrabold ${overspent ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {overspent ? '+' : ''}{(est.actual_quantity - est.planned_quantity).toFixed(2)} {est.inventory_unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h3 className="font-bold font-['Montserrat'] text-base sm:text-lg text-gray-900 dark:text-white">Журнал производства работ и фотоотчеты</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-zinc-800 before:to-transparent">
              {reports.length === 0 ? (
                <p className="text-center text-gray-500 py-10 relative z-10 text-xs font-semibold">Записи в журнале работ пока отсутствуют.</p>
              ) : reports.map((report: any) => (
                <div key={report.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-zinc-900 bg-[#F95700] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-gray-900 dark:text-white">{new Date(report.date).toLocaleDateString()}</div>
                      <div className="text-xs text-[#F95700] font-semibold">{report.author_name}</div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2">{report.text || 'Без описания'}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {report.weather_temp && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                          <CloudRain className="w-3 h-3" /> {report.weather_temp}
                        </span>
                      )}
                      {report.geo_lat && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded">
                          <MapPin className="w-3 h-3" /> Гео-метка
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'supply' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold font-['Montserrat'] text-base sm:text-lg text-gray-900 dark:text-white">Снабжение объекта и заявки на ТМЦ</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Поставки материалов на стройплощадку и статус исполнения</p>
              </div>
              <Link
                to="/crm/supply"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-600 text-white font-bold text-xs shadow-md shadow-[#F95700]/20 hover:opacity-90 transition-all self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Оформить заявку на снабжение</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="text-[10px] uppercase font-extrabold text-amber-600 dark:text-amber-400">В пути / Ожидаются</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">2 поставки</div>
                <div className="text-xs text-zinc-400 mt-1">Краска Эпоксидная, Растворитель</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400">Доставлено на объект</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">8 поставок</div>
                <div className="text-xs text-zinc-400 mt-1">Песок, Аппарат АВД, сопла</div>
              </div>
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <div className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400">Срочные заявки</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">0</div>
                <div className="text-xs text-zinc-400 mt-1">Дефицита ТМЦ нет</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
