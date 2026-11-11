<template>
  <AppLayout>
    <template #header>
      Configurações da Organização & Conta
    </template>

    <div class="max-w-4xl space-y-6">
      <!-- Card de Edição dos Dados do Cadastro (Perfil & Operação) -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h3 class="text-base font-bold text-gray-900">Dados do Cadastro (Perfil & Operação)</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Atualize seu nome, e-mail de acesso, nome da organização e fuso horário padrão das automações.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <span
              v-if="authStore.user?.email"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-50 border border-gray-200 text-gray-600"
            >
              {{ authStore.user.email }}
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
              Papel: {{ authStore.user?.role || 'OWNER' }}
            </span>
          </div>
        </div>

        <div
          v-if="profileFeedback"
          data-testid="profile-feedback"
          :class="profileFeedbackIsError ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
          class="text-xs px-3.5 py-2.5 rounded-lg border font-medium"
        >
          {{ profileFeedback }}
        </div>

        <form class="space-y-4" @submit.prevent="handleSaveProfile">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label for="profileName" class="block text-xs font-semibold text-gray-700 mb-1">Nome Completo</label>
              <input
                id="profileName"
                v-model="profileForm.name"
                data-testid="input-profile-name"
                type="text"
                required
                minlength="2"
                placeholder="Ex: Lucas Martins"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
              />
            </div>

            <div>
              <label for="profileEmail" class="block text-xs font-semibold text-gray-700 mb-1">Endereço de E-mail</label>
              <input
                id="profileEmail"
                v-model="profileForm.email"
                data-testid="input-profile-email"
                type="email"
                required
                placeholder="seu@email.com"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
              />
            </div>

            <div>
              <label for="profileTenantName" class="block text-xs font-semibold text-gray-700 mb-1">
                Nome da Operação / Tenant
              </label>
              <input
                id="profileTenantName"
                v-model="profileForm.tenantName"
                data-testid="input-profile-tenant-name"
                type="text"
                required
                minlength="2"
                :disabled="!canEditTenant"
                placeholder="Ex: Achadinhos Vip Shopee"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
              <p v-if="!canEditTenant" class="text-[11px] text-gray-400 mt-1">
                Somente proprietários ou administradores alteram dados da organização.
              </p>
            </div>

            <div>
              <label for="profileTimezone" class="block text-xs font-semibold text-gray-700 mb-1">
                Fuso Horário Padrão
              </label>
              <select
                id="profileTimezone"
                v-model="profileForm.timezone"
                data-testid="select-profile-timezone"
                :disabled="!canEditTenant"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option v-for="tz in timezoneOptions" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </select>
            </div>
          </div>

          <div
            v-if="isEmailChanged"
            class="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2"
          >
            <label for="profileCurrentPassword" class="block text-xs font-semibold text-amber-900">
              Confirme sua Senha Atual (obrigatório para alterar o e-mail de login)
            </label>
            <input
              id="profileCurrentPassword"
              v-model="profileForm.currentPassword"
              data-testid="input-profile-current-password"
              type="password"
              required
              placeholder="Digite sua senha atual"
              class="w-full md:w-1/2 px-3 py-2 border border-amber-300 rounded-lg bg-white text-sm focus:ring-shopee-orange focus:border-shopee-orange"
            />
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div class="text-xs text-gray-500">
              <span class="font-semibold">ID do Tenant:</span>
              <code class="ml-1 font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{{ authStore.tenant?.id || '-' }}</code>
            </div>

            <button
              type="submit"
              data-testid="btn-save-profile"
              :disabled="savingProfile"
              class="px-5 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors self-end sm:self-auto"
            >
              {{ savingProfile ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Card de Segurança & Alteração de Senha -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div class="border-b border-gray-100 pb-3">
          <h3 class="text-base font-bold text-gray-900">Alterar Senha de Acesso</h3>
          <p class="text-xs text-gray-500 mt-0.5">
            Utilize uma senha forte com no mínimo 8 caracteres, letra maiúscula, minúscula e número.
          </p>
        </div>

        <div
          v-if="passwordFeedback"
          data-testid="password-feedback"
          :class="passwordFeedbackIsError ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
          class="text-xs px-3.5 py-2.5 rounded-lg border font-medium"
        >
          {{ passwordFeedback }}
        </div>

        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label for="currentPassword" class="block text-xs font-semibold text-gray-700 mb-1">Senha Atual</label>
              <input
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                data-testid="input-change-current-password"
                type="password"
                required
                placeholder="••••••••"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
              />
            </div>

            <div>
              <label for="newPassword" class="block text-xs font-semibold text-gray-700 mb-1">Nova Senha</label>
              <input
                id="newPassword"
                v-model="passwordForm.newPassword"
                data-testid="input-change-new-password"
                type="password"
                required
                minlength="8"
                placeholder="Mínimo 8 caracteres"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
              />
            </div>

            <div>
              <label for="confirmPassword" class="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nova Senha</label>
              <input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                data-testid="input-change-confirm-password"
                type="password"
                required
                minlength="8"
                placeholder="Repita a nova senha"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange text-sm"
              />
            </div>
          </div>

          <div class="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="submit"
              data-testid="btn-save-password"
              :disabled="savingPassword"
              class="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {{ savingPassword ? 'Atualizando...' : 'Atualizar Senha' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Card de Feature Flags Dinâmicas -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-gray-900">Feature Flags & Funcionalidades Opcionais</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Controle quais modos de integração do Mercado Livre ficam habilitados para os usuários desta organização.
            </p>
          </div>
          <router-link to="/mercadolivre" class="text-xs font-semibold text-shopee-orange hover:underline shrink-0">
            Abrir Mercado Livre →
          </router-link>
        </div>

        <div v-if="flagFeedback" class="text-xs px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
          {{ flagFeedback }}
        </div>

        <div class="space-y-3">
          <div
            v-for="item in featureFlagItems"
            :key="item.key"
            class="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-gray-200 bg-gray-50/70"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900">{{ item.title }}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                  Padrão: {{ item.defaultValue ? 'ON' : 'OFF' }}
                </span>
              </div>
              <p class="text-xs text-gray-600">{{ item.description }}</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="item.enabled"
              :disabled="updatingFlagKey === item.key"
              @click="toggleFeatureFlag(item)"
              :class="item.enabled ? 'bg-shopee-orange' : 'bg-gray-300'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
            >
              <span
                :class="item.enabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Card de Governança e Segurança -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h3 class="text-base font-bold text-gray-900 flex items-center">
          <span class="mr-2">🛡️</span> Padrões de Segurança Ativos
        </h3>
        <ul class="text-xs text-gray-600 space-y-2 list-disc list-inside">
          <li><strong>Criptografia em Repouso:</strong> Todas as chaves da Evolution API e App Secrets da Shopee são cifrados com AES-256-GCM.</li>
          <li><strong>Proteção Anti-SSRF:</strong> Endpoints bloqueiam rigorosamente destinos de rede interna, loopback e metadados de nuvem.</li>
          <li><strong>Isolamento Multi-Tenant:</strong> Nenhuma credencial, instância, grupo ou automação pode ser acessada de forma cruzada.</li>
        </ul>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();
const featureFlagItems = ref<any[]>([]);
const updatingFlagKey = ref<string | null>(null);
const flagFeedback = ref('');

const timezoneOptions = [
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (Brasília / BRT)' },
  { value: 'America/Manaus', label: 'America/Manaus (AMT)' },
  { value: 'America/Fortaleza', label: 'America/Fortaleza (Nordeste)' },
  { value: 'America/Recife', label: 'America/Recife (Pernambuco)' },
  { value: 'America/Belem', label: 'America/Belem (Pará)' },
  { value: 'America/Cuiaba', label: 'America/Cuiaba (Mato Grosso)' },
  { value: 'America/Rio_Branco', label: 'America/Rio_Branco (Acre)' },
  { value: 'UTC', label: 'UTC (Horário Universal)' },
];

const profileForm = ref({
  name: '',
  email: '',
  tenantName: '',
  timezone: 'America/Sao_Paulo',
  currentPassword: '',
});
const savingProfile = ref(false);
const profileFeedback = ref('');
const profileFeedbackIsError = ref(false);

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const savingPassword = ref(false);
const passwordFeedback = ref('');
const passwordFeedbackIsError = ref(false);

const canEditTenant = computed(() => {
  const role = authStore.user?.role;
  return !role || role === 'OWNER' || role === 'ADMIN';
});

const isEmailChanged = computed(() => {
  const current = (authStore.user?.email || '').trim().toLowerCase();
  const next = profileForm.value.email.trim().toLowerCase();
  return Boolean(current && next && current !== next);
});

function syncFormWithStore() {
  profileForm.value.name = authStore.user?.name || '';
  profileForm.value.email = authStore.user?.email || '';
  profileForm.value.tenantName = authStore.tenant?.name || '';
  profileForm.value.timezone = authStore.tenant?.timezone || 'America/Sao_Paulo';
  profileForm.value.currentPassword = '';
}

watch(
  () => [authStore.user, authStore.tenant],
  () => syncFormWithStore(),
  { immediate: true, deep: true },
);

function extractApiError(err: any, fallback: string): string {
  const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
}

async function handleSaveProfile() {
  profileFeedback.value = '';
  profileFeedbackIsError.value = false;

  if (isEmailChanged.value && !profileForm.value.currentPassword) {
    profileFeedbackIsError.value = true;
    profileFeedback.value = 'Informe sua senha atual para confirmar a alteração de e-mail.';
    return;
  }

  savingProfile.value = true;
  try {
    const payload: Record<string, string> = {
      name: profileForm.value.name.trim(),
      email: profileForm.value.email.trim(),
    };
    if (canEditTenant.value) {
      payload.tenantName = profileForm.value.tenantName.trim();
      payload.timezone = profileForm.value.timezone;
    }
    if (isEmailChanged.value && profileForm.value.currentPassword) {
      payload.currentPassword = profileForm.value.currentPassword;
    }

    await authStore.updateProfile(payload);
    profileForm.value.currentPassword = '';
    profileFeedback.value = 'Dados do cadastro atualizados com sucesso!';
  } catch (err: any) {
    profileFeedbackIsError.value = true;
    profileFeedback.value = extractApiError(err, 'Falha ao atualizar os dados do cadastro.');
  } finally {
    savingProfile.value = false;
  }
}

async function handleChangePassword() {
  passwordFeedback.value = '';
  passwordFeedbackIsError.value = false;

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordFeedbackIsError.value = true;
    passwordFeedback.value = 'A nova senha e a confirmação não conferem.';
    return;
  }

  savingPassword.value = true;
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    passwordFeedback.value = 'Senha alterada com sucesso!';
  } catch (err: any) {
    passwordFeedbackIsError.value = true;
    passwordFeedback.value = extractApiError(err, 'Falha ao alterar a senha.');
  } finally {
    savingPassword.value = false;
  }
}

async function loadFlags() {
  try {
    const res = await api.get('/feature-flags');
    featureFlagItems.value = res.data?.data?.items || [];
  } catch {
    featureFlagItems.value = [];
  }
}

async function toggleFeatureFlag(item: any) {
  updatingFlagKey.value = item.key;
  flagFeedback.value = '';
  try {
    const res = await api.patch('/feature-flags', { [item.key]: !item.enabled });
    featureFlagItems.value = res.data?.data?.items || [];
    flagFeedback.value = `Flag "${item.title}" ${!item.enabled ? 'habilitada' : 'desabilitada'} com sucesso.`;
  } finally {
    updatingFlagKey.value = null;
  }
}

onMounted(loadFlags);
</script>
