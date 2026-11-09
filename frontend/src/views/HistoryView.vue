<template>
  <AppLayout>
    <template #header>
      Histórico de Publicações
    </template>

    <div class="max-w-6xl space-y-6">
      <!-- Barra de Filtros e Busca -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Status da Execução</label>
            <select
              v-model="filterStatus"
              @change="fetchExecutions"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
            >
              <option value="">Todos os status</option>
              <option value="SUCCESS">Sucesso</option>
              <option value="PARTIAL_SUCCESS">Sucesso Parcial</option>
              <option value="FAILED">Falha</option>
              <option value="SKIPPED_NO_ELIGIBLE_PRODUCT">Sem Produto Novo</option>
              <option value="SKIPPED_INSTANCE_OFFLINE">WhatsApp Offline</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Filtrar por Automação</label>
            <select
              v-model="filterAutomationId"
              @change="fetchExecutions"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
            >
              <option value="">Todas as automações</option>
              <option v-for="auto in automationsList" :key="auto.id" :value="auto.id">
                {{ auto.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="fetchExecutions"
            :disabled="isLoading"
            class="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center"
          >
            <svg class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      <!-- Estado Vazio -->
      <EmptyState
        v-if="!isLoading && executions.length === 0"
        title="Nenhuma publicação encontrada"
        description="Assim que suas automações executarem seus disparos para os grupos de WhatsApp, o histórico completo aparecerá aqui."
      >
        <template #action>
          <router-link
            to="/automations"
            class="px-4 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Ver Automações
          </router-link>
        </template>
      </EmptyState>

      <!-- Lista / Tabela de Publicações -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 text-left">Data / Hora</th>
                <th class="py-3 px-4 text-left">Automação</th>
                <th class="py-3 px-4 text-left">Produto Selecionado</th>
                <th class="py-3 px-4 text-left">Link Oficial</th>
                <th class="py-3 px-4 text-center">Destinos</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-xs">
              <tr v-for="ex in executions" :key="ex.id" class="hover:bg-gray-50 transition-colors">
                <!-- Data -->
                <td class="py-3 px-4 whitespace-nowrap text-gray-600 font-medium">
                  {{ formatDateTime(ex.startedAt) }}
                </td>

                <!-- Automação -->
                <td class="py-3 px-4 font-semibold text-gray-900 max-w-[160px] truncate">
                  {{ ex.automation?.name || '-' }}
                </td>

                <!-- Produto -->
                <td class="py-3 px-4 max-w-xs">
                  <div v-if="ex.productSnapshot" class="flex items-center space-x-3">
                    <img
                      v-if="ex.productSnapshot.imageUrl"
                      :src="ex.productSnapshot.imageUrl"
                      alt="Thumbnail"
                      class="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                    <div class="truncate">
                      <p class="font-medium text-gray-800 truncate" :title="ex.productSnapshot.title">
                        {{ ex.productSnapshot.title }}
                      </p>
                      <p class="text-shopee-orange font-bold">
                        R$ {{ Number(ex.productSnapshot.price).toFixed(2).replace('.', ',') }}
                      </p>
                    </div>
                  </div>
                  <span v-else class="text-gray-400 italic">Nenhum produto selecionado</span>
                </td>

                <!-- Short Link -->
                <td class="py-3 px-4 max-w-[180px] truncate">
                  <a
                    v-if="ex.affiliateLink?.shortLink"
                    :href="ex.affiliateLink.shortLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-shopee-orange underline font-mono truncate block"
                    :title="ex.affiliateLink.shortLink"
                  >
                    {{ ex.affiliateLink.shortLink }}
                  </a>
                  <span v-else class="text-gray-400">-</span>
                </td>

                <!-- Destinos -->
                <td class="py-3 px-4 text-center whitespace-nowrap font-medium text-gray-700">
                  <span v-if="ex.totalDestinations > 0">
                    {{ ex.successCount }}/{{ ex.totalDestinations }} grupos
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>

                <!-- Status Badge -->
                <td class="py-3 px-4 text-center whitespace-nowrap">
                  <BadgeStatus :status="ex.status" />
                </td>

                <!-- Ações -->
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    @click="openDetails(ex)"
                    class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition-colors"
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div v-if="totalPages > 1" class="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Página {{ currentPage }} de {{ totalPages }} ({{ totalItems }} registros)</span>
          <div class="flex space-x-2">
            <button
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
              class="px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
              class="px-3 py-1 border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Detalhes da Execução -->
      <AppModal v-model="detailsModalOpen" title="Detalhes do Disparo" maxWidth="2xl">
        <div v-if="selectedExecution" class="space-y-5 text-xs text-gray-700">
          <!-- Resumo da Execução -->
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-gray-900">{{ selectedExecution.automation?.name }}</span>
              <BadgeStatus :status="selectedExecution.status" />
            </div>
            <p><strong>Início:</strong> {{ formatDateTime(selectedExecution.startedAt) }}</p>
            <p><strong>Nicho Sorteado:</strong> #{{ selectedExecution.selectedKeyword || 'Padrão' }}</p>
            <p v-if="selectedExecution.errorMessage" class="text-rose-600 font-medium">
              <strong>Motivo:</strong> {{ selectedExecution.errorMessage }}
            </p>
          </div>

          <!-- Produto e Link -->
          <div v-if="selectedExecution.productSnapshot" class="flex items-start space-x-4 p-4 border border-gray-200 rounded-xl">
            <img
              v-if="selectedExecution.productSnapshot.imageUrl"
              :src="selectedExecution.productSnapshot.imageUrl"
              alt="Capa"
              class="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
            />
            <div class="space-y-1">
              <h5 class="font-bold text-gray-900 text-sm">{{ selectedExecution.productSnapshot.title }}</h5>
              <p class="text-shopee-orange font-bold text-sm">
                R$ {{ Number(selectedExecution.productSnapshot.price).toFixed(2).replace('.', ',') }}
              </p>
              <p v-if="selectedExecution.affiliateLink?.shortLink">
                <strong>Link Shopee:</strong>
                <a
                  :href="selectedExecution.affiliateLink.shortLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-shopee-orange underline ml-1 font-mono"
                >
                  {{ selectedExecution.affiliateLink.shortLink }}
                </a>
              </p>
            </div>
          </div>

          <!-- Status Individual por Grupo -->
          <div>
            <h6 class="font-bold text-gray-900 mb-2">Publicações nos Grupos ({{ selectedExecution.publications?.length || 0 }})</h6>
            <div class="border border-gray-200 rounded-xl overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 text-gray-500 font-semibold text-[11px]">
                  <tr>
                    <th class="py-2.5 px-3 text-left">Grupo de WhatsApp</th>
                    <th class="py-2.5 px-3 text-left">JID WhatsApp</th>
                    <th class="py-2.5 px-3 text-center">Status</th>
                    <th class="py-2.5 px-3 text-right">Evolution Msg ID</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-[11px]">
                  <tr v-for="pub in selectedExecution.publications" :key="pub.id">
                    <td class="py-2 px-3 font-semibold text-gray-900">{{ pub.group?.name }}</td>
                    <td class="py-2 px-3 font-mono text-gray-500">{{ pub.group?.jid }}</td>
                    <td class="py-2 px-3 text-center">
                      <BadgeStatus :status="pub.status" />
                    </td>
                    <td class="py-2 px-3 text-right font-mono text-gray-500">
                      {{ pub.evolutionMessageId || pub.errorMessage || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <template #footer>
          <button
            @click="detailsModalOpen = false"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
          >
            Fechar
          </button>
        </template>
      </AppModal>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import BadgeStatus from '../components/common/BadgeStatus.vue';
import EmptyState from '../components/common/EmptyState.vue';
import AppModal from '../components/common/AppModal.vue';
import { api } from '../services/api';

const executions = ref<any[]>([]);
const automationsList = ref<any[]>([]);
const isLoading = ref(false);

const filterStatus = ref('');
const filterAutomationId = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);

// Modal
const detailsModalOpen = ref(false);
const selectedExecution = ref<any>(null);

function formatDateTime(isoString: string) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR');
}

async function fetchExecutions() {
  isLoading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: 15,
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterAutomationId.value) params.automationId = filterAutomationId.value;

    const res = await api.get('/history/executions', { params });
    if (res.data.success) {
      executions.value = res.data.data.items;
      totalPages.value = res.data.data.totalPages || 1;
      totalItems.value = res.data.data.total || 0;
    }
  } catch (err) {
    console.error('Falha ao carregar histórico:', err);
  } finally {
    isLoading.value = false;
  }
}

async function fetchAutomations() {
  try {
    const res = await api.get('/automations');
    if (res.data.success) {
      automationsList.value = res.data.data;
    }
  } catch (err) {
    console.error('Falha ao carregar automações para o filtro:', err);
  }
}

function changePage(page: number) {
  currentPage.value = page;
  fetchExecutions();
}

function openDetails(execution: any) {
  selectedExecution.value = execution;
  detailsModalOpen.value = true;
}

onMounted(() => {
  fetchExecutions();
  fetchAutomations();
});
</script>
