<template>
  <div class="space-y-6">
    <!-- Banner Conceitual -->
    <div class="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-shopee-orange text-white uppercase tracking-wide">
            Link Permanente
          </span>
          <h3 class="text-base font-bold text-gray-900">
            O grupo mudou. O link continua.
          </h3>
        </div>
        <p class="text-xs text-gray-600 max-w-3xl leading-relaxed">
          Compartilhe <strong>uma única URL permanente</strong> em sua bio, anúncios e mensagens. Quando um grupo atingir o limite máximo de participantes ou você precisar trocar o destino manualmente, o sistema direciona o cliente automaticamente para o <strong>próximo grupo mais vazio</strong> sem precisar republicar o link.
        </p>
      </div>
    </div>

    <!-- Formulário de Criação / Edição de Link Permanente -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-gray-900">
            {{ editingLinkId ? 'Editar Link Permanente' : 'Criar Novo Link Permanente de Grupo' }}
          </h3>
          <p class="text-xs text-gray-500 mt-0.5">
            Vincule um ou mais grupos de WhatsApp com seus respectivos links de convite e limite de lotação.
          </p>
        </div>
        <button
          v-if="editingLinkId"
          type="button"
          @click="resetForm"
          class="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Cancelar Edição
        </button>
      </div>

      <form @submit.prevent="handleSaveLink" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nome do Link / Campanha *</label>
            <input
              v-model="form.name"
              @input="handleNameInput"
              type="text"
              placeholder="Ex: Clube de Ofertas Shopee VIP"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Slug Permanente *</label>
            <div class="flex items-center">
              <span class="px-2.5 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-xs text-gray-500 font-mono">
                /join/
              </span>
              <input
                v-model="form.slug"
                @input="slugManuallyEdited = true"
                type="text"
                placeholder="clube-vip-shopee"
                pattern="[a-z0-9-]+"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-r-lg text-sm font-mono focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Estratégia de Roteamento *</label>
            <select
              v-model="form.strategy"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-shopee-orange focus:border-shopee-orange"
            >
              <option value="LEAST_FILLED">Próximo grupo mais vazio (Automático)</option>
              <option value="MANUAL_WITH_FALLBACK">Grupo atual manual (Failover se lotar)</option>
              <option value="RANDOM_AVAILABLE">Randomizar entre grupos com vaga</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Máx. Participantes por Grupo *</label>
            <input
              v-model.number="form.maxParticipants"
              type="number"
              min="1"
              max="2000"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
            />
          </div>
        </div>

        <!-- Seleção de Grupos e Convites -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-gray-700">
              Grupos Vinculados ao Link ({{ selectedGroupIds.length }} selecionados)
            </label>
            <span class="text-[11px] text-gray-500">
              Cada grupo precisa de um convite <code class="bg-gray-100 px-1 rounded">https://chat.whatsapp.com/...</code>
            </span>
          </div>

          <div v-if="groups.length === 0" class="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500">
            Sincronize grupos na aba <strong>Instâncias WhatsApp</strong> antes de criar um Link Permanente.
          </div>

          <div v-else class="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            <div
              v-for="grp in groups"
              :key="grp.id"
              class="p-3 transition-colors"
              :class="isGroupSelected(grp.id) ? 'bg-orange-50/40' : 'hover:bg-gray-50'"
            >
              <div class="flex flex-col lg:flex-row lg:items-center gap-3">
                <label class="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    :checked="isGroupSelected(grp.id)"
                    @change="toggleGroup(grp)"
                    class="rounded text-shopee-orange focus:ring-shopee-orange"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ grp.name }}</p>
                    <p class="text-[11px] text-gray-500 font-mono truncate">
                      {{ grp.participantCount ?? 0 }} membros • {{ grp.instance?.displayName }}
                    </p>
                  </div>
                </label>

                <div
                  v-if="isGroupSelected(grp.id)"
                  class="flex flex-wrap sm:flex-nowrap items-center gap-2 lg:w-[62%]"
                >
                  <input
                    v-model="targetStates[grp.id].inviteUrl"
                    type="url"
                    placeholder="https://chat.whatsapp.com/CodigoDoGrupo"
                    class="flex-1 min-w-[200px] px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                  <button
                    type="button"
                    :disabled="fetchingInviteId === grp.id"
                    @click="fetchInviteForGroup(grp)"
                    title="Tentar obter o convite oficial automaticamente via Evolution API (requer que o número conectado seja admin do grupo)"
                    class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg shrink-0 disabled:opacity-50"
                  >
                    {{ fetchingInviteId === grp.id ? 'Buscando...' : 'Obter Convite' }}
                  </button>
                  <div class="flex items-center gap-1 shrink-0">
                    <span class="text-[11px] text-gray-500">Máx:</span>
                    <input
                      v-model.number="targetStates[grp.id].maxParticipants"
                      type="number"
                      min="1"
                      max="2000"
                      :placeholder="String(form.maxParticipants)"
                      class="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center"
                    />
                  </div>
                  <label class="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="currentGroupRadio"
                      :value="grp.id"
                      v-model="form.currentGroupId"
                      class="text-shopee-orange focus:ring-shopee-orange"
                    />
                    Inicial/Atual
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div class="text-xs text-gray-500 font-mono truncate">
            URL Permanente: <strong class="text-gray-800">{{ publicOrigin }}/join/{{ form.slug || 'seu-slug' }}</strong>
          </div>
          <button
            type="submit"
            :disabled="saving || selectedGroupIds.length === 0"
            class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
          >
            {{ saving ? 'Salvando...' : editingLinkId ? 'Salvar Alterações no Link' : 'Criar Link Permanente' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Links Permanentes Configurados -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-base font-semibold text-gray-900">
          Links Permanentes Ativos ({{ links.length }})
        </h3>
        <button
          type="button"
          @click="$emit('refresh')"
          class="text-xs font-semibold text-shopee-orange hover:underline"
        >
          Atualizar Lista
        </button>
      </div>

      <div v-if="links.length === 0" class="p-10 text-center text-gray-500 text-sm">
        Nenhum Link Permanente cadastrado ainda. Crie seu primeiro link acima para distribuir leads entre vários grupos sem trocar de URL.
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div v-for="link in links" :key="link.id" class="p-6 space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div class="space-y-2 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-base font-bold text-gray-900">{{ link.name }}</h4>
                <span
                  :class="link.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'"
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                >
                  {{ link.isActive ? 'Ativo' : 'Inativo' }}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-shopee-orange">
                  {{ formatStrategy(link.strategy) }}
                </span>
                <span class="text-xs text-gray-500">
                  • {{ link.totalClicks || 0 }} acessos • Limite padrão {{ link.maxParticipants }} membros
                </span>
              </div>

              <!-- Box da URL Permanente Compartilhável -->
              <div class="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span class="text-[11px] font-semibold text-gray-500 uppercase">URL Única:</span>
                <code class="text-xs font-mono text-gray-800 flex-1 truncate">
                  {{ getPublicShareUrl(link.slug) }}
                </code>
                <button
                  type="button"
                  @click="copyShareUrl(link.slug)"
                  class="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md"
                >
                  {{ copiedSlug === link.slug ? 'Copiado!' : 'Copiar Link' }}
                </button>
                <a
                  :href="`/join/${link.slug}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 bg-shopee-light text-shopee-orange hover:bg-orange-100 text-xs font-semibold rounded-md"
                >
                  Testar Página
                </a>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                :disabled="syncingLinkId === link.id"
                @click="syncLink(link)"
                class="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {{ syncingLinkId === link.id ? 'Sincronizando...' : 'Sincronizar Ocupação' }}
              </button>
              <button
                type="button"
                @click="startEdit(link)"
                class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Editar
              </button>
              <button
                type="button"
                @click="deleteLink(link)"
                class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>

          <!-- Grupos Vinculados com Ocupação e Troca Manual de Destino -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="target in link.targets"
              :key="target.id"
              class="border rounded-xl p-3 space-y-2 transition-colors"
              :class="target.groupId === link.currentGroupId ? 'border-green-400 bg-green-50/40' : 'border-gray-200 bg-white'"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-gray-900 truncate">{{ target.group?.name }}</p>
                  <p class="text-[11px] text-gray-500">
                    {{ target.group?.participantCount ?? 0 }} / {{ effectiveMax(link, target) }} participantes
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <span
                    v-if="target.groupId === link.currentGroupId"
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white"
                  >
                    ATUAL
                  </span>
                  <span
                    v-if="isFull(link, target)"
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700"
                  >
                    LOTADO
                  </span>
                </div>
              </div>

              <!-- Barra de ocupação -->
              <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="isFull(link, target) ? 'bg-red-500' : 'bg-shopee-orange'"
                  :style="{ width: `${occupancyPercent(link, target)}%` }"
                ></div>
              </div>

              <div class="flex items-center justify-between gap-2 pt-0.5">
                <span
                  v-if="target.inviteUrl || target.group?.inviteUrl"
                  class="text-[10px] font-mono text-gray-500 truncate"
                >
                  {{ target.inviteUrl || target.group?.inviteUrl }}
                </span>
                <span v-else class="text-[10px] font-medium text-amber-600">
                  Sem link de convite
                </span>

                <button
                  v-if="target.groupId !== link.currentGroupId"
                  type="button"
                  @click="switchCurrentGroup(link, target.groupId)"
                  class="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-shopee-light hover:text-shopee-orange text-gray-700 rounded shrink-0"
                >
                  Definir como Atual
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';

defineProps<{
  groups: any[];
  links: any[];
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'feedback', message: string, isError?: boolean): void;
}>();

const authStore = useAuthStore();
const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';

const editingLinkId = ref<string | null>(null);
const slugManuallyEdited = ref(false);
const saving = ref(false);
const fetchingInviteId = ref<string | null>(null);
const syncingLinkId = ref<string | null>(null);
const copiedSlug = ref<string | null>(null);

const form = ref({
  name: '',
  slug: '',
  strategy: 'LEAST_FILLED' as 'LEAST_FILLED' | 'RANDOM_AVAILABLE' | 'MANUAL_WITH_FALLBACK',
  maxParticipants: 1024,
  currentGroupId: '' as string,
});

const targetStates = ref<
  Record<
    string,
    {
      selected: boolean;
      inviteUrl: string;
      maxParticipants: number | null;
      priority: number;
    }
  >
>({});

const selectedGroupIds = computed(() =>
  Object.entries(targetStates.value)
    .filter(([, st]) => st.selected)
    .map(([groupId]) => groupId),
);

function isGroupSelected(groupId: string): boolean {
  return Boolean(targetStates.value[groupId]?.selected);
}

function toggleGroup(grp: any) {
  const current = targetStates.value[grp.id];
  if (current?.selected) {
    targetStates.value[grp.id].selected = false;
    if (form.value.currentGroupId === grp.id) {
      form.value.currentGroupId = selectedGroupIds.value[0] || '';
    }
    return;
  }

  targetStates.value[grp.id] = {
    selected: true,
    inviteUrl: current?.inviteUrl || grp.inviteUrl || '',
    maxParticipants: current?.maxParticipants ?? null,
    priority: Object.values(targetStates.value).filter((s) => s.selected).length,
  };

  if (!form.value.currentGroupId) {
    form.value.currentGroupId = grp.id;
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function handleNameInput() {
  if (!editingLinkId.value && !slugManuallyEdited.value) {
    form.value.slug = slugify(form.value.name);
  }
}

function resetForm() {
  editingLinkId.value = null;
  slugManuallyEdited.value = false;
  form.value = {
    name: '',
    slug: '',
    strategy: 'LEAST_FILLED',
    maxParticipants: 1024,
    currentGroupId: '',
  };
  targetStates.value = {};
}

function startEdit(link: any) {
  editingLinkId.value = link.id;
  slugManuallyEdited.value = true;
  form.value = {
    name: link.name,
    slug: link.slug,
    strategy: link.strategy,
    maxParticipants: link.maxParticipants || 1024,
    currentGroupId: link.currentGroupId || '',
  };

  const nextTargets: typeof targetStates.value = {};
  (link.targets || []).forEach((t: any, idx: number) => {
    nextTargets[t.groupId] = {
      selected: true,
      inviteUrl: t.inviteUrl || t.group?.inviteUrl || '',
      maxParticipants: t.maxParticipants ?? null,
      priority: t.priority ?? idx,
    };
  });
  targetStates.value = nextTargets;
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function fetchInviteForGroup(grp: any) {
  fetchingInviteId.value = grp.id;
  try {
    const res = await fetch(`/api/whatsapp-groups/${grp.id}/fetch-invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao buscar convite do grupo.');
    }

    if (data.data?.inviteUrl && targetStates.value[grp.id]) {
      targetStates.value[grp.id].inviteUrl = data.data.inviteUrl;
    }
    emit('feedback', `Convite oficial do grupo '${grp.name}' importado com sucesso!`);
    emit('refresh');
  } catch (err: any) {
    emit('feedback', err.message || 'Não foi possível obter o convite automaticamente.', true);
  } finally {
    fetchingInviteId.value = null;
  }
}

async function handleSaveLink() {
  if (selectedGroupIds.value.length === 0) {
    emit('feedback', 'Selecione ao menos um grupo de WhatsApp para compor o Link Permanente.', true);
    return;
  }

  saving.value = true;
  try {
    const targets = selectedGroupIds.value.map((groupId, idx) => {
      const state = targetStates.value[groupId];
      const payloadTarget: Record<string, any> = {
        groupId,
        priority: state.priority ?? idx,
        isEnabled: true,
      };
      if (state.inviteUrl && state.inviteUrl.trim()) {
        payloadTarget.inviteUrl = state.inviteUrl.trim();
      }
      if (state.maxParticipants && Number(state.maxParticipants) > 0) {
        payloadTarget.maxParticipants = Number(state.maxParticipants);
      }
      return payloadTarget;
    });

    const payload: Record<string, any> = {
      name: form.value.name.trim(),
      slug: form.value.slug.trim().toLowerCase(),
      strategy: form.value.strategy,
      maxParticipants: Number(form.value.maxParticipants) || 1024,
      targets,
    };
    if (form.value.currentGroupId) {
      payload.currentGroupId = form.value.currentGroupId;
    }

    const url = editingLinkId.value
      ? `/api/group-links/${editingLinkId.value}`
      : '/api/group-links';
    const method = editingLinkId.value ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao salvar Link Permanente.');
    }

    emit(
      'feedback',
      editingLinkId.value
        ? 'Link permanente atualizado! A URL compartilhada permanece exatamente a mesma.'
        : 'Link permanente criado com sucesso!',
    );
    resetForm();
    emit('refresh');
  } catch (err: any) {
    emit('feedback', err.message, true);
  } finally {
    saving.value = false;
  }
}

async function switchCurrentGroup(link: any, groupId: string) {
  try {
    const res = await fetch(`/api/group-links/${link.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify({ currentGroupId: groupId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao trocar grupo atual.');
    }

    emit('feedback', `Destino do link '${link.slug}' atualizado mantendo a mesma URL permanente!`);
    emit('refresh');
  } catch (err: any) {
    emit('feedback', err.message, true);
  }
}

async function syncLink(link: any) {
  syncingLinkId.value = link.id;
  try {
    const res = await fetch(`/api/group-links/${link.id}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao sincronizar lotação.');
    }

    emit('feedback', `Lotação e convites do link '${link.slug}' sincronizados via Evolution API.`);
    emit('refresh');
  } catch (err: any) {
    emit('feedback', err.message, true);
  } finally {
    syncingLinkId.value = null;
  }
}

async function deleteLink(link: any) {
  if (!confirm(`Deseja excluir o link permanente '${link.name}' (/join/${link.slug})?`)) return;

  try {
    const res = await fetch(`/api/group-links/${link.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao excluir link.');
    }

    emit('feedback', 'Link permanente excluído com sucesso.');
    emit('refresh');
  } catch (err: any) {
    emit('feedback', err.message, true);
  }
}

function getPublicShareUrl(slug: string): string {
  return `${publicOrigin}/join/${slug}`;
}

async function copyShareUrl(slug: string) {
  const url = getPublicShareUrl(slug);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
    copiedSlug.value = slug;
    setTimeout(() => {
      if (copiedSlug.value === slug) copiedSlug.value = null;
    }, 2000);
  } catch {
    emit('feedback', `Copie a URL permanente: ${url}`);
  }
}

function formatStrategy(strategy: string): string {
  switch (strategy) {
    case 'LEAST_FILLED':
      return 'Próximo mais vazio';
    case 'MANUAL_WITH_FALLBACK':
      return 'Manual + Failover';
    case 'RANDOM_AVAILABLE':
      return 'Randomizar disponíveis';
    default:
      return strategy;
  }
}

function effectiveMax(link: any, target: any): number {
  return (
    target.maxParticipants ??
    Math.min(link.maxParticipants || 1024, target.group?.maxParticipants || 1024)
  );
}

function isFull(link: any, target: any): boolean {
  const count = target.group?.participantCount ?? 0;
  return count >= effectiveMax(link, target);
}

function occupancyPercent(link: any, target: any): number {
  const max = Math.max(1, effectiveMax(link, target));
  const count = target.group?.participantCount ?? 0;
  return Math.min(100, Math.round((count / max) * 100));
}
</script>
