export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const BASE_URL = API_BASE_URL;

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any, message: string) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const apiClient = {
  async fetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    // Авторизация через HttpOnly куки (credentials: include добавляется глобальным перехватчиком в main.tsx)
    // Чтение CSRF-токена из куки
    const csrfCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='));
    const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    // Режим «Вездесущего Ока» (Impersonation Mode)
    const impersonated = localStorage.getItem('impersonated_tenant');
    if (impersonated) {
      try {
        const parsed = JSON.parse(impersonated);
        if (parsed && parsed.id) {
          headers['X-Impersonate-Tenant-Id'] = parsed.id.toString();
        }
      } catch (e) {
        console.error('Failed to parse impersonated_tenant:', e);
      }
    }

    // Do not set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    let url = `${BASE_URL}${endpoint}`;
    
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }

        // Auto logout on 401
        if (response.status === 401) {
          window.dispatchEvent(new Event('auth_error'));
        }

        throw new ApiError(response.status, errorData, errorData.detail || 'API Request Failed');
      }

      // Return null or parse JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return null as any;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  get<T = any>(endpoint: string, params?: Record<string, string>, options?: FetchOptions) {
    return this.fetch<T>(endpoint, { ...options, method: 'GET', params });
  },

  post<T = any>(endpoint: string, body?: any, options?: FetchOptions) {
    const isFormData = body instanceof FormData;
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put<T = any>(endpoint: string, body?: any, options?: FetchOptions) {
    const isFormData = body instanceof FormData;
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  patch<T = any>(endpoint: string, body?: any, options?: FetchOptions) {
    const isFormData = body instanceof FormData;
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string, options?: FetchOptions) {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  }
};
