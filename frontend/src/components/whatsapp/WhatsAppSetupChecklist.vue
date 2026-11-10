<template>
  <section
    aria-label="Checklist de configuração da instância WhatsApp"
    class="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden"
  >
    <!-- Cabeçalho do Checklist com Barra de Progresso -->
    <div class="px-6 py-4 bg-shopee-light/60 border-b border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-shopee-orange text-white text-xs font-bold">
            ?
          </span>
          <h3 class="text-base font-bold text-gray-900">
            Guia Passo a Passo: Como Configurar sua Instância WhatsApp
          </h3>
        </div>
        <p class="text-xs text-gray-600">
          Marque cada etapa conforme preenche os dados solicitados. O guia acompanha suas entradas em tempo real.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 shrink-0">
        <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-orange-200">
          <span class="text-xs font-semibold text-gray-700">
            {{ completedCount }} de {{ checklistItems.length }} concluídas
          </span>
          <span
            class="text-xs font-bold px-1.5 py-0.5 rounded"
            :class="progressPercent === 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-shopee-orange'"
          >
            {{ progressPercent }}%
          </span>
        </div>

        <button
          v-if="completedCount > 0"
          type="button"
          @click="resetChecks"
          class="text-xs font-medium text-gray-500 hover:text-gray-800 underline"
        >
          Limpar marcações
        </button>

        <button
          type="button"
          @click="$emit('close')"
          class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold transition-colors"
        >
          Fechar guia
        </button>
      </div>
    </div>

    <!-- Barra de progresso visual -->
    <div class="w-full h-1.5 bg-gray-100">
      <div
        class="h-full transition-all duration-300"
        :class="progressPercent === 100 ? 'bg-green-500' : 'bg-shopee-orange'"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Lista de Etapas do Checklist -->
    <div class="divide-y divide-gray-100">
      <div
        v-for="item in checklistItems"
        :key="item.id"
        class="p-5 transition-colors"
        :class="checkedSteps[item.id] ? 'bg-green-50/40' : 'hover:bg-gray-50/60'"
      >
        <div class="flex items-start gap-3">
          <input
            :id="`chk-step-${item.id}`"
            v-model="checkedSteps[item.id]"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-gray-300 text-shopee-orange focus:ring-shopee-orange cursor-pointer"
          />
          <div class="flex-1 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label
                :for="`chk-step-${item.id}`"
                class="text-sm font-semibold cursor-pointer select-none"
                :class="checkedSteps[item.id] ? 'line-through text-gray-500' : 'text-gray-900'"
              >
                {{ item.title }}
              </label>

              <div class="flex items-center gap-2">
                <span
                  v-if="item.badge"
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="item.badge.tone === 'green' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
                >
                  {{ item.badge.text }}
                </span>
                <button
                  v-if="item.action && activeTab !== item.action.tab"
                  type="button"
                  @click="$emit('goToTab', item.action.tab)"
                  class="text-xs font-semibold text-shopee-orange hover:underline"
                >
                  {{ item.action.label }}
                </button>
              </div>
            </div>

            <!-- Orientações específicas de preenchimento por etapa -->
            <div v-if="item.id === 'server'" class="text-xs text-gray-600 space-y-1.5 pl-0.5">
              <p>Na aba <strong>Servidores Evolution</strong>, preencha os 3 campos solicitados:</p>
              <ul class="space-y-1 ml-1">
                <li class="flex items-start gap-1.5">
                  <span :class="serverFieldStatus.name ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ serverFieldStatus.name ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>Nome do Servidor:</strong> identificação livre de 2 a 100 caracteres (ex: <code class="bg-gray-100 px-1 rounded">Servidor VPS Cloud</code>).
                  </span>
                </li>
                <li class="flex items-start gap-1.5">
                  <span :class="serverFieldStatus.baseUrl ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ serverFieldStatus.baseUrl ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>URL Base (HTTPS):</strong> endereço público da sua Evolution API v2 sem barra final (ex: <code class="bg-gray-100 px-1 rounded">https://evolution.minhaempresa.com</code>).
                    <span class="text-gray-500">Por proteção contra SSRF, endereços locais (<code class="bg-gray-100 px-1 rounded">localhost</code>, <code class="bg-gray-100 px-1 rounded">.local</code>, IPs privados como <code class="bg-gray-100 px-1 rounded">127.0.0.1</code> ou <code class="bg-gray-100 px-1 rounded">192.168.x.x</code>) são bloqueados, exceto quando liberados via <code class="bg-gray-100 px-1 rounded">ALLOW_INTERNAL_EVOLUTION_URL=true</code>.</span>
                  </span>
                </li>
                <li class="flex items-start gap-1.5">
                  <span :class="serverFieldStatus.apiKey ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ serverFieldStatus.apiKey ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>Global API Key:</strong> chave mestra da Evolution API (mín. 4 caracteres). Ao salvar, o sistema testa a rota <code class="bg-gray-100 px-1 rounded">GET /instance/fetchInstances</code> e cifra a chave com <strong>AES-256-GCM</strong>.
                  </span>
                </li>
              </ul>
            </div>

            <div v-else-if="item.id === 'slug'" class="text-xs text-gray-600 space-y-1.5 pl-0.5">
              <ul class="space-y-1 ml-1">
                <li class="flex items-start gap-1.5">
                  <span :class="draftInstance.serverId ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ draftInstance.serverId ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>Servidor Evolution:</strong> escolha na lista o servidor onde esta sessão do WhatsApp será criada.
                  </span>
                </li>
                <li class="flex items-start gap-1.5">
                  <span :class="slugValidationState === 'valid' ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ slugValidationState === 'valid' ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>Identificador da Instância (Slug):</strong> de 3 a 60 caracteres, único por servidor. Use <strong>apenas letras, números, hífen (<code class="bg-gray-100 px-1 rounded">-</code>) ou underline (<code class="bg-gray-100 px-1 rounded">_</code>)</strong>, sem espaços ou acentos (ex: <code class="bg-gray-100 px-1 rounded">zap-promocoes-01</code>).
                  </span>
                </li>
              </ul>
            </div>

            <div v-else-if="item.id === 'create'" class="text-xs text-gray-600 space-y-1 pl-0.5">
              <ul class="space-y-1 ml-1">
                <li class="flex items-start gap-1.5">
                  <span :class="displayNameValid ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ displayNameValid ? '✓' : '•' }}
                  </span>
                  <span>
                    <strong>Nome de Exibição:</strong> nome amigável de 2 a 100 caracteres para identificar esta linha nas automações (ex: <code class="bg-gray-100 px-1 rounded">WhatsApp Vendas VIP</code>).
                  </span>
                </li>
                <li class="flex items-start gap-1.5">
                  <span :class="hasInstances ? 'text-green-600 font-bold' : 'text-gray-400'">
                    {{ hasInstances ? '✓' : '•' }}
                  </span>
                  <span>
                    Clique em <strong>Criar Instância</strong>. A sessão será registrada via <code class="bg-gray-100 px-1 rounded">WHATSAPP-BAILEYS</code> com status inicial <strong>Aguardando QR</strong>.
                  </span>
                </li>
              </ul>
            </div>

            <div v-else-if="item.id === 'qrcode'" class="text-xs text-gray-600 space-y-1 pl-0.5">
              <p>No modal do QR Code (ou clicando em <strong>Ler QR Code</strong> na instância listada):</p>
              <ol class="list-decimal list-inside space-y-0.5 ml-1">
                <li>Abra o <strong>WhatsApp</strong> no celular que fará os envios.</li>
                <li>Acesse <strong>Aparelhos conectados &gt; Conectar um aparelho</strong> e aponte para o QR Code.</li>
                <li>Se o código expirar, clique em <strong>Recarregar QR Agora</strong>. O status atualiza automaticamente a cada 5s para <strong>Conectada</strong>.</li>
              </ol>
            </div>

            <p v-else-if="item.id === 'groups'" class="text-xs text-gray-600 pl-0.5">
              Com a instância no status <strong>Conectada</strong>, clique em <strong>Sincronizar Grupos</strong> para importar os grupos em que o número participa (preservando o identificador oficial <code class="bg-gray-100 px-1 rounded">@g.us</code>) e deixá-los disponíveis nas Automações.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

