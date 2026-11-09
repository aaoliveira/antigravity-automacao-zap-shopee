<template>
  <AppLayout>
    <template #header>
      Credenciais Shopee Affiliate
    </template>

    <div class="max-w-4xl space-y-6">
      <!-- Formulário de Nova Credencial -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">Conectar Credencial Shopee Open API</h3>
        <p class="text-sm text-gray-500 mb-5">
          Insira seu App ID e App Secret obtidos no portal oficial de desenvolvedores de afiliados da Shopee. Seu Secret será cifrado em repouso com algoritmo AES-256-GCM.
        </p>

        <div v-if="feedbackMessage" :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'" class="mb-4 p-4 rounded-lg border text-sm">
          {{ feedbackMessage }}
        </div>

        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rótulo / Nome da Credencial</label>
              <input
                v-model="label"
                type="text"
                required
                placeholder="Ex: Minha Conta Shopee Principal"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">App ID Oficial</label>
              <input
                v-model="appId"
                type="text"
                required
                placeholder="Ex: 10928374"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
            <input
              v-model="appSecret"
              type="password"
              required
              placeholder="Cole aqui seu App Secret confidencial"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
            />
            <p class="mt-1 text-xs text-gray-400">O segredo nunca será exibido desmascarado após o salvamento.</p>
          </div>

          <div class="flex justify-end pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center"
            >
              <span v-if="!isLoading">Validar e Salvar Credencial</span>
              <span v-else>Validando com a Shopee...</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Lista de Credenciais Cadastradas -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Credenciais Ativas</h3>
            <p class="text-sm text-gray-500 mt-0.5">Credenciais vinculadas à sua organização para geração automática de links de afiliado.</p>
          </div>
          <button
            @click="fetchCredentials"
            class="text-xs text-gray-500 hover:text-shopee-orange font-medium flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>

        <div v-if="loadingList" class="p-8">
          <LoadingSpinner label="Carregando credenciais..." />
        </div>

        <div v-else-if="credentials.length === 0" class="p-8">
          <EmptyState
            title="Nenhuma credencial Shopee configurada"
            description="Cadastre seu App ID e Secret no formulário acima para habilitar o encurtador de links e as consultas de produtos."
          />
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="cred in credentials"
            :key="cred.id"
            class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-semibold text-gray-900 text-sm">{{ cred.label }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="cred.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ cred.isValid ? 'Conectado e Válido' : 'Falha na Validação' }}
                </span>
              </div>
              <div class="mt-1 space-y-0.5 text-xs text-gray-500 font-mono">
                <p>App ID: {{ cred.appId }}</p>
                <p>App Secret: {{ cred.appSecretMasked }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button
                @click="handleRevalidate(cred.id)"
                :disabled="revalidatingId === cred.id"
                class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {{ revalidatingId === cred.id ? 'Testando...' : 'Testar Conexão' }}
              </button>
              <button
                @click="handleDelete(cred.id)"
                class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                Remover
              </button>
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
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/EmptyState.vue';
import api from '../services/api';

const label = ref('');
const appId = ref('');
const appSecret = ref('');
const isLoading = ref(false);
const loadingList = ref(false);
const revalidatingId = ref<string | null>(null);
const feedbackMessage = ref('');
const feedbackIsError = ref(false);

interface CredentialItem {
  id: string;
  label: string;
  appId: string;
  appSecretMasked: string;
  isValid: boolean;
  lastValidatedAt: string | null;
}

const credentials = ref<CredentialItem[]>([]);

const fetchCredentials = async () => {
  loadingList.value = true;
  try {
    const res = await api.get('/shopee-credentials');
    credentials.value = res.data.data;
  } catch (err: any) {
    feedbackMessage.value = 'Erro ao carregar credenciais.';
    feedbackIsError.value = true;
  } finally {
    loadingList.value = false;
  }
};

const handleSave = async () => {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    await api.post('/shopee-credentials', {
      label: label.value,
      appId: appId.value,
      appSecret: appSecret.value,
    });
    feedbackMessage.value = 'Credencial cadastrada e validada com sucesso na Shopee!';
    feedbackIsError.value = false;
    label.value = '';
    appId.value = '';
    appSecret.value = '';
    await fetchCredentials();
  } catch (err: any) {
    feedbackMessage.value = err.response?.data?.error?.message || 'Falha ao validar ou salvar credencial Shopee.';
    feedbackIsError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const handleRevalidate = async (id: string) => {
  revalidatingId.value = id;
  try {
    const res = await api.post(`/shopee-credentials/${id}/test`);
    feedbackMessage.value = res.data.data.isValid
      ? 'Conexão com a Shopee revalidada com sucesso!'
      : 'A Shopee rejeitou a credencial no teste.';
    feedbackIsError.value = !res.data.data.isValid;
    await fetchCredentials();
  } catch (err: any) {
    feedbackMessage.value = 'Falha ao testar credencial.';
    feedbackIsError.value = true;
  } finally {
    revalidatingId.value = null;
  }
};

const handleDelete = async (id: string) => {
  if (!confirm('Deseja realmente remover esta credencial Shopee?')) return;
  try {
    await api.delete(`/shopee-credentials/${id}`);
    feedbackMessage.value = 'Credencial removida com sucesso.';
    feedbackIsError.value = false;
    await fetchCredentials();
  } catch (err: any) {
    feedbackMessage.value = err.response?.data?.error?.message || 'Falha ao remover credencial.';
    feedbackIsError.value = true;
  }
};

onMounted(fetchCredentials);
</script>
