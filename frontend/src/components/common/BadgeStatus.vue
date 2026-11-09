<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
    :class="badgeClass"
  >
    <span class="w-1.5 h-1.5 mr-1.5 rounded-full" :class="dotClass"></span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: string;
}>();

const badgeClass = computed(() => {
  switch (props.status) {
    case 'ACTIVE':
    case 'SUCCESS':
    case 'CONNECTED':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'PAUSED':
    case 'CONNECTING':
    case 'PARTIAL_SUCCESS':
    case 'PENDING':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'FAILED':
    case 'DISCONNECTED':
    case 'DELETED':
      return 'bg-rose-50 text-rose-800 border border-rose-200';
    case 'SKIPPED_NO_ELIGIBLE_PRODUCT':
    case 'SKIPPED_INSTANCE_OFFLINE':
      return 'bg-purple-50 text-purple-800 border border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
});

const dotClass = computed(() => {
  switch (props.status) {
    case 'ACTIVE':
    case 'SUCCESS':
    case 'CONNECTED':
      return 'bg-emerald-500';
    case 'PAUSED':
    case 'CONNECTING':
    case 'PARTIAL_SUCCESS':
    case 'PENDING':
      return 'bg-amber-500 animate-pulse';
    case 'FAILED':
    case 'DISCONNECTED':
    case 'DELETED':
      return 'bg-rose-500';
    case 'SKIPPED_NO_ELIGIBLE_PRODUCT':
    case 'SKIPPED_INSTANCE_OFFLINE':
      return 'bg-purple-500';
    default:
      return 'bg-gray-400';
  }
});

const label = computed(() => {
  switch (props.status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'PAUSED':
      return 'Pausada';
    case 'CONNECTED':
      return 'Conectada';
    case 'DISCONNECTED':
      return 'Desconectada';
    case 'CONNECTING':
      return 'Conectando...';
    case 'CREATED':
      return 'Aguardando QR';
    case 'SUCCESS':
      return 'Sucesso';
    case 'PARTIAL_SUCCESS':
      return 'Sucesso Parcial';
    case 'FAILED':
      return 'Falhou';
    case 'PENDING':
      return 'Pendente';
    case 'SKIPPED_NO_ELIGIBLE_PRODUCT':
      return 'Sem Produto Novo';
    case 'SKIPPED_INSTANCE_OFFLINE':
      return 'WhatsApp Offline';
    default:
      return props.status;
  }
});
</script>