type TabName = 'instances' | 'groups' | 'servers';
type StepId = 'server' | 'slug' | 'create' | 'qrcode' | 'groups';

interface ChecklistItem {
  id: StepId;
  title: string;
  badge: { text: string; tone: 'green' | 'amber' } | null;
  action?: { tab: TabName; label: string };
}

const props = defineProps<{
  hasServers: boolean;
  serverCount: number;
  hasInstances: boolean;
  hasConnectedInstance: boolean;
  hasGroups: boolean;
  activeTab: TabName;
  draftServer: {
    name: string;
    baseUrl: string;
    apiKey: string;
  };
  draftInstance: {
    serverId: string;
    instanceName: string;
    displayName: string;
  };
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'goToTab', tab: TabName): void;
}>();

const STORAGE_KEY = 'shopeezap:whatsapp-setup-checklist:v1';

type ChecklistState = Record<StepId, boolean>;

const defaultState: ChecklistState = {
  server: false,
  slug: false,
  create: false,
  qrcode: false,
  groups: false,
};

function loadSavedState(): ChecklistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      server: Boolean(parsed.server),
      slug: Boolean(parsed.slug),
      create: Boolean(parsed.create),
      qrcode: Boolean(parsed.qrcode),
      groups: Boolean(parsed.groups),
    };
  } catch {
    return { ...defaultState };
  }
}

