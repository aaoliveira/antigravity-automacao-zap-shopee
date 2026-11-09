<template>
  <div class="p-12 text-center rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4 max-w-lg mx-auto my-6">
    <div class="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-shopee-orange flex items-center justify-center">
      <slot name="icon">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </slot>
    </div>

    <div>
      <h4 class="text-base font-bold text-gray-900">{{ title }}</h4>
      <p class="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">{{ description }}</p>
    </div>

    <div v-if="$slots.action" class="pt-2">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>
