<template>
  <AppLayout>
    <template #header>
      Visão Geral da Operação
    </template>

    <div class="max-w-6xl space-y-6">
      <!-- Barra Superior com Atualização -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-gray-900">Métricas Operacionais em Tempo Real</h3>
          <p class="text-xs text-gray-500">Dados consolidados do seu tenant sem valores simulados.</p>
        </div>
        <button
          @click="fetchDashboardData"
          :disabled="isLoading"
          class="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center"
        >
          <svg class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar Dados
        </button>
      </div>

      <!-- Alerta de Circuit Breaker Evolution API -->
      <div
        v-if="summary.alerts?.openCircuits?.length > 0"
        data-testid="dashboard-circuit-alerts"
        class="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Proteção Anti-Ban Ativada (Circuit Breaker Evolution API)</span>
          </div>
          <ul class="text-xs text-rose-700 space-y-1 pl-7 list-disc">
            <li v-for="inst in summary.alerts.openCircuits" :key="inst.id">
              <strong>{{ inst.displayName }}</strong> ({{ inst.status }}) —
              <span v-if="inst.circuitOpenUntil">pausada até {{ formatDateTime(inst.circuitOpenUntil) }}</span>
              <span v-if="inst.lastErrorReason"> • {{ inst.lastErrorReason }}</span>
            </li>
          </ul>
        </div>
        <router-link
          to="/whatsapp"
          class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shrink-0 self-start md:self-center"
        >
          Verificar no WhatsApp
        </router-link>
      </div>

      <!-- Cards de Métricas Reais -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Automações Ativas -->
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-orange-50 text-shopee-orange flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Automações Ativas</p>
            <p class="text-2xl font-black text-gray-900 mt-0.5">
              {{ summary.automations?.active ?? 0 }}
              <span class="text-xs font-normal text-gray-400">/ {{ summary.automations?.total ?? 0 }} total</span>
            </p>
          </div>
        </div>

        <!-- Instâncias Conectadas -->
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-green-50 text-whatsapp-green flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp Conectado</p>
            <p class="text-2xl font-black text-gray-900 mt-0.5">
              {{ summary.instances?.connected ?? 0 }}
              <span class="text-xs font-normal text-gray-400">/ {{ summary.instances?.total ?? 0 }} instâncias</span>
            </p>
          </div>
        </div>

        <!-- Publicações Entregues -->
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Envios com Sucesso</p>
            <p class="text-2xl font-black text-gray-900 mt-0.5">
              {{ summary.publications?.success ?? 0 }}
            </p>
          </div>
        </div>

        <!-- Falhas Registradas -->
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Falhas Registradas</p>
            <p class="text-2xl font-black text-gray-900 mt-0.5">
              {{ summary.publications?.failed ?? 0 }}
            </p>
          </div>
        </div>
      </div>

      <!-- ONBOARDING PARA CONTA NOVA (Quando não há automações) -->
      <div
        v-if="!isLoading && summary.automations?.total === 0"
        class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
      >
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h4 class="text-base font-bold text-gray-900">Passo a Passo para Primeira Publicação</h4>
            <p class="text-xs text-gray-500 mt-0.5">Configure sua infraestrutura em 3 passos simples para automatizar seus grupos.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-shopee-orange">
            Conta Nova
          </span>
        </div>

        <div class="p-6 divide-y divide-gray-100">
          <!-- Passo 1 -->
          <div class="py-4 flex items-center justify-between first:pt-0">
            <div class="flex items-center space-x-3.5">
              <span class="w-8 h-8 rounded-full bg-orange-100 text-shopee-orange flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Cadastrar Credenciais Shopee Open API</p>
                <p class="text-xs text-gray-500">Insira seu App ID e App Secret oficiais obtidos no portal da Shopee.</p>
              </div>
            </div>
            <router-link
              to="/shopee-credentials"
              class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-shopee-orange text-white hover:bg-shopee-hover transition-colors shadow-sm"
            >
              Configurar Shopee
            </router-link>
          </div>

          <!-- Passo 2 -->
          <div class="py-4 flex items-center justify-between">
            <div class="flex items-center space-x-3.5">
              <span class="w-8 h-8 rounded-full bg-green-100 text-whatsapp-green flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Conectar WhatsApp via Evolution API</p>
                <p class="text-xs text-gray-500">Configure seu servidor Evolution, gere o QR Code e sincronize seus grupos.</p>
              </div>
            </div>
            <router-link
              to="/whatsapp-instances"
              class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-whatsapp-green text-white hover:bg-green-600 transition-colors shadow-sm"
            >
              Conectar WhatsApp
            </router-link>
          </div>

          <!-- Passo 3 -->
          <div class="py-4 flex items-center justify-between last:pb-0">
            <div class="flex items-center space-x-3.5">
              <span class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <p class="text-sm font-bold text-gray-900">Criar Sua Primeira Automação (Wizard)</p>
                <p class="text-xs text-gray-500">Defina os nichos, os grupos destinatários e os intervalos de envio.</p>
              </div>
            </div>
            <router-link
              to="/automations"
              class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-black transition-colors shadow-sm"
            >
              Criar Automação
            </router-link>
          </div>
        </div>
      </div>

      <!-- TABELAS DE DADOS REAIS (QUANDO JÁ HOUVER OPERAÇÃO) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Próximas Execuções Agendadas -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-bold text-sm text-gray-900">Próximos Disparos Agendados</h4>
            <router-link to="/automations" class="text-xs text-shopee-orange font-semibold hover:underline">
              Ver Todas
            </router-link>
          </div>

          <div v-if="upcomingList.length === 0" class="p-8 text-center text-gray-400 text-xs">
            Nenhuma automação ativa com agendamento pendente.
          </div>

          <div v-else class="divide-y divide-gray-100 text-xs flex-1">
            <div v-for="up in upcomingList" :key="up.id" class="p-4 flex items-center justify-between hover:bg-gray-50">
              <div class="space-y-0.5">
                <p class="font-bold text-gray-900">{{ up.name }}</p>
                <p class="text-gray-400 font-medium">
                  {{ up.instance?.displayName }} • {{ up._count?.groups || 0 }} grupos • a cada {{ up.frequencyMinutes }}m
                </p>
              </div>
              <div class="text-right">
                <span class="px-2 py-1 rounded bg-orange-50 text-shopee-orange font-mono font-bold">
                  {{ formatDateTime(up.nextExecutionAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Últimas Publicações Realizadas -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-bold text-sm text-gray-900">Últimas Publicações Realizadas</h4>
            <router-link to="/history" class="text-xs text-shopee-orange font-semibold hover:underline">
              Ver Histórico Completo
            </router-link>
          </div>

          <div v-if="summary.recentExecutions?.length === 0" class="p-8 text-center text-gray-400 text-xs">
            Nenhuma publicação realizada ainda.
          </div>

          <div v-else class="divide-y divide-gray-100 text-xs flex-1">
            <div
              v-for="rec in summary.recentExecutions"
              :key="rec.id"
              class="p-4 flex items-center justify-between hover:bg-gray-50 gap-3"
            >
              <div class="flex items-center space-x-3 truncate">
                <img
                  v-if="rec.productSnapshot?.imageUrl"
                  :src="rec.productSnapshot.imageUrl"
                  alt="Produto"
                  class="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                />
                <div class="truncate">
                  <p class="font-bold text-gray-900 truncate" :title="rec.productSnapshot?.title">
                    {{ rec.productSnapshot?.title || rec.automation?.name }}
                  </p>
                  <p class="text-gray-400">
                    {{ formatDateTime(rec.startedAt) }} • {{ rec.successCount }}/{{ rec.totalDestinations }} grupos
                  </p>
                </div>
              </div>
              <BadgeStatus :status="rec.status" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import BadgeStatus from '../components/common/BadgeStatus.vue';
import { api } from '../services/api';

const isLoading = ref(false);
const summary = ref<any>({
  automations: { active: 0, paused: 0, total: 0 },
  instances: { connected: 0, total: 0 },
  publications: { success: 0, failed: 0, total: 0 },
  alerts: { openCircuits: [] },
  recentExecutions: [],
});
const upcomingList = ref<any[]>([]);

function formatDateTime(isoString: string) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR');
}

async function fetchDashboardData() {
  isLoading.value = true;
  try {
    const [summaryRes, upcomingRes] = await Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/upcoming'),
    ]);

    if (summaryRes.data.success) {
      summary.value = summaryRes.data.data;
    }

    if (upcomingRes.data.success) {
      upcomingList.value = upcomingRes.data.data;
    }
  } catch (err) {
    console.error('Falha ao carregar métricas do dashboard:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchDashboardData();
});
</script>
