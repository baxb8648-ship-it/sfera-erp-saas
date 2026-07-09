import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  HardHat, Building2, Calendar, Truck, ArrowRight, CheckCircle, Clock
} from 'lucide-react';
import { apiClient } from '../../../api/client';

export default function ConstructionDashboard() {
  const [activeTab, setActiveTab] = useState<'objects' | 'gantt' | 'supply'>('objects');

  const { data: objects = [], isLoading } = useQuery({
    queryKey: ['construction_objects'],
    queryFn: () => apiClient.get('/objects/')
  });

  const constructionObjects = objects.filter((o: any) => o.object_type === 'construction');

  const activeCount = constructionObjects.filter((o: any) => o.status === 'В работе').length;
  const completedCount = constructionObjects.filter((o: any) => o.status === 'Завершено').length;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Загрузка объектов строительства...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-[#F95700]/10 rounded-xl">
              <HardHat className="w-6 h-6 text-[#F95700]" />
            </div>
            Строительство и АКЗ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Комплексное управление объектами, графиками выполнения работ и поставками ТМЦ
          </p>
        </div>

        {/* Табы навигации */}
        <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('objects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'objects'
                ? 'bg-white dark:bg-zinc-800 text-[#F95700] shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Объекты ({constructionObjects.length})
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'gantt'
                ? 'bg-white dark:bg-zinc-800 text-[#F95700] shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            График (Гант)
          </button>
          <button
            onClick={() => setActiveTab('supply')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'supply'
                ? 'bg-white dark:bg-zinc-800 text-[#F95700] shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            Снабжение
          </button>
        </div>
      </div>

      {/* KPI Сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Всего объектов</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{constructionObjects.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">В активной работе</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Завершено сдачей</p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Снабжение площадок</p>
            <p className="text-2xl font-black text-[#F95700] mt-1">Активно</p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl text-[#F95700]">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'objects' && (
        constructionObjects.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Нет строительных объектов</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Добавьте новый объект в модуле "Объекты" и укажите тип "Строительство"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {constructionObjects.map((obj: any) => {
              const progress = obj.status === 'Завершено' ? 100 : obj.status === 'В работе' ? 65 : 25;
              return (
                <Link key={obj.id} to={`/crm/construction/${obj.id}`} className="block group">
                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 hover:border-[#F95700]/50 hover:shadow-xl transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#F95700] transition-colors">
                          {obj.name}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          obj.status === 'В работе' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                          obj.status === 'Завершено' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {obj.status || 'Новый'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Building2 className="w-4 h-4 mr-2 text-zinc-400" />
                          Заказчик: <span className="font-semibold text-gray-700 dark:text-zinc-300 ml-1">{obj.client_name || 'Не указан'}</span>
                        </div>
                        {obj.custom_fields?.construction_type && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <HardHat className="w-4 h-4 mr-2 text-zinc-400" />
                            Работы: <span className="font-semibold text-gray-700 dark:text-zinc-300 ml-1">{obj.custom_fields.construction_type}</span>
                          </div>
                        )}
                      </div>

                      {/* Прогресс выполнения */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-zinc-400">Готовность объекта:</span>
                          <span className="text-[#F95700]">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-orange-500 to-[#F95700] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-[#F95700]">
                      <span>Открыть карточку, смету и Гант</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Вкладка Гант */}
      {activeTab === 'gantt' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Сводный график работ по всем объектам</h3>
              <p className="text-xs text-gray-500">Шкала готовности ключевых этапов (Подготовка → АКЗ → КС-2)</p>
            </div>
            <span className="text-xs font-bold text-[#F95700] bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-full">
              План-график 2026
            </span>
          </div>

          <div className="space-y-4">
            {constructionObjects.map((obj: any) => {
              const progress = obj.status === 'Завершено' ? 100 : obj.status === 'В работе' ? 65 : 25;
              return (
                <div key={obj.id} className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800/80 hover:border-orange-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{obj.name}</h4>
                      <p className="text-xs text-gray-500">Заказчик: {obj.client_name || 'Не указан'}</p>
                    </div>
                    <Link
                      to={`/crm/construction/${obj.id}`}
                      className="text-xs font-bold text-[#F95700] hover:underline flex items-center gap-1"
                    >
                      Перейти к детализации <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-[#F95700] h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold mt-1.5">
                    <span>Подготовительные работы</span>
                    <span>Пескоструйная очистка / АКЗ</span>
                    <span>Сдача КС-2 / КС-3</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Вкладка Снабжение */}
      {activeTab === 'supply' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <Truck className="w-12 h-12 text-[#F95700] mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Снабжение строительных объектов</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Управляйте закупками ЛКМ, металлопроката и расходных материалов на общей доске поставок
          </p>
          <div>
            <Link
              to="/crm/supply"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#F95700] hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all"
            >
              Перейти к Канбан-доске снабжения
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
