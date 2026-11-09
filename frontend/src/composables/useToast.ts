import { ref } from 'vue';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timeoutMs?: number;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', timeoutMs = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastItem = { id, message, type, timeoutMs };
    toasts.value.push(toast);

    if (timeoutMs > 0) {
      setTimeout(() => {
        remove(id);
      }, timeoutMs);
    }
  }

  function success(message: string, timeoutMs = 4000) {
    show(message, 'success', timeoutMs);
  }

  function error(message: string, timeoutMs = 6000) {
    show(message, 'error', timeoutMs);
  }

  function warning(message: string, timeoutMs = 5000) {
    show(message, 'warning', timeoutMs);
  }

  function info(message: string, timeoutMs = 4000) {
    show(message, 'info', timeoutMs);
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    remove,
  };
}
