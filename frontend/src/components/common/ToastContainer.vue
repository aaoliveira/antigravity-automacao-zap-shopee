<template>
  <div class="fixed top-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
    <transition-group
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-xl shadow-lg border text-sm flex items-start space-x-3 backdrop-blur-md"
        :class="getToastClasses(toast.type)"
      >
        <span class="text-lg leading-none mt-0.5">
          <template v-if="toast.type === 'success'">✅</template>
          <template v-else-if="toast.type === 'error'">❌</template>
          <template v-else-if="toast.type === 'warning'">⚠️</template>
          <template v-else>ℹ️</template>
        </span>
        <div class="flex-1 font-medium leading-snug">
          {{ toast.message }}
        </div>
        <button
          @click="remove(toast.id)"
          class="text-gray-400 hover:text-gray-600 font-bold text-sm leading-none ml-2"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '../../composables/useToast';

const { toasts, remove } = useToast();

function getToastClasses(type: string) {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'error':
      return 'bg-rose-50 text-rose-900 border-rose-200';
    case 'warning':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    default:
      return 'bg-blue-50 text-blue-900 border-blue-200';
  }
}
</script>
