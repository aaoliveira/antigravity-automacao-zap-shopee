<template>
  <AppLayout>
    <template #header>
      WhatsApp & Evolution API
    </template>

    <div class="max-w-6xl space-y-6">
      <!-- Navegação por Abas e Opção de Checklist -->
      <div class="border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-0">
        <nav class="-mb-px flex space-x-8 overflow-x-auto">
          <button
            @click="activeTab = 'instances'"
            :class="activeTab === 'instances' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Instâncias WhatsApp ({{ instances.length }})
          </button>

          <button
            @click="activeTab = 'groups'"
            :class="activeTab === 'groups' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Grupos Sincronizados ({{ groups.length }})
          </button>

          <button
            @click="activeTab = 'servers'"
            :class="activeTab === 'servers' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            Servidores Evolution ({{ servers.length }})
          </button>
        </nav>

        <button
          type="button"
          @click="showSetupChecklist = !showSetupChecklist"
          :aria-expanded="showSetupChecklist"
          class="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 self-start sm:self-center sm:mb-1"
          :class="showSetupChecklist
            ? 'bg-shopee-light text-shopee-orange border-orange-300'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
        >
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {{ showSetupChecklist ? 'Ocultar Checklist' : 'Como configurar? (Checklist)' }}
        </button>
      </div>

      <!-- Feedback global de erro/sucesso -->
      <div
        v-if="feedbackMessage"
        :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'"
        class="p-4 rounded-lg border text-sm flex items-center justify-between"
      >
        <span>{{ feedbackMessage }}</span>
        <button @click="feedbackMessage = ''" class="text-xs font-semibold underline">Fechar</button>
      </div>

      <!-- Guia em formato de Checklist para criar/configurar Instância e Servidor -->
      <WhatsAppSetupChecklist
        v-if="showSetupChecklist"
        :has-servers="servers.length > 0"
        :server-count="servers.length"
        :has-instances="instances.length > 0"
        :has-connected-instance="hasConnectedInstance"
        :has-groups="groups.length > 0"
        :active-tab="activeTab"
        :draft-server="newServer"
        :draft-instance="newInstance"
        @close="showSetupChecklist = false"
        @go-to-tab="activeTab = $event"
      />

      <!-- ========================================== -->
      <!-- TAB 1: INSTÂNCIAS WHATSAPP                -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'instances'" class="space-y-6">
        <!-- Formulário de Nova Instância -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Criar Nova Instância WhatsApp</h3>
          <p class="text-sm text-gray-500 mb-5">
            Crie uma nova sessão na Evolution API. Após a criação, leia o QR Code com o aplicativo WhatsApp no seu celular.
          </p>

          <div v-if="servers.length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mb-4">
            ⚠️ Nenhum servidor Evolution configurado.
            <button @click="activeTab = 'servers'" class="font-bold underline ml-1">
              Cadastre um servidor primeiro
            </button>
            para poder criar instâncias.
          </div>

          <form v-else class="space-y-4" @submit.prevent="handleCreateInstance">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Servidor Evolution</label>
                <select
                  v-model="newInstance.serverId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm bg-white"
                >
                  <option value="" disabled>Selecione o servidor</option>
                  <option v-for="srv in servers" :key="srv.id" :value="srv.id">
                    {{ srv.name }} ({{ srv.baseUrl }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Identificador da Instância (Slug)</label>
                <input
                  v-model="newInstance.instanceName"
                  type="text"
                  required
                  placeholder="Ex: zap-promocoes-01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
                <p class="mt-1 text-xs text-gray-400">Apenas letras, números, hífen ou underline.</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input
                  v-model="newInstance.displayName"
                  type="text"
                  required
                  placeholder="Ex: WhatsApp Vendas VIP"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                :disabled="isLoading"
                class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <span v-if="!isLoading">Criar Instância</span>
                <span v-else>Criando na Evolution API...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Lista de Instâncias -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-semibold text-gray-900">Instâncias Cadastradas</h4>
            <button
              @click="loadInstances"
              class="text-sm text-shopee-orange hover:underline font-medium"
            >
              Atualizar Lista
            </button>
          </div>

          <div v-if="instances.length === 0" class="p-8 text-center text-gray-500">
            Nenhuma instância cadastrada ainda.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="inst in instances"
              :key="inst.id"
              class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div class="space-y-1">
                <div class="flex items-center space-x-3">
                  <h5 class="text-base font-semibold text-gray-900">{{ inst.displayName }}</h5>
                  <span
                    :class="getStatusBadgeClass(inst.status)"
                    class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  >
                    {{ getStatusLabel(inst.status) }}
                  </span>
                </div>
                <div class="text-sm text-gray-500 flex flex-wrap gap-x-4">
                  <span>Slug: <strong class="text-gray-700 font-mono">{{ inst.instanceName }}</strong></span>
                  <span>Servidor: <strong class="text-gray-700">{{ inst.server?.name }}</strong></span>
                  <span>Grupos: <strong class="text-gray-700">{{ inst._count?.groups || 0 }}</strong></span>
                </div>
              </div>

              <!-- Ações da Instância -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Botão QR Code (se não conectada) -->
                <button
                  v-if="inst.status !== 'CONNECTED'"
                  @click="openQrModal(inst)"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Ler QR Code
                </button>

                <!-- Botão Verificar Status -->
                <button
                  @click="checkInstanceStatus(inst)"
                  class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Verificar Estado
                </button>

                <!-- Botão Sincronizar Grupos -->
                <button
                  v-if="inst.status === 'CONNECTED'"
                  @click="syncGroups(inst)"
                  class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Sincronizar Grupos
                </button>

                <!-- Botão Desconectar (Logout) -->
                <button
                  v-if="inst.status === 'CONNECTED'"
                  @click="logoutInstance(inst)"
                  class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Desconectar
                </button>

                <!-- Botão Excluir -->
                <button
                  @click="deleteInstance(inst)"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 2: GRUPOS SINCRONIZADOS                -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'groups'" class="space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Grupos de WhatsApp</h3>
              <p class="text-sm text-gray-500">
                Lista de grupos nos quais as instâncias conectadas participam. O JID oficial (@g.us) é preservado.
              </p>
            </div>
            <div class="w-full md:w-72">
              <input
                v-model="groupSearch"
                type="text"
                placeholder="Pesquisar por nome do grupo..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>
          </div>

          <div v-if="filteredGroups.length === 0" class="p-8 text-center text-gray-500">
            Nenhum grupo encontrado. Conecte uma instância e clique em "Sincronizar Grupos".
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th class="py-3 px-4 text-left">Nome do Grupo</th>
                  <th class="py-3 px-4 text-left">JID WhatsApp</th>
                  <th class="py-3 px-4 text-left">Instância</th>
                  <th class="py-3 px-4 text-center">Membros</th>
                  <th class="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="grp in filteredGroups" :key="grp.id" class="hover:bg-gray-50">
                  <td class="py-3 px-4 font-semibold text-gray-900">{{ grp.name }}</td>
                  <td class="py-3 px-4 font-mono text-xs text-gray-500">{{ grp.jid }}</td>
                  <td class="py-3 px-4 text-gray-600">{{ grp.instance?.displayName }}</td>
                  <td class="py-3 px-4 text-center text-gray-600">{{ grp.participantCount || '-' }}</td>
                  <td class="py-3 px-4 text-right">
                    <button
                      @click="sendTestMessage(grp)"
                      class="px-3 py-1 bg-shopee-light text-shopee-orange hover:bg-orange-100 rounded text-xs font-medium"
                    >
                      Disparo Teste
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 3: SERVIDORES EVOLUTION               -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'servers'" class="space-y-6">
        <!-- Formulário de Servidor -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Cadastrar Servidor Evolution API</h3>
          <p class="text-sm text-gray-500 mb-5">
            Insira o endpoint base e a Global API Key do seu servidor Evolution API v2. A chave será cifrada com AES-256-GCM.
          </p>

          <form class="space-y-4" @submit.prevent="handleCreateServer">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Servidor</label>
                <input
                  v-model="newServer.name"
                  type="text"
                  required
                  placeholder="Ex: Servidor VPS Cloud"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">URL Base (HTTPS)</label>
                <input
                  v-model="newServer.baseUrl"
                  type="url"
                  required
                  placeholder="https://evolution.minhaempresa.com"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Global API Key</label>
                <input
                  v-model="newServer.apiKey"
                  type="password"
                  required
                  placeholder="Chave secreta global"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                :disabled="isLoading"
                class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <span v-if="!isLoading">Testar e Salvar Servidor</span>
                <span v-else>Conectando ao Servidor...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Lista de Servidores -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-semibold text-gray-900">Servidores Conectados</h4>
            <button @click="loadServers" class="text-sm text-shopee-orange hover:underline font-medium">
              Atualizar
            </button>
          </div>

          <div v-if="servers.length === 0" class="p-8 text-center text-gray-500">
            Nenhum servidor cadastrado ainda.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="srv in servers"
              :key="srv.id"
              class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h5 class="text-base font-semibold text-gray-900">{{ srv.name }}</h5>
                <p class="text-sm text-gray-500 font-mono">{{ srv.baseUrl }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  API Key: <code class="bg-gray-100 px-1 py-0.5 rounded">{{ srv.apiKeyMasked }}</code> • Instâncias: {{ srv._count?.instances || 0 }}
                </p>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  @click="deleteServer(srv)"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Excluir Servidor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL DE QR CODE                          -->
      <!-- ========================================== -->
      <div
        v-if="qrModalOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl space-y-4">
          <h4 class="text-lg font-bold text-gray-900">Conectar WhatsApp</h4>
          <p class="text-sm text-gray-500">
            Abra o WhatsApp no seu celular, vá em <strong>Aparelhos conectados > Conectar um aparelho</strong> e aponte para a imagem abaixo.
          </p>

          <div class="my-4 flex items-center justify-center min-h-[260px] bg-gray-50 rounded-xl p-4 border border-gray-200">
            <img
              v-if="currentQrCode"
              :src="currentQrCode"
              alt="QR Code WhatsApp"
              class="max-w-[240px] max-h-[240px] rounded-lg shadow-sm"
            />
            <div v-else class="text-gray-400 text-sm animate-pulse">
              Carregando QR Code da Evolution API...
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-400 px-2">
            <span>Atualizando a cada 5 segundos...</span>
            <button
              @click="refreshQrCode"
              class="text-shopee-orange font-semibold hover:underline"
            >
              Recarregar QR Agora
            </button>
          </div>

          <div class="pt-2">
            <button
              @click="closeQrModal"
              class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition-colors"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import WhatsAppSetupChecklist from '../components/whatsapp/WhatsAppSetupChecklist.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const activeTab = ref<'instances' | 'groups' | 'servers'>('instances');
const showSetupChecklist = ref(false);
const isLoading = ref(false);
const feedbackMessage = ref('');
const feedbackIsError = ref(false);

const servers = ref<any[]>([]);
const instances = ref<any[]>([]);
const groups = ref<any[]>([]);
const groupSearch = ref('');

const hasConnectedInstance = computed(() =>
  instances.value.some((inst) => inst.status === 'CONNECTED'),
);

// Novo Servidor
const newServer = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
});

// Nova Instância
const newInstance = ref({
  serverId: '',
  instanceName: '',
  displayName: '',
});

// Modal de QR Code
const qrModalOpen = ref(false);
const selectedInstance = ref<any>(null);
const currentQrCode = ref<string | null>(null);
let qrPollingTimer: any = null;

const filteredGroups = computed(() => {
  if (!groupSearch.value.trim()) return groups.value;
  const q = groupSearch.value.toLowerCase();
  return groups.value.filter(
    (g) => g.name.toLowerCase().includes(q) || g.jid.toLowerCase().includes(q),
  );
});

function showFeedback(msg: string, isError = false) {
  feedbackMessage.value = msg;
  feedbackIsError.value = isError;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'bg-green-100 text-green-800';
    case 'CONNECTING':
      return 'bg-amber-100 text-amber-800 animate-pulse';
    case 'DISCONNECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'Conectada';
    case 'CONNECTING':
      return 'Conectando...';
    case 'DISCONNECTED':
      return 'Desconectada';
    case 'CREATED':
      return 'Aguardando QR';
    default:
      return status;
  }
}

