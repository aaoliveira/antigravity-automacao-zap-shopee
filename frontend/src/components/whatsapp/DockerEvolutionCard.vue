<template>
  <div
    class="rounded-xl border shadow-sm transition-colors"
    :class="[
      compact ? 'p-4 bg-white border-orange-200 mt-3' : 'p-6 bg-white border-gray-200',
    ]"
  >
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="font-semibold text-gray-900" :class="compact ? 'text-sm' : 'text-base'">
            Usar Evolution API via Docker
          </h4>
          <span
            v-if="status"
            class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            :class="badgeClass"
          >
            {{ badgeLabel }}
          </span>
          <span
            v-if="status?.alreadyConfigured"
            class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            Vinculado: {{ status.existingServer?.name }}
          </span>
        </div>
        <p class="text-xs sm:text-sm text-gray-500">
          Conecte o container local <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">evoapicloud/evolution-api</code> em 1 clique com proteção contra SSRF e cifra AES-256-GCM.
        </p>
      </div>

      <button
        type="button"
        @click="$emit('refresh')"
        :disabled="checking"
        class="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors shrink-0 disabled:opacity-50"
      >
        {{ checking ? 'Verificando...' : 'Verificar Container' }}
      </button>
    </div>

    <!-- Estado carregando inicial -->
    <div v-if="!status && checking" class="mt-4 text-xs text-gray-500">
      Consultando disponibilidade do container Docker da Evolution API...
    </div>

    <!-- Desabilitado no ambiente -->
    <div
      v-else-if="status && !status.enabled"
      class="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600"
    >
      {{ status.message }}
    </div>

    <!-- Habilitado -->
    <div v-else-if="status" class="mt-4 space-y-4">
      <div
        class="p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        :class="status.online ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'"
      >
        <div>
          <p class="font-medium">{{ status.message }}</p>
          <p v-if="status.displayUrl" class="text-[11px] opacity-80 mt-0.5 font-mono">
            Endpoint Docker configurado: {{ status.displayUrl }}
          </p>
        </div>
      </div>

      <!-- Comando para subir Docker quando container estiver offline -->
      <div v-if="!status.online" class="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-gray-400 font-medium">Execute no terminal para iniciar o container Docker:</span>
          <button
            type="button"
            @click="copyDockerCommand"
            class="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[11px] font-semibold transition-colors"
          >
            {{ copied ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>
        <code class="block font-mono text-green-400 select-all">
          {{ status.dockerStartCommand || 'npm run docker:evolution:up' }}
        </code>
      </div>

      <!-- Formulário rápido de vínculo 1 clique -->
      <div v-if="status.configured" class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-700 mb-1">
            Nome de identificação (opcional)
          </label>
          <input
            v-model="serverName"
            type="text"
            placeholder="Ex: Evolution API (Docker Local)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
          />
        </div>

        <button
          type="button"
          @click="$emit('connect', serverName)"
          :disabled="connecting || !status.online"
          class="px-4 py-2 bg-whatsapp-dark hover:bg-green-800 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors shrink-0"
        >
          <span v-if="connecting">Conectando Docker...</span>
          <span v-else-if="status.alreadyConfigured">Sincronizar Servidor Docker</span>
          <span v-else>Conectar Evolution Docker</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface DockerEvolutionStatus {
  enabled: boolean;
  configured: boolean;
  online: boolean;
  displayUrl: string | null;
  alreadyConfigured: boolean;
  existingServer: {
    id: string;
    name: string;
    apiKeyMasked: string;
  } | null;
  dockerStartCommand: string;
  message: string;
}

const props = defineProps<{
  status: DockerEvolutionStatus | null;
  checking: boolean;
  connecting: boolean;
  compact?: boolean;
}>();

defineEmits<{
  (e: 'refresh'): void;
  (e: 'connect', name: string): void;
}>();

const serverName = ref('');
const copied = ref(false);

const badgeClass = computed(() => {
  if (!props.status?.enabled) return 'bg-gray-100 text-gray-700';
  if (props.status.online) return 'bg-green-100 text-green-800';
  return 'bg-amber-100 text-amber-800';
});

const badgeLabel = computed(() => {
  if (!props.status?.enabled) return 'Desabilitado';
  if (props.status.online) return 'Container Online';
  return 'Container Offline';
});

async function copyDockerCommand() {
  const cmd = props.status?.dockerStartCommand || 'npm run docker:evolution:up';
  try {
    await navigator.clipboard.writeText(cmd);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback silencioso caso clipboard não esteja disponível no ambiente
  }
}
</script>
