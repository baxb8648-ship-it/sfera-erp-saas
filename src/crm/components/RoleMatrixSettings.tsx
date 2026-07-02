import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';

interface ModulePermission {
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  own_only: boolean;
}

export const RoleMatrixSettings: React.FC = () => {
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const ALL_ROLES = ['admin', 'manager', 'accountant', 'support_agent'];
  const ALL_MODULES = [
    'clients', 'objects', 'finance', 'tasks', 'tenders',
    'inventory', 'equipment', 'templates', 'analytics', 'audit', 'support'
  ];

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<ModulePermission[]>('/permissions/');
      setPermissions(data || []);
    } catch (error) {
      console.error('Failed to load role matrix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const getPerm = (role: string, module: string) => {
    return permissions.find(p => p.role === role && p.module === module) || {
      role, module, can_read: false, can_write: false, can_delete: false, own_only: false
    };
  };

  const togglePerm = (role: string, module: string, field: keyof ModulePermission) => {
    setPermissions(prev => {
      const existingIdx = prev.findIndex(p => p.role === role && p.module === module);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], [field]: !next[existingIdx][field] };
        return next;
      } else {
        const newPerm: ModulePermission = { role, module, can_read: false, can_write: false, can_delete: false, own_only: false };
        (newPerm as any)[field] = true;
        return [...prev, newPerm];
      }
    });
  };

  const saveMatrix = async () => {
    setIsSaving(true);
    try {
      // Сохраняем права по одному модулю-роли
      for (const p of permissions) {
        await apiClient.put(`/permissions/${p.role}/${p.module}`, p);
      }
      alert('Матрица прав успешно сохранена');
    } catch (error) {
      console.error('Error saving matrix:', error);
      alert('Ошибка при сохранении матрицы прав');
    } finally {
      setIsSaving(false);
    }
  };

  const seedDefaults = async () => {
    if (!window.confirm('Сбросить матрицу прав до значений по умолчанию? Все ручные настройки будут утеряны.')) return;
    setIsLoading(true);
    try {
      await apiClient.post('/permissions/seed-defaults');
      await fetchMatrix();
      alert('Настройки по умолчанию восстановлены');
    } catch (error) {
      console.error('Failed to seed default permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-gray-500">Загрузка матрицы прав...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#F95700]" /> Матрица ролей (RBAC)
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Настройка прав доступа (чтение, запись, удаление) и видимости (все данные или только свои) для каждой роли.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seedDefaults}
            className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Сбросить
          </button>
          <button
            onClick={saveMatrix}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold bg-[#F95700] hover:bg-[#E04D00] text-white rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs border-collapse bg-white dark:bg-zinc-900">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold uppercase tracking-wider">
              <th className="p-3 border-r border-gray-200 dark:border-zinc-800 min-w-[120px]">Модуль</th>
              {ALL_ROLES.map(role => (
                <th key={role} className="p-3 text-center border-r border-gray-200 dark:border-zinc-800">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map((module) => (
              <tr key={module} className="border-b border-gray-100 dark:border-zinc-800/60 hover:bg-gray-50/50 dark:hover:bg-zinc-850/30">
                <td className="p-3 font-bold text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-zinc-800">
                  {module}
                </td>
                {ALL_ROLES.map(role => {
                  const perm = getPerm(role, module);
                  return (
                    <td key={`${role}-${module}`} className="p-3 border-r border-gray-200 dark:border-zinc-800 align-top">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={perm.can_read} onChange={() => togglePerm(role, module, 'can_read')} className="accent-[#F95700]" />
                          <span className="text-[10px] text-gray-600 dark:text-zinc-400">Чтение (R)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={perm.can_write} onChange={() => togglePerm(role, module, 'can_write')} className="accent-[#F95700]" />
                          <span className="text-[10px] text-gray-600 dark:text-zinc-400">Запись (W)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={perm.can_delete} onChange={() => togglePerm(role, module, 'can_delete')} className="accent-red-500" />
                          <span className="text-[10px] text-gray-600 dark:text-zinc-400">Удаление (D)</span>
                        </label>
                        <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1" />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={perm.own_only} onChange={() => togglePerm(role, module, 'own_only')} className="accent-blue-500" />
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold" title="Видит только свои записи">Только свои</span>
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