// ==========================================
// SERVIDORES
// ==========================================
async function loadServers() {
  try {
    const res = await fetch('/api/evolution-servers', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      servers.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar servidores.', true);
  }
}

async function handleCreateServer() {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch('/api/evolution-servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(newServer.value),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Falha ao conectar no servidor Evolution.');
    }

    showFeedback('Servidor Evolution cadastrado e validado com sucesso!');
    newServer.value = { name: '', baseUrl: '', apiKey: '' };
    await loadServers();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function deleteServer(server: any) {
  if (!confirm(`Deseja realmente excluir o servidor '${server.name}'?`)) return;

  try {
    const res = await fetch(`/api/evolution-servers/${server.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Servidor removido.');
    await loadServers();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

// ==========================================
// INSTÂNCIAS
// ==========================================
async function loadInstances() {
  try {
    const res = await fetch('/api/whatsapp-instances', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      instances.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar instâncias.', true);
  }
}

async function handleCreateInstance() {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch('/api/whatsapp-instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(newInstance.value),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Falha ao criar instância na Evolution API.');
    }

    showFeedback('Instância criada com sucesso! Agora leia o QR Code.');
    newInstance.value = { serverId: '', instanceName: '', displayName: '' };
    await loadInstances();

    // Se a instância foi criada, abre o QR Code automaticamente
    openQrModal(data.data);
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function checkInstanceStatus(inst: any) {
  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}/status`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Status atual de ${inst.displayName}: ${getStatusLabel(data.data.status)}`);
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function logoutInstance(inst: any) {
  if (!confirm(`Deseja desconectar a sessão do WhatsApp de '${inst.displayName}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Instância desconectada.');
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function deleteInstance(inst: any) {
  if (!confirm(`Deseja remover completamente a instância '${inst.displayName}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Instância removida com sucesso.');
    await loadInstances();
    await loadGroups();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

// ==========================================
// QR CODE & PAREAMENTO
// ==========================================
async function openQrModal(inst: any) {
  selectedInstance.value = inst;
  currentQrCode.value = null;
  qrModalOpen.value = true;

  await refreshQrCode();

  // Inicia polling a cada 5 segundos
  if (qrPollingTimer) clearInterval(qrPollingTimer);
  qrPollingTimer = setInterval(async () => {
    if (!selectedInstance.value || !qrModalOpen.value) return;

    // Checa status
    const statusRes = await fetch(`/api/whatsapp-instances/${selectedInstance.value.id}/status`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const statusData = await statusRes.json();

    if (statusData.data?.status === 'CONNECTED') {
      clearInterval(qrPollingTimer);
      closeQrModal();
      showFeedback(`WhatsApp conectado com sucesso na instância ${selectedInstance.value.displayName}!`);
      await loadInstances();
    }
  }, 5000);
}

async function refreshQrCode() {
  if (!selectedInstance.value) return;
  try {
    const res = await fetch(`/api/whatsapp-instances/${selectedInstance.value.id}/qrcode`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();

    if (data.data?.status === 'CONNECTED') {
      closeQrModal();
      showFeedback('Instância já conectada!');
      await loadInstances();
      return;
    }

    if (data.data?.base64) {
      currentQrCode.value = data.data.base64;
    }
  } catch (err: any) {
    showFeedback('Falha ao obter QR Code atualizado.', true);
  }
}

function closeQrModal() {
  qrModalOpen.value = false;
  selectedInstance.value = null;
  currentQrCode.value = null;
  if (qrPollingTimer) {
    clearInterval(qrPollingTimer);
    qrPollingTimer = null;
  }
}

// ==========================================
// GRUPOS
// ==========================================
async function loadGroups() {
  try {
    const res = await fetch('/api/whatsapp-groups', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      groups.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar grupos.', true);
  }
}

async function syncGroups(inst: any) {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch(`/api/whatsapp-groups/sync/${inst.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Sincronizados ${data.data.count} grupos com sucesso!`);
    await loadGroups();
    activeTab.value = 'groups';
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function sendTestMessage(group: any) {
  if (!confirm(`Enviar mensagem de demonstração para o grupo '${group.name}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-groups/${group.id}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify({
        text: '🔥 Teste de Conexão ShopeeZap: Integração Evolution API ativa e operacional!',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Mensagem de teste despachada com sucesso para ${group.name}!`);
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

onMounted(async () => {
  await Promise.all([loadServers(), loadInstances(), loadGroups()]);
});

onUnmounted(() => {
  if (qrPollingTimer) clearInterval(qrPollingTimer);
});
</script>