const checkedSteps = ref<ChecklistState>(loadSavedState());

watch(
  checkedSteps,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {
      // Ignora indisponibilidade de localStorage
    }
  },
  { deep: true },
);

const stepIds: StepId[] = ['server', 'slug', 'create', 'qrcode', 'groups'];

const completedCount = computed(() =>
  stepIds.filter((id) => checkedSteps.value[id]).length,
);

const progressPercent = computed(() =>
  Math.round((completedCount.value / stepIds.length) * 100),
);

function resetChecks() {
  checkedSteps.value = { ...defaultState };
}

// Feedback em tempo real dos campos de Servidor Evolution
const serverFieldStatus = computed(() => {
  const nameLen = props.draftServer.name.trim().length;
  let urlOk = false;
  const rawUrl = props.draftServer.baseUrl.trim();
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      urlOk = ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      urlOk = false;
    }
  }
  return {
    name: nameLen >= 2 && nameLen <= 100,
    baseUrl: urlOk,
    apiKey: props.draftServer.apiKey.trim().length >= 4,
  };
});

// Feedback em tempo real do Identificador (Slug) da Instância
const slugRegex = /^[a-zA-Z0-9_-]+$/;

const slugValidationState = computed<'empty' | 'valid' | 'invalid'>(() => {
  const value = props.draftInstance.instanceName.trim();
  if (!value) return 'empty';
  return value.length >= 3 && value.length <= 60 && slugRegex.test(value) ? 'valid' : 'invalid';
});

const slugValidationHint = computed(() => {
  const value = props.draftInstance.instanceName.trim();
  if (!value) return '';
  if (value.length < 3) return 'Mínimo de 3 caracteres';
  if (value.length > 60) return 'Máximo de 60 caracteres';
  if (!slugRegex.test(value)) return 'Remova espaços ou caracteres especiais (use apenas letras, números, - ou _)';
  return '';
});

const displayNameValid = computed(() => {
  const len = props.draftInstance.displayName.trim().length;
  return len >= 2 && len <= 100;
});

const checklistItems = computed<ChecklistItem[]>(() => [
  {
    id: 'server',
    title: '1. Ter um Servidor Evolution API v2 cadastrado e validado',
    badge: props.hasServers
      ? { text: `✓ ${props.serverCount} servidor(es) ativo(s)`, tone: 'green' }
      : { text: 'Pré-requisito pendente', tone: 'amber' },
    action: { tab: 'servers', label: 'Ir para Servidores Evolution →' },
  },
  {
    id: 'slug',
    title: '2. Selecionar o Servidor e definir o Identificador (Slug)',
    badge:
      slugValidationState.value === 'valid'
        ? { text: '✓ Slug no formato válido', tone: 'green' }
        : slugValidationState.value === 'invalid'
          ? { text: `⚠ ${slugValidationHint.value}`, tone: 'amber' }
          : null,
    action: { tab: 'instances', label: 'Ir para Instâncias WhatsApp →' },
  },
  {
    id: 'create',
    title: '3. Preencher o Nome de Exibição e Criar a Instância',
    badge: props.hasInstances ? { text: '✓ Instância registrada', tone: 'green' } : null,
  },
  {
    id: 'qrcode',
    title: '4. Ler o QR Code no WhatsApp do celular e confirmar conexão',
    badge: props.hasConnectedInstance ? { text: '✓ WhatsApp conectado', tone: 'green' } : null,
  },
  {
    id: 'groups',
    title: '5. Sincronizar os Grupos destinatários',
    badge: props.hasGroups ? { text: '✓ Grupos sincronizados', tone: 'green' } : null,
  },
]);
</script>
