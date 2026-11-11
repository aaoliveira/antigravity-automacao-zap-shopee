<template>
  <AppLayout>
    <template #header>
      Cupons de Desconto
    </template>

    <div class="max-w-5xl space-y-6">
      <!-- Cabeçalho da Página -->
      <div class="space-y-1">
        <p class="text-[11px] font-bold text-shopee-orange uppercase tracking-wider">Personalização</p>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-gray-900">Cupons</h3>
            <p class="text-sm text-gray-500 mt-0.5">
              Cadastre seus cupons com desconto, valor mínimo e validade. Cada postagem usa o melhor cupom para o produto.
            </p>
          </div>
          <button
            type="button"
            @click="openCreateModal"
            :disabled="coupons.length >= maxLimit"
            class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            + Novo cupom
          </button>
        </div>
      </div>

      <!-- Feedback -->
      <div
        v-if="feedbackMessage"
        :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'"
        class="p-4 rounded-lg border text-sm flex items-center justify-between"
      >
        <span>{{ feedbackMessage }}</span>
        <button @click="feedbackMessage = ''" class="text-xs font-semibold underline">Fechar</button>
      </div>

      <!-- Card Principal: Seus cupons -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 class="text-base font-semibold text-gray-900">Seus cupons</h4>
            <p class="text-xs text-gray-500">{{ coupons.length }} de {{ maxLimit }} cadastrados</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por código ou loja..."
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-shopee-orange focus:border-shopee-orange"
            />
            <select
              v-model="statusFilter"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Somente ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>
        </div>

        <!-- Estado Vazio -->
        <div
          v-if="filteredCoupons.length === 0"
          class="border border-dashed border-gray-200 bg-gray-50/70 rounded-xl p-8 text-center space-y-1.5"
        >
          <p class="text-sm font-semibold text-gray-700">
            {{ coupons.length === 0 ? 'Nenhum cupom cadastrado.' : 'Nenhum cupom corresponde ao filtro atual.' }}
          </p>
          <p class="text-xs text-gray-500">
            {{ coupons.length === 0 ? 'Cadastre um cupom para usar as variáveis de cupom nas suas postagens e automações.' : 'Tente limpar a busca ou alterar o filtro de status.' }}
          </p>
        </div>

        <!-- Lista de Cupons -->
        <div v-else class="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          <div
            v-for="coupon in filteredCoupons"
            :key="coupon.id"
            class="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
          >
            <div class="space-y-1.5 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-shopee-orange uppercase">
                  {{ formatPlatformLabel(coupon.platform) }}
                </span>
                <span class="px-2.5 py-0.5 rounded-md font-mono text-sm font-bold bg-gray-100 text-gray-900 border border-gray-200">
                  {{ coupon.code }}
                </span>
                <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {{ formatDiscountSummary(coupon) }}
                </span>
                <span
                  :class="coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'"
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                >
                  {{ coupon.isActive ? 'Ativo' : 'Inativo' }}
                </span>
                <span
                  v-if="isExpired(coupon.expiresAt)"
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700"
                >
                  Expirado
                </span>
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span v-if="coupon.minProductPrice">
                  Mínimo: <strong class="text-gray-700">R$ {{ formatMoney(coupon.minProductPrice) }}</strong>
                </span>
                <span v-if="coupon.expiresAt">
                  Validade: <strong class="text-gray-700">{{ formatDateShort(coupon.expiresAt) }}</strong>
                </span>
                <span v-if="coupon.sellerRestriction">
                  Loja: <strong class="text-gray-700">{{ coupon.sellerRestriction }}</strong>
                </span>
                <span v-if="coupon.productKeywords?.length">
                  Palavras: <strong class="text-gray-700">{{ coupon.productKeywords.join(', ') }}</strong>
                </span>
                <span>
                  Usos em disparos: <strong class="text-gray-700">{{ coupon.usageCount || 0 }}</strong>
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                @click="toggleCouponStatus(coupon)"
                :class="coupon.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                {{ coupon.isActive ? 'Desativar' : 'Ativar' }}
              </button>
              <button
                type="button"
                @click="openEditModal(coupon)"
                class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Editar
              </button>
              <button
                type="button"
                @click="deleteCoupon(coupon)"
                class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>

        <!-- Bloco Informativo de Variáveis e Regras -->
        <div class="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2 text-xs text-gray-700">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-semibold text-blue-900">Use nas Mensagens Personalizadas:</span>
            <button
              v-for="token in templateVariables"
              :key="token"
              type="button"
              @click="copyVariable(token)"
              class="px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-700 font-mono font-semibold hover:bg-blue-100 transition-colors"
              title="Clique para copiar variável"
            >
              {{ token }}
            </button>
            <span v-if="copiedToken" class="text-[11px] font-semibold text-green-700 ml-1">
              Copiado!
            </span>
          </div>
          <p class="leading-relaxed">
            Em cada postagem entra o cupom ativo que der o <strong>maior desconto</strong> para o preço do produto, respeitando o <strong>valor mínimo</strong> e a <strong>validade</strong>. Cada cupom só entra nos produtos da plataforma dele. Se nenhum servir, <strong>as linhas com essas variáveis são removidas</strong>.
          </p>
          <p class="leading-relaxed text-gray-600">
            Cupom de vendedor ou de categoria precisa de restrição por vendedor ou por palavras no nome do produto, senão ele entra em ofertas onde não aplica. Com cupons empatados, o que tem restrição ganha, e entre iguais a escolha varia.
          </p>
        </div>

        <!-- Card Exemplo Lado a Lado -->
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h5 class="text-sm font-bold text-gray-900">Exemplo</h5>
              <p class="text-xs text-gray-500">
                {{ previewSubtitle }}
              </p>
            </div>
            <select
              v-if="coupons.length > 0"
              v-model="previewCouponId"
              class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
            >
              <option value="SAMPLE">Exemplo ilustrativo (FONE10)</option>
              <option v-for="c in coupons" :key="c.id" :value="c.id">
                Simular com: {{ c.code }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Você escreve</p>
              <pre class="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">*Fone de Ouvido Bluetooth TWS*
De ~R$ 199,90~ por *R$ 149,90*
Cupom: *&#123;&#123;cupom&#125;&#125;*
Desconto: &#123;&#123;cupom_desconto&#125;&#125;
Com cupom: *R$ &#123;&#123;preco_com_cupom&#125;&#125;*
Válido até &#123;&#123;cupom_validade&#125;&#125;

https://s.shopee.com.br/exemplo</pre>
            </div>

            <div class="space-y-1.5">
              <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Chega no WhatsApp</p>
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-gray-900 leading-relaxed space-y-0.5 shadow-sm">
                <p class="font-bold">Fone de Ouvido Bluetooth TWS</p>
                <p>De <span class="line-through text-gray-500">R$ 199,90</span> por <strong>R$ 149,90</strong></p>
                <p>Cupom: <strong>{{ previewRendered.cupom }}</strong></p>
                <p v-if="previewRendered.cupom_desconto">Desconto: {{ previewRendered.cupom_desconto }}</p>
                <p v-if="previewRendered.preco_com_cupom">Com cupom: <strong>R$ {{ previewRendered.preco_com_cupom }}</strong></p>
                <p v-if="previewRendered.cupom_validade">Válido até {{ previewRendered.cupom_validade }}</p>
                <p class="pt-2 text-emerald-700 underline">https://s.shopee.com.br/exemplo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL NOVO / EDITAR CUPOM                  -->
      <!-- ========================================== -->
      <div
        v-if="modalOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 class="text-lg font-bold text-gray-900">
              {{ editingCouponId ? 'Editar cupom' : 'Novo cupom' }}
            </h3>
            <button
              type="button"
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none"
            >
              ×
            </button>
          </div>

          <form @submit.prevent="handleSaveCoupon" class="space-y-4">
            <!-- Seleção da Plataforma de Afiliados -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-gray-700">
                Plataforma de afiliados
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  v-for="plat in platforms"
                  :key="plat.id"
                  type="button"
                  @click="form.platform = plat.id"
                  class="p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1"
                  :class="form.platform === plat.id
                    ? 'border-shopee-orange bg-orange-50/70 text-shopee-orange ring-1 ring-shopee-orange'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'"
                >
                  <span class="w-8 h-8 rounded-lg bg-shopee-orange text-white font-black text-sm flex items-center justify-center">
                    {{ plat.name.slice(0, 1) }}
                  </span>
                  <span class="text-xs font-bold">{{ plat.name }}</span>
                </button>
              </div>
              <p class="text-[11px] text-gray-400">
                Exibindo as plataformas de afiliados integradas ao sistema.
              </p>
            </div>

            <!-- Seção 1: Benefício do cupom -->
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <h4 class="text-sm font-bold text-gray-900">Benefício do cupom</h4>
                <p class="text-xs text-gray-500">O código e o desconto que ele dá.</p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Código do cupom *</label>
                <input
                  v-model="form.code"
                  type="text"
                  required
                  placeholder="Ex: PROMO10"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-shopee-orange focus:border-shopee-orange"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de desconto</label>
                <div class="grid grid-cols-3 gap-1 bg-gray-200/70 p-1 rounded-lg">
                  <button
                    type="button"
                    @click="form.discountType = 'PERCENTAGE'"
                    :class="form.discountType === 'PERCENTAGE' ? 'bg-shopee-orange text-white shadow-sm' : 'text-gray-700 hover:bg-white/60'"
                    class="py-1.5 px-2 rounded-md text-xs font-semibold transition-colors"
                  >
                    % Perc.
                  </button>
                  <button
                    type="button"
                    @click="form.discountType = 'FIXED_AMOUNT'"
                    :class="form.discountType === 'FIXED_AMOUNT' ? 'bg-shopee-orange text-white shadow-sm' : 'text-gray-700 hover:bg-white/60'"
                    class="py-1.5 px-2 rounded-md text-xs font-semibold transition-colors"
                  >
                    R$ Fixo
                  </button>
                  <button
                    type="button"
                    @click="form.discountType = 'NONE'"
                    :class="form.discountType === 'NONE' ? 'bg-shopee-orange text-white shadow-sm' : 'text-gray-700 hover:bg-white/60'"
                    class="py-1.5 px-2 rounded-md text-xs font-semibold transition-colors"
                  >
                    Não informar
                  </button>
                </div>
              </div>

              <div v-if="form.discountType === 'PERCENTAGE'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Desconto (%) *</label>
                  <input
                    v-model.number="form.discountValue"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    required
                    placeholder="Ex: 10"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Máximo (R$) <span class="text-gray-400">opcional</span>
                  </label>
                  <input
                    v-model.number="form.maxDiscountAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ex: 50.00"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
              </div>

              <div v-else-if="form.discountType === 'FIXED_AMOUNT'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Desconto (R$) *</label>
                <input
                  v-model.number="form.discountValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 20.00"
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                />
              </div>

              <p v-else class="text-xs text-gray-500 italic">
                Apenas o código do cupom será enviado; linhas com desconto e preço com cupom serão omitidas automaticamente.
              </p>
            </div>

            <!-- Seção 2: Regras de uso -->
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <h4 class="text-sm font-bold text-gray-900">Regras de uso</h4>
                <p class="text-xs text-gray-500">Fora dessas condições o cupom não entra na postagem.</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Valor mínimo do produto (R$) <span class="text-gray-400">opcional</span>
                  </label>
                  <input
                    v-model.number="form.minProductPrice"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ex: 50.00"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Válido até <span class="text-gray-400">opcional</span>
                  </label>
                  <input
                    v-model="form.expiresAt"
                    type="date"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
              </div>
            </div>

            <!-- Seção 3: Onde o cupom vale -->
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <h4 class="text-sm font-bold text-gray-900">Onde o cupom vale</h4>
                <p class="text-xs text-gray-500">
                  Deixe em branco se o cupom vale em qualquer produto da plataforma. Cupom de vendedor ou de categoria precisa de restrição, senão ele entra em ofertas onde não aplica.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Só deste vendedor ou loja <span class="text-gray-400">opcional</span>
                  </label>
                  <input
                    v-model="form.sellerRestriction"
                    type="text"
                    placeholder="Ex: Loja Oficial Samsung"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                  <p class="text-[11px] text-gray-400 mt-1">
                    Só entra quando a oferta identifica o vendedor. Nas outras vias, use palavras.
                  </p>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    Só em produtos com estas palavras <span class="text-gray-400">opcional</span>
                  </label>
                  <input
                    v-model="form.keywordsText"
                    type="text"
                    placeholder="Ex: fone, caixa de som, headset"
                    class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                  <p class="text-[11px] text-gray-400 mt-1">
                    Separe por vírgula, até 10. Basta uma aparecer no nome do produto.
                  </p>
                </div>
              </div>
            </div>

            <label v-if="editingCouponId" class="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.isActive"
                class="rounded text-shopee-orange focus:ring-shopee-orange"
              />
              Cupom ativo para aplicação nas automações
            </label>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-5 py-2 text-xs font-semibold text-white bg-shopee-orange hover:bg-shopee-hover rounded-lg shadow-sm disabled:opacity-50"
              >
                {{ isSaving ? 'Salvando...' : 'Salvar cupom' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const coupons = ref<any[]>([]);
const platforms = ref<Array<{ id: string; name: string; label: string }>>([
  { id: 'SHOPEE', name: 'Shopee', label: 'Shopee Afiliados' },
]);
const maxLimit = ref(50);
const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
const feedbackMessage = ref('');
const feedbackIsError = ref(false);
const copiedToken = ref('');

const modalOpen = ref(false);
const editingCouponId = ref<string | null>(null);
const isSaving = ref(false);

const previewCouponId = ref('SAMPLE');
const templateVariables = [
  '{{cupom}}',
  '{{cupom_desconto}}',
  '{{preco_com_cupom}}',
  '{{cupom_validade}}',
];

function createEmptyForm() {
  return {
    platform: 'SHOPEE',
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE',
    discountValue: null as number | null,
    maxDiscountAmount: null as number | null,
    minProductPrice: null as number | null,
    expiresAt: '',
    sellerRestriction: '',
    keywordsText: '',
    isActive: true,
  };
}

const form = ref(createEmptyForm());

const filteredCoupons = computed(() => {
  return coupons.value.filter((c) => {
    if (statusFilter.value === 'ACTIVE' && !c.isActive) return false;
    if (statusFilter.value === 'INACTIVE' && c.isActive) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      const matchCode = c.code?.toLowerCase().includes(q);
      const matchSeller = c.sellerRestriction?.toLowerCase().includes(q);
      const matchKw = (c.productKeywords || []).some((k: string) => k.toLowerCase().includes(q));
      if (!matchCode && !matchSeller && !matchKw) return false;
    }
    return true;
  });
});

const previewCouponObj = computed(() => {
  if (previewCouponId.value === 'SAMPLE') {
    return {
      platform: 'SHOPEE',
      code: 'FONE10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscountAmount: 20,
      expiresAt: '2026-10-15T23:59:59.999Z',
    };
  }
  return coupons.value.find((c) => c.id === previewCouponId.value) || null;
});

const previewSubtitle = computed(() => {
  const c = previewCouponObj.value;
  if (!c) return 'Cupom da Shopee em um produto de R$ 149,90.';
  const validPart = c.expiresAt ? `, válido até ${formatDateShort(c.expiresAt)}` : '';
  return `Cupom da ${formatPlatformLabel(c.platform)} (${formatDiscountSummary(c)}${validPart}), num produto de R$ 149,90.`;
});

const previewRendered = computed(() => {
  const c = previewCouponObj.value;
  if (!c) {
    return { cupom: 'FONE10', cupom_desconto: '10% OFF', preco_com_cupom: '134,91', cupom_validade: '15/10' };
  }
  const basePrice = 149.9;
  let discountAmount = 0;
  let descontoLabel = '';
  let precoComCupom = '';

  if (c.discountType === 'PERCENTAGE' && c.discountValue) {
    const pct = Number(c.discountValue);
    const calc = Math.round(basePrice * (pct / 100) * 100) / 100;
    const max = c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null;
    discountAmount = Math.min(max && max > 0 ? Math.min(calc, max) : calc, basePrice);
    descontoLabel = `${pct}% OFF${max ? ` (até R$ ${formatMoney(max)})` : ''}`;
    precoComCupom = formatMoney(Math.max(0, basePrice - discountAmount));
  } else if (c.discountType === 'FIXED_AMOUNT' && c.discountValue) {
    const fixed = Number(c.discountValue);
    discountAmount = Math.min(fixed, basePrice);
    descontoLabel = `R$ ${formatMoney(fixed)} OFF`;
    precoComCupom = formatMoney(Math.max(0, basePrice - discountAmount));
  }

  return {
    cupom: c.code,
    cupom_desconto: descontoLabel,
    preco_com_cupom: precoComCupom,
    cupom_validade: c.expiresAt ? formatDateShort(c.expiresAt) : '',
  };
});

function showFeedback(msg: string, isError = false) {
  feedbackMessage.value = msg;
  feedbackIsError.value = isError;
}

function formatPlatformLabel(platform: string) {
  const found = platforms.value.find((p) => p.id === platform);
  return found ? found.name : platform;
}

function formatMoney(value: any): string {
  const num = Number(value || 0);
  return num.toFixed(2).replace('.', ',');
}

function formatDiscountSummary(coupon: any): string {
  if (coupon.discountType === 'PERCENTAGE') {
    const pct = Number(coupon.discountValue || 0);
    const max = coupon.maxDiscountAmount ? ` (até R$ ${formatMoney(coupon.maxDiscountAmount)})` : '';
    return `${pct}% OFF${max}`;
  }
  if (coupon.discountType === 'FIXED_AMOUNT') {
    return `R$ ${formatMoney(coupon.discountValue)} OFF`;
  }
  return 'Apenas código';
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function isExpired(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

async function copyVariable(token: string) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(token);
    }
    copiedToken.value = token;
    setTimeout(() => {
      if (copiedToken.value === token) copiedToken.value = '';
    }, 1800);
  } catch {
    showFeedback(`Variável para copiar: ${token}`);
  }
}

async function loadData() {
  try {
    const [platRes, listRes] = await Promise.all([
      fetch('/api/coupons/platforms', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/coupons', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
    ]);

    const platData = await platRes.json();
    const listData = await listRes.json();

    if (platData.success && Array.isArray(platData.data) && platData.data.length > 0) {
      platforms.value = platData.data;
    }
    if (listData.success) {
      coupons.value = listData.data || [];
      if (listData.meta?.maxLimit) {
        maxLimit.value = listData.meta.maxLimit;
      }
    }
  } catch {
    showFeedback('Falha ao carregar cupons.', true);
  }
}

function openCreateModal() {
  editingCouponId.value = null;
  form.value = createEmptyForm();
  form.value.platform = platforms.value[0]?.id || 'SHOPEE';
  modalOpen.value = true;
}

function openEditModal(coupon: any) {
  editingCouponId.value = coupon.id;
  form.value = {
    platform: coupon.platform || 'SHOPEE',
    code: coupon.code || '',
    discountType: coupon.discountType || 'PERCENTAGE',
    discountValue: coupon.discountValue !== null ? Number(coupon.discountValue) : null,
    maxDiscountAmount: coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : null,
    minProductPrice: coupon.minProductPrice !== null ? Number(coupon.minProductPrice) : null,
    expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : '',
    sellerRestriction: coupon.sellerRestriction || '',
    keywordsText: Array.isArray(coupon.productKeywords) ? coupon.productKeywords.join(', ') : '',
    isActive: Boolean(coupon.isActive),
  };
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editingCouponId.value = null;
}

async function handleSaveCoupon() {
  isSaving.value = true;
  feedbackMessage.value = '';
  try {
    const keywords = form.value.keywordsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    const payload: Record<string, any> = {
      platform: form.value.platform,
      code: form.value.code.trim().toUpperCase(),
      discountType: form.value.discountType,
      discountValue:
        form.value.discountType === 'NONE'
          ? null
          : form.value.discountValue
            ? Number(form.value.discountValue)
            : null,
      maxDiscountAmount:
        form.value.discountType === 'PERCENTAGE' && form.value.maxDiscountAmount
          ? Number(form.value.maxDiscountAmount)
          : null,
      minProductPrice: form.value.minProductPrice ? Number(form.value.minProductPrice) : null,
      expiresAt: form.value.expiresAt ? form.value.expiresAt : null,
      sellerRestriction: form.value.sellerRestriction.trim() || null,
      productKeywords: keywords,
      isActive: form.value.isActive,
    };

    const isEditing = Boolean(editingCouponId.value);
    const url = isEditing ? `/api/coupons/${editingCouponId.value}` : '/api/coupons';
    const method = isEditing ? 'PUT' : 'POST';

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
      throw new Error(data.error?.message || data.message || 'Falha ao salvar cupom.');
    }

    showFeedback(isEditing ? 'Cupom atualizado com sucesso!' : 'Cupom cadastrado com sucesso!');
    closeModal();
    await loadData();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isSaving.value = false;
  }
}

async function toggleCouponStatus(coupon: any) {
  try {
    const res = await fetch(`/api/coupons/${coupon.id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback(
      data.data?.isActive ? `Cupom '${coupon.code}' ativado!` : `Cupom '${coupon.code}' desativado.`,
    );
    await loadData();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function deleteCoupon(coupon: any) {
  if (!confirm(`Deseja realmente excluir o cupom '${coupon.code}'?`)) return;

  try {
    const res = await fetch(`/api/coupons/${coupon.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback(`Cupom '${coupon.code}' excluído com sucesso.`);
    await loadData();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

onMounted(() => {
  loadData();
});
</script>
