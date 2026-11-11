<template>
  <AppLayout>
    <template #header>
      Configurações da Organização & Conta
    </template>

    <div class="max-w-4xl space-y-6">
      <!-- Card do Perfil do Usuário -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 class="text-base font-bold text-gray-900">Perfil do Administrador</h3>
        <p class="text-xs text-gray-500">Dados do usuário atualmente autenticado na plataforma.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <span class="text-xs font-semibold text-gray-500 block">Nome Completo</span>
            <span class="font-medium text-gray-800">{{ authStore.user?.name || '-' }}</span>
          </div>

          <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <span class="text-xs font-semibold text-gray-500 block">Endereço de E-mail</span>
            <span class="font-medium text-gray-800">{{ authStore.user?.email || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Card do Tenant / Organização -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 class="text-base font-bold text-gray-900">Organização & Multi-Tenancy</h3>
        <p class="text-xs text-gray-500">
          Isolamento lógico e criptográfico rigoroso garantido pela política de segurança permanente (AGENTS.md).
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <span class="text-xs font-semibold text-gray-500 block">Nome do Tenant</span>
            <span class="font-medium text-gray-800">{{ authStore.tenant?.name || '-' }}</span>
          </div>

          <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <span class="text-xs font-semibold text-gray-500 block">Identificador (ID)</span>
            <span class="font-mono text-xs text-gray-600 truncate block">{{ authStore.tenant?.id || '-' }}</span>
          </div>

          <div class="bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <span class="text-xs font-semibold text-gray-500 block">Fuso Horário Padrão</span>
            <span class="font-medium text-gray-800">{{ authStore.tenant?.timezone || 'America/Sao_Paulo' }}</span>
          </div>
        </div>
      </div>

      <!-- Card de Feature Flags Dinâmicas -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-gray-900">Feature Flags & Funcionalidades Opcionais</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Controle quais modos de integração do Mercado Livre ficam habilitados para os usuários desta organização.
            </p>
          </div>
          <router-link to="/mercadolivre" class="text-xs font-semibold text-shopee-orange hover:underline shrink-0">
            Abrir Mercado Livre →
          </router-link>
        </div>

        <div v-if="flagFeedback" class="text-xs px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
          {{ flagFeedback }}
        </div>

        <div class="space-y-3">
          <div
            v-for="item in featureFlagItems"
            :key="item.key"
            class="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-gray-200 bg-gray-50/70"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900">{{ item.title }}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                  Padrão: {{ item.defaultValue ? 'ON' : 'OFF' }}
                </span>
              </div>
              <p class="text-xs text-gray-600">{{ item.description }}</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="item.enabled"
              :disabled="updatingFlagKey === item.key"
              @click="toggleFeatureFlag(item)"
              :class="item.enabled ? 'bg-shopee-orange' : 'bg-gray-300'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
            >
              <span
                :class="item.enabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Card de Governança e Segurança -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h3 class="text-base font-bold text-gray-900 flex items-center">
          <span class="mr-2">🛡️</span> Padrões de Segurança Ativos
        </h3>
        <ul class="text-xs text-gray-600 space-y-2 list-disc list-inside">
          <li><strong>Criptografia em Repouso:</strong> Todas as chaves da Evolution API e App Secrets da Shopee são cifrados com AES-256-GCM.</li>
          <li><strong>Proteção Anti-SSRF:</strong> Endpoints bloqueiam rigorosamente destinos de rede interna, loopback e metadados de nuvem.</li>
          <li><strong>Isolamento Multi-Tenant:</strong> Nenhuma credencial, instância, grupo ou automação pode ser acessada de forma cruzada.</li>
        </ul>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();
const featureFlagItems = ref<any[]>([]);
const updatingFlagKey = ref<string | null>(null);
const flagFeedback = ref('');

async function loadFlags() {
  try {
    const res = await api.get('/feature-flags');
    featureFlagItems.value = res.data?.data?.items || [];
  } catch {
    featureFlagItems.value = [];
  }
}

async function toggleFeatureFlag(item: any) {
  updatingFlagKey.value = item.key;
  flagFeedback.value = '';
  try {
    const res = await api.patch('/feature-flags', { [item.key]: !item.enabled });
    featureFlagItems.value = res.data?.data?.items || [];
    flagFeedback.value = `Flag "${item.title}" ${!item.enabled ? 'habilitada' : 'desabilitada'} com sucesso.`;
  } finally {
    updatingFlagKey.value = null;
  }
}

onMounted(loadFlags);
</script>
