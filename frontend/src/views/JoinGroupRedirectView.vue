<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-lg p-7 text-center space-y-5">
      <div class="mx-auto w-14 h-14 rounded-2xl bg-shopee-light text-shopee-orange flex items-center justify-center">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      <!-- Carregando -->
      <div v-if="loading" class="space-y-2 py-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-shopee-orange mx-auto"></div>
        <h1 class="text-lg font-bold text-gray-900">Encontrando grupo disponível...</h1>
        <p class="text-sm text-gray-500">
          Estamos verificando a lotação atual dos grupos para direcionar você ao grupo mais vazio.
        </p>
      </div>

      <!-- Grupo Disponível -->
      <div v-else-if="resolved?.available && isSafeWhatsAppUrl(resolved.inviteUrl)" class="space-y-4">
        <div class="space-y-1">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Vaga disponível
          </span>
          <h1 class="text-xl font-bold text-gray-900 pt-1">{{ resolved.name }}</h1>
          <p class="text-sm text-gray-600">
            Direcionando para <strong>{{ resolved.groupName }}</strong>
            <span v-if="resolved.maxParticipants" class="text-gray-400">
              ({{ resolved.participantCount ?? 0 }}/{{ resolved.maxParticipants }} membros)
            </span>
          </p>
        </div>

        <a
          :href="resolved.inviteUrl!"
          rel="noopener noreferrer"
          class="w-full inline-flex items-center justify-center px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          Entrar no Grupo do WhatsApp
        </a>

        <p class="text-xs text-gray-400">
          Você será redirecionado automaticamente em instantes...
        </p>
      </div>

      <!-- Todos os Grupos Lotados ou Link Inválido -->
      <div v-else class="space-y-4">
        <div class="space-y-1">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Indisponível no momento
          </span>
          <h1 class="text-xl font-bold text-gray-900 pt-1">
            {{ resolved?.name || 'Link de Grupo' }}
          </h1>
          <p class="text-sm text-gray-600">
            {{ errorMessage || resolved?.message || 'Nenhum grupo com vaga disponível foi encontrado neste link.' }}
          </p>
        </div>

        <button
          type="button"
          @click="resolveSlug"
          class="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Verificar Vagas Novamente
        </button>
      </div>

      <p class="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
        Link Permanente Inteligente • O grupo mudou, o link continua.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

interface ResolvedPayload {
  slug: string;
  name: string;
  available: boolean;
  inviteUrl: string | null;
  groupName: string | null;
  participantCount: number | null;
  maxParticipants: number | null;
  message: string;
}

const WHATSAPP_URL_REGEX = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{6,100}$/;

const route = useRoute();
const loading = ref(true);
const resolved = ref<ResolvedPayload | null>(null);
const errorMessage = ref('');
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

function isSafeWhatsAppUrl(url: string | null | undefined): boolean {
  return Boolean(url && WHATSAPP_URL_REGEX.test(url));
}

async function resolveSlug() {
  loading.value = true;
  errorMessage.value = '';
  if (redirectTimer) {
    clearTimeout(redirectTimer);
    redirectTimer = null;
  }

  const slug = String(route.params.slug || '').trim();
  if (!slug) {
    loading.value = false;
    errorMessage.value = 'Identificador do link inválido.';
    return;
  }

  try {
    const res = await fetch(`/api/join/${encodeURIComponent(slug)}/resolve`);
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body?.error?.message || body?.message || 'Link permanente não encontrado ou inativo.');
    }

    resolved.value = body.data;

    if (body.data?.available && isSafeWhatsAppUrl(body.data.inviteUrl)) {
      redirectTimer = setTimeout(() => {
        window.location.assign(body.data.inviteUrl);
      }, 1500);
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Falha ao consultar disponibilidade do grupo.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  resolveSlug();
});

onUnmounted(() => {
  if (redirectTimer) {
    clearTimeout(redirectTimer);
    redirectTimer = null;
  }
});
</script>
