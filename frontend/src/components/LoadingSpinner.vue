<template>
  <div class="flex items-center justify-center p-4">
    <div
      class="animate-spin rounded-full h-8 w-8 border-b-2 border-shopee-orange"
      :class="customClass"
    ></div>
    <span v-if="label" class="ml-3 text-sm text-gray-500 font-medium">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  customClass?: string;
}>();
</script>
