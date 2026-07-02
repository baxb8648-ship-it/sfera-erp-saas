import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HardHat, Building2 } from 'lucide-react';
import { apiClient } from '../../../api/client';

export default function ConstructionDashboard() {
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ['construction_objects'],
    queryFn: () => apiClient.get('/objects/')
  });

  const constructionObjects = objects.filter((o: any) => o.object_type === 'construction');

  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Загрузка объектов...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HardHat className="w-6 h-6 text-[#F95700]" />
            Строительство и АКЗ
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Управление строительными объектами, сметами и фотоотчетами</p>
        </div>
      </div>

      {constructionObjects.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Нет строительных объектов</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Добавьте новый объект в модуле "Объекты" и укажите тип "Строительство"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {constructionObjects.map((obj: any) => (
            <Link key={obj.id} to={`/crm/construction/${obj.id}`} className="block group">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-[#F95700]/50 hover:shadow-lg transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#F95700] transition-colors">{obj.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    obj.status === 'В работе' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    obj.status === 'Завершено' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {obj.status || 'Новый'}
                  </span>
                </div>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Building2 className="w-4 h-4 mr-2" />
                    Заказчик: {obj.client_name || 'Не указан'}
                  </div>
                  {obj.custom_fields?.construction_type && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <HardHat className="w-4 h-4 mr-2" />
                      Специализация: {obj.custom_fields.construction_type}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
