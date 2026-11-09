<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <div class="mx-auto w-12 h-12 rounded-xl bg-shopee-orange flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
        S
      </div>
      <h2 class="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight">
        Recuperação de Senha
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        Lembrou da senha?
        <router-link to="/login" class="font-medium text-shopee-orange hover:text-shopee-hover">
          Voltar para login
        </router-link>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
        <div v-if="successMessage" class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {{ successMessage }}
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Informe seu Email de Cadastro</label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                type="email"
                required
                placeholder="seu@email.com"
                class="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-shopee-orange hover:bg-shopee-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shopee-orange disabled:opacity-50 transition-colors"
            >
              <span v-if="!isLoading">Enviar Link de Recuperação</span>
              <span v-else>Enviando...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import api from '../services/api';

const email = ref('');
const isLoading = ref(false);
const successMessage = ref('');

const handleSubmit = async () => {
  isLoading.value = true;
  try {
    const res = await api.post('/auth/recover-password', { email: email.value });
    successMessage.value = res.data?.data?.message || 'Instruções enviadas com sucesso.';
  } catch (e) {
    successMessage.value = 'Se o email estiver cadastrado, as instruções foram enviadas.';
  } finally {
    isLoading.value = false;
  }
};
</script>
