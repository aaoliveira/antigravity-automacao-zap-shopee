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
import AppLayout from '../components/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
</script>
