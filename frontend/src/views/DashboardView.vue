<template>
  <AppLayout>
    <template #header>
      Visão Geral da Operação
    </template>

    <!-- Cards de Métricas Principais -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div class="p-3 rounded-lg bg-orange-50 text-shopee-orange mr-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Automações Ativas</p>
          <p class="text-2xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div class="p-3 rounded-lg bg-green-50 text-whatsapp-green mr-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Instâncias Conectadas</p>
          <p class="text-2xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div class="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Grupos Vinculados</p>
          <p class="text-2xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div class="p-3 rounded-lg bg-purple-50 text-purple-600 mr-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Publicações Hoje</p>
          <p class="text-2xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
      </div>
    </div>

    <!-- Seção de Onboarding Inicial / Estado Vazio -->
    <div class="space-y-6">
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Configuração Inicial da Operação</h3>
            <p class="text-sm text-gray-500 mt-0.5">Complete as etapas abaixo para habilitar seus primeiros disparos automáticos.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-shopee-orange">
            0 de 3 Concluídos
          </span>
        </div>

        <div class="p-6 divide-y divide-gray-100">
          <div class="py-4 flex items-center justify-between first:pt-0 last:pb-0">
            <div class="flex items-center space-x-3">
              <span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">1</span>
              <div>
                <p class="text-sm font-medium text-gray-900">Cadastrar Credenciais Shopee Affiliate</p>
                <p class="text-xs text-gray-500">Insira seu AppId e AppSecret fornecidos pelo portal Shopee.</p>
              </div>
            </div>
            <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Configurar
            </button>
          </div>

          <div class="py-4 flex items-center justify-between first:pt-0 last:pb-0">
            <div class="flex items-center space-x-3">
              <span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">2</span>
              <div>
                <p class="text-sm font-medium text-gray-900">Conectar Instância WhatsApp via Evolution API</p>
                <p class="text-xs text-gray-500">Gere o QR Code e escaneie no seu aplicativo do WhatsApp.</p>
              </div>
            </div>
            <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Conectar
            </button>
          </div>

          <div class="py-4 flex items-center justify-between first:pt-0 last:pb-0">
            <div class="flex items-center space-x-3">
              <span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">3</span>
              <div>
                <p class="text-sm font-medium text-gray-900">Criar Sua Primeira Automação</p>
                <p class="text-xs text-gray-500">Selecione nichos, grupos e a frequência desejada de publicações.</p>
              </div>
            </div>
            <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Criar
            </button>
          </div>
        </div>
      </div>

      <!-- Estado Vazio para Próximas Execuções -->
      <EmptyState
        title="Nenhuma publicação agendada no momento"
        description="Assim que você conectar sua instância e ativar sua primeira automação, os próximos horários previstos de publicação serão exibidos aqui."
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import EmptyState from '../components/EmptyState.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchProfile();
  }
});
</script>
