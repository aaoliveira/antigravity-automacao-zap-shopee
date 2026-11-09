<template>
  <teleport to="body">
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeOnBackdrop"
        @keydown.esc="close"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
          :class="maxWidthClass"
        >
          <!-- Cabeçalho -->
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-bold text-gray-900 leading-tight">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button
              @click="close"
              type="button"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Corpo com scroll -->
          <div class="px-6 py-5 overflow-y-auto flex-1">
            <slot></slot>
          </div>

          <!-- Rodapé Opcional -->
          <div v-if="$slots.footer" class="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    closeOnClickOutside?: boolean;
  }>(),
  {
    title: '',
    maxWidth: 'lg',
    closeOnClickOutside: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm':
      return 'max-w-sm';
    case 'md':
      return 'max-w-md';
    case 'xl':
      return 'max-w-xl';
    case '2xl':
      return 'max-w-2xl';
    case '3xl':
      return 'max-w-3xl';
    default:
      return 'max-w-lg';
  }
});

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function closeOnBackdrop() {
  if (props.closeOnClickOutside) {
    close();
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },
);

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
