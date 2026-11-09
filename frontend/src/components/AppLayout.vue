<template>
  <div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">
    <!-- Toast Global -->
    <ToastContainer />

    <!-- Sidebar Desktop -->
    <aside class="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
      <!-- Logo da Plataforma -->
      <div class="h-16 flex items-center px-6 border-b border-gray-100">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-shopee-orange flex items-center justify-center text-white font-black text-lg shadow-sm">
            S
          </div>
          <div>
            <h1 class="font-bold text-gray-900 leading-tight">ShopeeZap</h1>
            <p class="text-[11px] text-gray-400 font-medium">Afiliados & WhatsApp</p>
          </div>
        </div>
      </div>

      <!-- Informações do Tenant -->
      <div class="p-3.5 mx-3 my-3 bg-gray-50 rounded-xl border border-gray-100">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organização Ativa</p>
        <p class="text-sm font-bold text-gray-800 truncate mt-0.5">{{ authStore.tenant?.name || 'Carregando...' }}</p>
      </div>

      <!-- Links de Navegação -->
      <nav class="flex-1 px-3 space-y-5 overflow-y-auto">
        <!-- Seção: Visão Geral -->
        <div class="space-y-1">
          <p class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Visão Geral</p>
          <router-link
            to="/dashboard"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/dashboard' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </router-link>
        </div>

        <!-- Seção: Campanhas & Automação -->
        <div class="space-y-1">
          <p class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Automação</p>
          <router-link
            to="/automations"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/automations' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Automações
          </router-link>

          <router-link
            to="/history"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/history' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Publicações & Histórico
          </router-link>
        </div>

        <!-- Seção: Canais WhatsApp -->
        <div class="space-y-1">
          <p class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Canais</p>
          <router-link
            to="/whatsapp-instances"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/whatsapp-instances' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            WhatsApp & Grupos
          </router-link>
        </div>

        <!-- Seção: Integrações -->
        <div class="space-y-1">
          <p class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Integrações</p>
          <router-link
            to="/shopee-credentials"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/shopee-credentials' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Shopee Afiliados
          </router-link>
        </div>

        <!-- Seção: Conta & Sistema -->
        <div class="space-y-1">
          <p class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Conta</p>
          <router-link
            to="/settings"
            class="flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="$route.path === '/settings' ? 'bg-shopee-light text-shopee-orange' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <svg class="w-4 h-4 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configurações
          </router-link>
        </div>
      </nav>

      <!-- Rodapé do Usuário -->
      <div class="p-4 border-t border-gray-100 flex items-center justify-between">
        <div class="truncate">
          <p class="text-sm font-bold text-gray-900 truncate">{{ authStore.user?.name || 'Usuário' }}</p>
          <p class="text-xs text-gray-400 truncate">{{ authStore.user?.email }}</p>
        </div>
        <button
          @click="handleLogout"
          title="Sair da Conta"
          class="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Área Principal de Conteúdo -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <h2 class="text-lg font-bold text-gray-800">
          <slot name="header">Painel Operacional</slot>
        </h2>
        <div class="flex items-center space-x-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
            Sistema Online
          </span>
        </div>
      </header>

      <div class="p-6 flex-1">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import ToastContainer from './common/ToastContainer.vue';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>
