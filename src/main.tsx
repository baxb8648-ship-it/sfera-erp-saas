import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

// Инициализация Telegram WebApp SDK (Режим 10)
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  try {
    const tg = (window as any).Telegram.WebApp;
    tg.ready();
    tg.expand(); // Разворачивает приложение на весь экран в Telegram
    console.log('Telegram WebApp SDK initialized successfully:', tg.platform);
  } catch (err) {
    console.error('Failed to initialize Telegram WebApp SDK:', err);
  }
}


// Global Fetch interceptor for CSRF and credentials (HttpOnly cookies) (Режим 10)
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : (input as Request).url;
  
  // Применяем куки и CSRF-токены только для запросов к нашему API
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const isApiRequest = 
    url.startsWith(apiBaseUrl) || 
    url.startsWith('http://127.0.0.1:8000') || 
    url.startsWith('/') || 
    !url.startsWith('http');
  
  if (isApiRequest) {
    const newInit: RequestInit = { ...init };
    
    // Автоматически пропускаем предупреждение Ngrok для API-запросов
    newInit.headers = {
      ...newInit.headers,
      'ngrok-skip-browser-warning': '69420',
    };
    
    // Автоматически передаем HttpOnly куки с каждым запросом (Режим 10)
    // JWT хранится только в HttpOnly куке — localStorage не используется (защита от XSS)
    newInit.credentials = 'include';
    
    // Очищаем невалидные заголовки авторизации (например, Bearer null или Bearer undefined)
    if (newInit.headers) {
      const headersRecord = newInit.headers as Record<string, string>;
      for (const key of Object.keys(headersRecord)) {
        if (key.toLowerCase() === 'authorization') {
          const val = headersRecord[key];
          if (val && (val.includes('null') || val.includes('undefined') || val.trim() === 'Bearer')) {
            delete headersRecord[key];
          }
        }
      }
    }

    // Проставляем CSRF-заголовок для мутирующих запросов (Режим 10)
    const method = (newInit.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // CSRF-токен: сначала пробуем из куки, затем из localStorage (кросс-доменный fallback)
      const csrfToken = getCookie('csrf_token') || localStorage.getItem('csrf_token');
      if (csrfToken) {
        newInit.headers = {
          ...newInit.headers,
          'X-CSRF-Token': csrfToken,
        };
      }
    }
    
    try {
      const response = await originalFetch(input, newInit);
      
      // Автоматическое разлогирование при истечении сессии (401 Unauthorized) (Режим 10)
      if (response.status === 401) {
        window.dispatchEvent(new Event('auth_error'));
      }
      
      return response;
    } catch (error) {
      console.error('Interceptor Fetch Error:', error);
      throw error;
    }
  }
  
  return originalFetch(input, init);
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Отключаем авторефетч при возврате в фокус по умолчанию (можно включить локально)
      retry: 1, // 1 попытка повтора при ошибке сети
      staleTime: 5 * 60 * 1000, // 5 минут кэширования по умолчанию
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)

// Безопасная очистка Service Worker и кэша для предотвращения "белого экрана" при обновлениях
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Устаревший Service Worker успешно отключен');
        }
      });
    }
  }).catch((err) => {
    console.warn('Ошибка при отключении Service Worker:', err);
  });
}

// Полная очистка Cache Storage
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name).then((success) => {
        if (success) {
          console.log('Кэш успешно очищен:', name);
        }
      });
    }
  }).catch((err) => {
    console.warn('Ошибка при очистке кэша:', err);
  });
}

