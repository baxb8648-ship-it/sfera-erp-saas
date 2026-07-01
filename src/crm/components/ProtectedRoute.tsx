import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="h-8 w-8 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-700 animate-spin" />
      </div>
    );
  }

  // Если пользователя нет, редиректим на страницу логина
  if (!user) {
    return <Navigate to="/crm/login" replace />;
  }

  // Если пользователь есть, рендерим дочерние роуты (Layout)
  return <Outlet />;
};
