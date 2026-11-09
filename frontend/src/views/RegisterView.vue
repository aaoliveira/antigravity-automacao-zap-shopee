<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <div class="mx-auto w-12 h-12 rounded-xl bg-shopee-orange flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
        S
      </div>
      <h2 class="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight">
        Crie sua conta de Afiliado
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        Já possui acesso?
        <router-link to="/login" class="font-medium text-shopee-orange hover:text-shopee-hover">
          Faça login
        </router-link>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-2xl sm:px-10">
        <div v-if="authStore.error" class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ authStore.error }}
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Seu Nome Completo</label>
            <div class="mt-1">
              <input
                id="name"
                v-model="name"
                type="text"
                required
                placeholder="Ex: Lucas Martins"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="tenantName" class="block text-sm font-medium text-gray-700">Nome da sua Operação / Tenant</label>
            <div class="mt-1">
              <input
                id="tenantName"
                v-model="tenantName"
                type="text"
                required
                placeholder="Ex: Achadinhos Vip Shopee"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email Corporativo ou Pessoal</label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="seu@email.com"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Senha Segura</label>
            <div class="mt-1">
              <input
                id="password"
                v-model="password"
                type="password"
                required
                placeholder="Mínimo 8 caracteres (maiúscula + número)"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
              />
            </div>
            <p class="mt-1 text-xs text-gray-400">Deve conter pelo menos 8 dígitos, letra maiúscula e número.</p>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-shopee-orange hover:bg-shopee-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shopee-orange disabled:opacity-50 transition-colors"
            >
              <span v-if="!authStore.isLoading">Criar Conta e Começar</span>
              <span v-else>Criando Conta...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const name = ref('');
const tenantName = ref('');
const email = ref('');
const password = ref('');

const handleSubmit = async () => {
  try {
    await authStore.register({
      name: name.value,
      tenantName: tenantName.value,
      email: email.value,
      password: password.value,
    });
    router.push('/dashboard');
  } catch (e) {
    // Erro capturado no store
  }
};
</script>
