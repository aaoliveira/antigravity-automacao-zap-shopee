import { defineStore } from 'pinia';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    tenant: null as Tenant | null,
    accessToken: localStorage.getItem('access_token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    async fetchProfile() {
      if (!this.accessToken) return;
      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          this.user = {
            id: response.data.data.userId,
            name: response.data.data.name,
            email: response.data.data.email,
            role: response.data.data.role,
          };
          this.tenant = response.data.data.tenant;
        }
      } catch (e: any) {
        this.logout();
      }
    },

    async login(credentials: { email: string; password: string }) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/login', credentials);
        if (response.data.success) {
          const { user, tenant, accessToken, refreshToken } = response.data.data;
          this.user = user;
          this.tenant = tenant;
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;

          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
      } catch (err: any) {
        this.error =
          err.response?.data?.error?.message ||
          'Falha no login. Verifique suas credenciais.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async register(data: {
      name: string;
      email: string;
      password: string;
      tenantName: string;
    }) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/register', data);
        if (response.data.success) {
          const { user, tenant, accessToken, refreshToken } = response.data.data;
          this.user = user;
          this.tenant = tenant;
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;

          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
      } catch (err: any) {
        this.error =
          err.response?.data?.error?.message ||
          'Falha no cadastro. Verifique os dados informados.';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      this.user = null;
      this.tenant = null;
      this.accessToken = '';
      this.refreshToken = '';
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
  },
});
