import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Request: anexa o token de acesso
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Response: trata erro 401 (sessão expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('tenant_data');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  },
);

export default api;
