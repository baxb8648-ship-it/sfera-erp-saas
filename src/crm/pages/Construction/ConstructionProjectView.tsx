import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { ArrowLeft, Camera, FileText, MapPin, CloudRain, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function ConstructionProjectView() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/crm/construction" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {object.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Клиент: {object.client_name}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-zinc-800 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'text-[#F95700] border-b-2 border-[#F95700]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Обзор
          </button>
          <button 
            onClick={() => setActiveTab('estimate')}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'estimate' ? 'text-[#F95700] border-b-2 border-[#F95700]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Смета и Расходы
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'reports' ? 'text-[#F95700] border-b-2 border-[#F95700]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Журнал (Фотоотчеты)
          </button>
          <button 
            onClick={() => setActiveTab('ks')}
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'ks' ? 'text-[#F95700] border-b-2 border-[#F95700]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            КС-2 / КС-3
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Информация об объекте</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="text-sm text-gray-500">Статус</p>
                  <p className="font-semibold">{object.status || 'Новый'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="text-sm text-gray-500">Площадь (м2)</p>
                  <p className="font-semibold">{object.area_sqm || 'Не указана'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="text-sm text-gray-500">Специализация (АКЗ и др.)</p>
                  <p className="font-semibold">{object.custom_fields?.construction_type || object.service_required || 'Общестрой'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'estimate' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">План vs Факт расхода материалов</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-zinc-400">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3">Материал</th>
                      <th className="px-4 py-3">План</th>
                      <th className="px-4 py-3">Факт</th>
                      <th className="px-4 py-3">Дельта (Перерасход)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center">Смета пуста</td></tr>
                    ) : estimate.map((est: any) => {
                      const overspent = est.actual_quantity > est.planned_quantity;
                      return (
                        <tr key={est.id} className="border-b border-gray-100 dark:border-zinc-800">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{est.inventory_name}</td>
                          <td className="px-4 py-3">{est.planned_quantity} {est.inventory_unit}</td>
                          <td className="px-4 py-3 font-bold">{est.actual_quantity} {est.inventory_unit}</td>
                          <td className={`px-4 py-3 font-bold ${overspent ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {overspent ? '+' : ''}{(est.actual_quantity - est.planned_quantity).toFixed(2)} {est.inventory_unit}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Журнал производства работ</h3>
              </div>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-zinc-800 before:to-transparent">
                {reports.length === 0 ? (
                  <p className="text-center text-gray-500 mt-8 relative z-10">Отчетов пока нет.</p>
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

          {activeTab === 'ks' && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg">Генерация актов (КС-2 / КС-3)</h3>
              <p className="text-gray-500 text-sm">Генерация актов приемки выполненных работ на основе внесенной сметы.</p>
              <div className="flex gap-4">
                <button onClick={generateKS2} className="flex items-center gap-2 bg-[#F95700] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
                  <FileText className="w-5 h-5" />
                  Сгенерировать КС-2
                </button>
                <button onClick={generateKS3} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-md">
                  <FileText className="w-5 h-5" />
                  Сгенерировать КС-3
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
