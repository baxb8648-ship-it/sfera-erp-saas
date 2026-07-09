import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  role: string;
  telegram_chat_id?: string;
  is_active: number;
  is_onboarded?: boolean;
  tenant_id?: number;
  subscription_ends_at?: string | null;
}

// ─── RBAC: Матрица прав (загружается из /permissions/my при логине) ─────────
export interface ModulePermission {
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  own_only: boolean;
}

export interface UserPermissions {
  role: string;
  is_superadmin: boolean;
  plan_modules?: string[] | null;
  permissions: Record<string, ModulePermission>;
}

// Проверка права для модуля (хелпер для компонентов)
export function hasPermission(
  perms: UserPermissions | null,
  module: string,
  action: 'read' | 'write' | 'delete' = 'read'
): boolean {
  if (!perms) return false;
  if (perms.is_superadmin) return true;
  
  // Base modules always available, specific plugins require plan check
  const pluginModules = ['furniture', 'construction', 'agro', 'fleet', 'tenders', 'ecommerce', 'beauty'];
  if (pluginModules.includes(module)) {
    if (!perms.plan_modules || !perms.plan_modules.includes(module)) {
      return false; // Not purchased
    }
  }

  const p = perms.permissions[module];
  if (!p) return false;
  if (action === 'read') return p.can_read;
  if (action === 'write') return p.can_write;
  if (action === 'delete') return p.can_delete;
  return false;
}

interface AuthContextType {
  user: User | null;
  permissions: UserPermissions | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Загрузка матрицы прав для текущего пользователя
  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_URL}/permissions/my`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data: UserPermissions = await response.json();
        setPermissions(data);
      } else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions(null);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        // Загружаем матрицу прав вместе с профилем
        await fetchPermissions();
      } else {
        setUser(null);
        setPermissions(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();

    const handleAuthError = () => {
      setUser(null);
      setPermissions(null);
    };

    window.addEventListener('auth_error', handleAuthError);
    return () => {
      window.removeEventListener('auth_error', handleAuthError);
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    // Перезагружаем права после успешного логина
    fetchPermissions();
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      setPermissions(null);
      localStorage.removeItem('csrf_token');
    }
  };

  const refetchUser = async () => {
    setIsLoading(true);
    await fetchUserProfile();
  };

  return (
    <AuthContext.Provider value={{ user, permissions, isLoading, login, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
