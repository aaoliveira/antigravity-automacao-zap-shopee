<template>
  <AppLayout>
    <template #header>
      Motor de Automações
    </template>

    <div class="max-w-6xl space-y-6">
      <!-- Barra Superior: Resumo e Botão Criar -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Automações de Publicação Shopee + WhatsApp</h3>
          <p class="text-sm text-gray-500 mt-0.5">
            Gerencie campanhas automáticas com curadoria de produtos Shopee, geração de Short Link oficial e disparo multi-grupo.
          </p>
        </div>
        <button
          @click="openWizardModal"
          class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center shrink-0"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nova Automação (Wizard)
        </button>
      </div>

      <!-- Feedback Global -->
      <div
        v-if="feedbackMessage"
        :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'"
        class="p-4 rounded-lg border text-sm flex items-center justify-between"
      >
        <span>{{ feedbackMessage }}</span>
        <button @click="feedbackMessage = ''" class="text-xs font-semibold underline">Fechar</button>
      </div>

      <!-- Lista de Automações -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 class="font-semibold text-gray-900">Minhas Automações ({{ automations.length }})</h4>
          <button @click="loadAutomations" class="text-sm text-shopee-orange hover:underline font-medium">
            Atualizar Lista
          </button>
        </div>

        <div v-if="automations.length === 0" class="p-12 text-center text-gray-500 space-y-3">
          <svg class="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p class="font-medium text-gray-700">Nenhuma automação configurada ainda.</p>
          <p class="text-sm">Clique em <strong>Nova Automação</strong> para configurar sua primeira esteira de ofertas.</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="auto in automations"
            :key="auto.id"
            class="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div class="space-y-2 flex-1">
              <div class="flex items-center space-x-3">
                <h5 class="text-base font-bold text-gray-900">{{ auto.name }}</h5>
                <span
                  :class="getStatusBadgeClass(auto.status)"
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                >
                  {{ formatAutomationStatusLabel(auto.status) }}
                </span>
              </div>

              <!-- Tags de Palavras-chave / Nichos -->
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span class="text-xs text-gray-400 font-medium py-0.5">Nichos:</span>
                <span
                  v-for="kw in auto.keywords"
                  :key="kw.id"
                  class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                >
                  #{{ kw.keyword }}
                </span>
              </div>

              <!-- Metadados da Automação -->
              <div class="text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
                <span>Instância: <strong class="text-gray-700">{{ auto.instance?.displayName }}</strong></span>
                <span>Grupos: <strong class="text-gray-700">{{ auto.groups?.length || 0 }} grupos</strong></span>
                <span>Disparo: <strong class="text-gray-700">{{ formatDispatchStrategy(auto.dispatchStrategy) }}</strong></span>
                <span v-if="auto.groupRedirectLink">
                  Link Permanente: <strong class="text-shopee-orange font-mono">/join/{{ auto.groupRedirectLink.slug }}</strong>
                </span>
                <span v-if="auto.coupon">
                  Cupom Fixo: <strong class="text-emerald-700 font-mono">{{ auto.coupon.code }}</strong>
                </span>
                <span>Intervalo: <strong class="text-gray-700">{{ auto.frequencyMinutes }} min</strong></span>
                <span>Janela: <strong class="text-gray-700">{{ auto.windowStartTime }} - {{ auto.windowEndTime }}</strong></span>
                <span>Limite Diário: <strong class="text-gray-700">{{ auto.dailyExecutionLimit }} envios</strong></span>
                <span>Desduplicação: <strong class="text-gray-700">{{ auto.dedupWindowDays }} dias</strong></span>
              </div>

              <!-- Próximo Horário -->
              <div class="text-xs text-gray-400">
                <span v-if="auto.status === 'ACTIVE' && auto.nextExecutionAt">
                  Próxima execução: <strong class="text-shopee-orange">{{ formatDateTime(auto.nextExecutionAt) }}</strong>
                </span>
                <span v-else-if="auto.status === 'INACTIVE'" class="text-gray-500 italic">
                  Automação inativa (pode ser editada, reativada ou excluída).
                </span>
                <span v-else class="text-gray-400 italic">Automação pausada.</span>
              </div>
            </div>

            <!-- Ações -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <!-- Botão Disparo Manual Imediato -->
              <button
                @click="triggerExecuteNow(auto)"
                :disabled="auto.status === 'INACTIVE'"
                :class="auto.status === 'INACTIVE'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-shopee-light text-shopee-orange hover:bg-orange-100'"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center"
                :title="auto.status === 'INACTIVE' ? 'Reative a automação para disparar' : 'Executar agora sem esperar o agendamento'"
              >
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Disparar Agora
              </button>

              <!-- Botão Pausar / Retomar / Reativar -->
              <button
                @click="togglePauseResume(auto)"
                :class="auto.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              >
                {{ auto.status === 'ACTIVE' ? 'Pausar' : auto.status === 'INACTIVE' ? 'Reativar' : 'Retomar' }}
              </button>

              <!-- Botão Inativar (habilitado quando ACTIVE ou PAUSED; necessário antes de excluir) -->
              <button
                v-if="auto.status !== 'INACTIVE'"
                type="button"
                @click="deactivateAutomation(auto)"
                class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                title="Desativar automação definitivamente até reativação manual ou exclusão"
              >
                Inativar
              </button>

              <!-- Botão Editar (somente se pausada ou inativa) -->
              <button
                type="button"
                @click="openEditWizardModal(auto)"
                :disabled="!isAutomationEditable(auto)"
                :title="isAutomationEditable(auto) ? 'Editar automação' : 'Pause ou inative a automação para editar'"
                :class="isAutomationEditable(auto)
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              >
                Editar
              </button>

              <!-- Botão Histórico de Execuções -->
              <button
                @click="openExecutionsModal(auto)"
                class="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Histórico
              </button>

              <!-- Botão Excluir (somente se inativa) -->
              <button
                type="button"
                @click="deleteAutomation(auto)"
                :disabled="!isAutomationDeletable(auto)"
                :title="isAutomationDeletable(auto) ? 'Excluir automação inativa' : 'Inative a automação para poder excluir'"
                :class="isAutomationDeletable(auto)
                  ? 'bg-red-50 hover:bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL WIZARD DE CRIAÇÃO                    -->
      <!-- ========================================== -->
      <div
        v-if="wizardOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
          <!-- Cabeçalho do Wizard e Progresso -->
          <div class="border-b border-gray-100 pb-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-bold text-gray-900">
                {{ editingAutomationId ? 'Editar Automação' : 'Configurar Nova Automação' }}
              </h3>
              <button @click="closeWizardModal" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Etapas -->
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
              <template v-for="(label, idx) in wizardStepLabels" :key="label">
                <button
                  type="button"
                  @click="editingAutomationId && (wizardStep = idx + 1)"
                  :class="[
                    wizardStep >= idx + 1 ? 'text-shopee-orange font-bold' : 'text-gray-400',
                    editingAutomationId ? 'cursor-pointer hover:underline' : 'cursor-default'
                  ]"
                >
                  {{ idx + 1 }}. {{ label }}
                </button>
                <span v-if="idx < wizardStepLabels.length - 1" class="text-gray-300">›</span>
              </template>
            </div>
          </div>

          <!-- ETAPA 1: INFORMAÇÕES BÁSICAS -->
          <div v-if="wizardStep === 1" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 1: Dados da Automação, Plataforma e Credencial</h4>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nome da Automação</label>
              <input
                v-model="wizardData.name"
                type="text"
                required
                placeholder="Ex: Ofertas Achadinhos Casa & Cozinha"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Plataforma de Afiliados</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  @click="selectWizardPlatform('SHOPEE')"
                  :class="wizardData.platform === 'SHOPEE' ? 'border-shopee-orange bg-orange-50 text-shopee-orange font-bold' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
                  class="px-3 py-2.5 border rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  🛍️ Shopee Afiliados
                </button>
                <button
                  type="button"
                  @click="selectWizardPlatform('MERCADO_LIVRE')"
                  :disabled="!hasMlPlatformEnabled"
                  :class="wizardData.platform === 'MERCADO_LIVRE' ? 'border-shopee-orange bg-orange-50 text-shopee-orange font-bold' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"
                  class="px-3 py-2.5 border rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🤝 Mercado Livre
                </button>
              </div>
              <p v-if="!hasMlPlatformEnabled" class="text-[11px] text-amber-700 mt-1">
                Integração Mercado Livre desabilitada nas Feature Flags.
              </p>
            </div>

            <div v-if="wizardData.platform === 'SHOPEE'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Credencial Shopee Afiliados</label>
              <select
                v-model="wizardData.shopeeCredentialId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm bg-white focus:ring-shopee-orange focus:border-shopee-orange"
              >
                <option value="" disabled>Selecione a credencial Shopee</option>
                <option v-for="c in credentials" :key="c.id" :value="c.id">
                  {{ c.label }} (AppID: {{ c.appId }})
                </option>
              </select>
            </div>

            <div v-else>
              <label class="block text-sm font-medium text-gray-700 mb-1">Conta Mercado Livre Afiliados</label>
              <select
                v-model="wizardData.mercadoLivreAccountId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm bg-white focus:ring-shopee-orange focus:border-shopee-orange"
              >
                <option value="" disabled>Selecione a conta Mercado Livre</option>
                <option v-for="ml in mlAccounts" :key="ml.id" :value="ml.id">
                  {{ ml.label }}
                  {{ ml.affiliateTag ? `• Tag: ${ml.affiliateTag}` : '' }}
                  {{ ml.mlNickname ? `• OAuth: ${ml.mlNickname}` : '' }}
                </option>
              </select>
              <p v-if="mlAccounts.length === 0" class="text-xs text-amber-700 mt-1">
                Configure sua conta em <router-link to="/mercadolivre" class="underline font-semibold">Integrações → Mercado Livre</router-link>.
              </p>
            </div>
          </div>

          <!-- ETAPA 2: INSTÂNCIA WHATSAPP -->
          <div v-if="wizardStep === 2" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 2: Seleção da Instância WhatsApp</h4>
            <p class="text-xs text-gray-500">Selecione a instância conectada que despachará as mensagens.</p>
            <div class="space-y-2">
              <label
                v-for="inst in instances"
                :key="inst.id"
                class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                :class="wizardData.instanceId === inst.id ? 'border-shopee-orange bg-orange-50/40' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  v-model="wizardData.instanceId"
                  :value="inst.id"
                  class="text-shopee-orange focus:ring-shopee-orange mr-3"
                  @change="handleInstanceSelection(inst.id)"
                />
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-sm text-gray-900">{{ inst.displayName }}</span>
                    <span
                      :class="inst.status === 'CONNECTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      class="px-2 py-0.5 rounded text-xs font-semibold"
                    >
                      {{ inst.status === 'CONNECTED' ? 'Conectada' : 'Offline' }}
                    </span>
                  </div>
                  <span class="text-xs text-gray-500 font-mono">{{ inst.instanceName }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- ETAPA 3: GRUPOS DESTINATÁRIOS -->
          <div v-if="wizardStep === 3" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 3: Selecione os Grupos Destinatários</h4>
            <p class="text-xs text-gray-500">A oferta será publicada em cada um dos grupos selecionados.</p>

            <div v-if="availableGroups.length === 0" class="p-6 text-center text-gray-500 text-sm">
              Nenhum grupo encontrado para esta instância. Certifique-se de sincronizar os grupos primeiro.
            </div>

            <div v-else class="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
              <label
                v-for="grp in availableGroups"
                :key="grp.id"
                class="flex items-center p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="grp.id"
                  v-model="wizardData.groupIds"
                  class="text-shopee-orange rounded focus:ring-shopee-orange mr-3"
                />
                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-gray-800">{{ grp.name }}</p>
                    <span
                      v-if="grp.isAnnounceOnly"
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800"
                    >
                      Apenas Admins
                    </span>
                    <span
                      v-if="grp.isActive === false"
                      class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800"
                    >
                      Bloqueado/Inativo
                    </span>
                  </div>
                  <p class="text-xs text-gray-400 font-mono">{{ grp.jid }} • {{ grp.participantCount || 0 }} membros</p>
                </div>
              </label>
            </div>
            <p class="text-xs text-gray-500">Selecionados: <strong>{{ wizardData.groupIds.length }} grupos</strong></p>

            <!-- Estratégia de Randomização de Disparos -->
            <div class="pt-3 border-t border-gray-100 space-y-2">
              <label class="block text-xs font-semibold text-gray-800">
                Estratégia de Randomização dos Disparos
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label
                  v-for="opt in dispatchStrategyOptions"
                  :key="opt.value"
                  class="flex items-start gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors"
                  :class="wizardData.dispatchStrategy === opt.value ? 'border-shopee-orange bg-orange-50/50' : 'border-gray-200 hover:bg-gray-50'"
                >
                  <input
                    type="radio"
                    name="dispatchStrategy"
                    :value="opt.value"
                    v-model="wizardData.dispatchStrategy"
                    class="mt-0.5 text-shopee-orange focus:ring-shopee-orange"
                  />
                  <div>
                    <p class="text-xs font-semibold text-gray-900">{{ opt.label }}</p>
                    <p class="text-[11px] text-gray-500 leading-snug">{{ opt.description }}</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Link Permanente do Grupo + Legenda Personalizada -->
            <div class="pt-3 border-t border-gray-100 space-y-3">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-gray-800">
                    Link Permanente do Grupo (Opcional — "O grupo mudou, o link continua")
                  </label>
                </div>
                <select
                  v-model="wizardData.groupRedirectLinkId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-shopee-orange focus:border-shopee-orange"
                >
                  <option value="">Nenhum link permanente vinculado</option>
                  <option v-for="lnk in groupLinks" :key="lnk.id" :value="lnk.id">
                    {{ lnk.name }} (/join/{{ lnk.slug }})
                  </option>
                </select>
                <p class="text-[11px] text-gray-500 mt-1">
                  Quando vinculado, a variável <code class="bg-gray-100 px-1 rounded">{link_grupo}</code> será substituída pela URL única que redireciona para o grupo mais vazio disponível.
                </p>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-semibold text-gray-800">
                    Cupom de Desconto nas Mensagens (Opcional)
                  </label>
                  <router-link to="/coupons" class="text-[11px] font-semibold text-shopee-orange hover:underline">
                    Gerenciar Cupons
                  </router-link>
                </div>
                <select
                  v-model="wizardData.couponId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-shopee-orange focus:border-shopee-orange"
                >
                  <option value="">Automático (melhor cupom ativo da plataforma)</option>
                  <option v-for="cp in activeCoupons" :key="cp.id" :value="cp.id">
                    {{ cp.code }} — {{ formatCouponSummary(cp) }}
                  </option>
                </select>
                <p class="text-[11px] text-gray-500 mt-1">
                  No modo automático, o robô escolhe o cupom ativo com maior desconto respeitando valor mínimo, validade e palavras-chave.
                </p>
              </div>

              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label class="block text-xs font-semibold text-gray-800">
                    Modelo de Legenda Personalizado (Opcional)
                  </label>
                  <div class="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      @click="applySpintaxHelper"
                      class="text-[11px] font-semibold text-indigo-700 hover:underline"
                    >
                      + Inserir Spintax Anti-Ban
                    </button>
                    <button
                      type="button"
                      @click="applyCouponCaptionTemplate"
                      class="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      + Inserir modelo com Cupom
                    </button>
                    <button
                      type="button"
                      @click="applyGroupLinkCaptionTemplate"
                      class="text-[11px] font-semibold text-shopee-orange hover:underline"
                    >
                      + Inserir modelo com &#123;link_grupo&#125;
                    </button>
                  </div>
                </div>
                <textarea
                  v-model="wizardData.captionTemplate"
                  rows="4"
                  placeholder="Deixe em branco para modelo padrão. Dica: use Spintax {Oferta|Achado} e variáveis {titulo}, {preco}, {link_afiliado}, {link_grupo}, {{cupom}}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-shopee-orange focus:border-shopee-orange"
                ></textarea>
                <p class="text-[11px] text-gray-500 mt-1">
                  Suporta Spintax (<code class="bg-gray-100 px-1 rounded">&#123;opção A|opção B&#125;</code>) para variar o texto automaticamente entre grupos e reduzir detecção de spam.
                </p>
              </div>
            </div>
          </div>

          <!-- ETAPA 4: NICHOS E PALAVRAS-CHAVE -->
          <div v-if="wizardStep === 4" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 4: Palavras-Chave de Nicho (Shopee Open API)</h4>
            <p class="text-xs text-gray-500">
              A cada disparo, uma palavra-chave é sorteada aleatoriamente para buscar produtos elegíveis no catálogo da Shopee.
            </p>

            <div class="flex space-x-2">
              <input
                v-model="keywordInput"
                type="text"
                placeholder="Ex: fone bluetooth, maquiagem, cozinha..."
                @keyup.enter.prevent="addKeyword"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-shopee-orange focus:border-shopee-orange"
              />
              <button
                type="button"
                @click="addKeyword"
                class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg"
              >
                Adicionar
              </button>
            </div>

            <div class="flex flex-wrap gap-2 pt-2 min-h-[48px]">
              <span
                v-for="(kw, idx) in wizardData.keywords"
                :key="idx"
                class="inline-flex items-center px-3 py-1 bg-orange-100 text-shopee-orange rounded-full text-xs font-semibold"
              >
                {{ kw }}
                <button @click="removeKeyword(idx)" class="ml-1.5 text-orange-400 hover:text-shopee-orange font-bold">×</button>
              </span>
              <span v-if="wizardData.keywords.length === 0" class="text-xs text-gray-400 italic">
                Nenhuma palavra-chave adicionada ainda.
              </span>
            </div>
          </div>

          <!-- ETAPA 5: AGENDAMENTO E LIMITES -->
          <div v-if="wizardStep === 5" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 5: Agendamento, Janela e Confiabilidade</h4>
            <div class="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              Ao criar dentro da janela e dos dias permitidos, o <strong>1º envio automático inicia em segundos</strong> e os seguintes repetem conforme o intervalo abaixo.
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Intervalo entre envios (minutos)</label>
                <input
                  v-model.number="wizardData.frequencyMinutes"
                  type="number"
                  min="15"
                  max="1440"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Limite Máximo Diário de Envios</label>
                <input
                  v-model.number="wizardData.dailyExecutionLimit"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Início da Janela Diária (HH:mm)</label>
                <input
                  v-model="wizardData.windowStartTime"
                  type="text"
                  placeholder="08:00"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Fim da Janela Diária (HH:mm)</label>
                <input
                  v-model="wizardData.windowEndTime"
                  type="text"
                  placeholder="22:00"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Janela de Não-Repetição (dias)</label>
                <input
                  v-model.number="wizardData.dedupWindowDays"
                  type="number"
                  min="1"
                  max="30"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p class="text-[11px] text-gray-400 mt-0.5">Evita repetir produtos já divulgados neste período.</p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Delay / Jitter entre Grupos (segundos)</label>
                <input
                  v-model.number="wizardData.jitterSeconds"
                  type="number"
                  min="0"
                  max="60"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p class="text-[11px] text-gray-400 mt-0.5">Aplicado com variação aleatória + macro-pausa a cada 5 grupos.</p>
              </div>
            </div>

            <!-- Termômetro de Risco Anti-Ban (Item 5) -->
            <div
              data-testid="antiban-risk-meter"
              :class="antiBanAssessment.boxClass"
              class="rounded-xl p-4 border text-xs space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold">Termômetro Anti-Banimento: {{ antiBanAssessment.label }}</span>
                <span :class="antiBanAssessment.badgeClass" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  ~{{ antiBanAssessment.estimatedDailyMsgs }} msgs/dia nesta esteira
                </span>
              </div>
              <ul v-if="antiBanAssessment.recommendations.length > 0" class="list-disc pl-4 space-y-0.5">
                <li v-for="(tip, idx) in antiBanAssessment.recommendations" :key="idx">{{ tip }}</li>
              </ul>
              <p v-else>Configuração equilibrada para publicação contínua com baixo risco.</p>
            </div>
          </div>

          <!-- ETAPA 6: REVISÃO & SALVAR -->
          <div v-if="wizardStep === 6" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 6: Revisão Final dos Parâmetros</h4>

            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2 text-gray-700">
              <p><strong>Nome:</strong> {{ wizardData.name }}</p>
              <p><strong>Grupos Destinatários:</strong> {{ wizardData.groupIds.length }} grupos selecionados</p>
              <p><strong>Estratégia de Disparo:</strong> {{ formatDispatchStrategy(wizardData.dispatchStrategy) }}</p>
              <p v-if="selectedGroupLinkObj">
                <strong>Link Permanente de Grupo:</strong> {{ selectedGroupLinkObj.name }} (<code class="font-mono">/join/{{ selectedGroupLinkObj.slug }}</code>)
              </p>
              <p>
                <strong>Cupom de Desconto:</strong>
                {{ selectedCouponObj ? `${selectedCouponObj.code} (${formatCouponSummary(selectedCouponObj)})` : 'Seleção automática (melhor cupom elegível)' }}
              </p>
              <p><strong>Nichos:</strong> {{ wizardData.keywords.join(', ') }}</p>
              <p><strong>Frequência:</strong> A cada {{ wizardData.frequencyMinutes }} minutos (micro-variação ±12%)</p>
              <p><strong>Horário de Envio:</strong> Das {{ wizardData.windowStartTime }} às {{ wizardData.windowEndTime }}</p>
              <p><strong>Limite Diário:</strong> Até {{ wizardData.dailyExecutionLimit }} envios/dia</p>
              <p><strong>Proteção Anti-Spam:</strong> Jitter base de {{ wizardData.jitterSeconds }}s (aleatorizado), Spintax {{ antiBanAssessment.hasSpintax ? 'ativo' : 'não detectado' }} e desduplicação de {{ wizardData.dedupWindowDays }} dias</p>
            </div>

            <div
              data-testid="antiban-risk-meter-summary"
              :class="antiBanAssessment.boxClass"
              class="rounded-xl p-3.5 border text-xs flex items-center justify-between"
            >
              <span><strong>Classificação Anti-Ban:</strong> {{ antiBanAssessment.label }}</span>
              <span :class="antiBanAssessment.badgeClass" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                ~{{ antiBanAssessment.estimatedDailyMsgs }} msgs/dia
              </span>
            </div>
          </div>

          <!-- Botões de Navegação do Wizard -->
          <div class="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              v-if="wizardStep > 1"
              type="button"
              @click="wizardStep--"
              class="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg"
            >
              Voltar
            </button>
            <div v-else></div>

            <button
              v-if="wizardStep < 6"
              type="button"
              @click="advanceStep"
              class="px-5 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Próxima Etapa
            </button>

            <button
              v-else
              type="button"
              :disabled="isLoading"
              @click="handleSaveAutomation"
              class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              <span v-if="!isLoading">
                {{ editingAutomationId ? 'Salvar Alterações' : 'Ativar e Salvar Automação' }}
              </span>
              <span v-else>
                {{ editingAutomationId ? 'Salvando Alterações...' : 'Gravando Automação...' }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL DE HISTÓRICO DE EXECUÇÕES           -->
      <!-- ========================================== -->
      <div
        v-if="historyModalOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="font-bold text-gray-900 text-base">Histórico de Execuções</h3>
            <button @click="historyModalOpen = false" class="text-gray-400 hover:text-gray-600 font-bold">×</button>
          </div>

          <div v-if="executionsList.length === 0" class="p-8 text-center text-gray-400 text-sm">
            Nenhuma execução registrada para esta automação.
          </div>

          <div v-else class="max-h-96 overflow-y-auto divide-y divide-gray-100 text-xs">
            <div v-for="ex in executionsList" :key="ex.id" class="py-3 space-y-1.5">
              <div class="flex items-center justify-between">
                <span
                  :class="getExecutionBadgeClass(ex.status)"
                  class="px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  {{ ex.status }}
                </span>
                <span class="text-gray-400">{{ formatDateTime(ex.startedAt) }}</span>
              </div>

              <div v-if="ex.productSnapshot" class="font-medium text-gray-800">
                Produto: {{ ex.productSnapshot.title }} (R$ {{ Number(ex.productSnapshot.price).toFixed(2) }})
              </div>

              <div v-if="ex.affiliateLink" class="font-mono text-shopee-orange">
                Link: <a :href="ex.affiliateLink.shortLink" target="_blank" class="underline">{{ ex.affiliateLink.shortLink }}</a>
              </div>

              <div v-if="ex.appliedCouponCode" class="font-mono text-emerald-700 font-semibold">
                Cupom aplicado: {{ ex.appliedCouponCode }}
              </div>

              <div v-if="ex.errorMessage" class="text-red-600 italic">
                Motivo: {{ ex.errorMessage }}
              </div>

              <div class="text-gray-500">
                Destinos: {{ ex.successCount }}/{{ ex.totalDestinations }} grupos entregues com sucesso.
              </div>
            </div>
          </div>
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

const automations = ref<any[]>([]);
const instances = ref<any[]>([]);
const credentials = ref<any[]>([]);
const availableGroups = ref<any[]>([]);
const groupLinks = ref<any[]>([]);
const coupons = ref<any[]>([]);

const dispatchStrategyOptions = [
  {
    value: 'ALL_SEQUENTIAL',
    label: 'Todos em Ordem',
    description: 'Envia para todos os grupos na ordem cadastrada.',
  },
  {
    value: 'RANDOM_ORDER',
    label: 'Ordem Randomizada',
    description: 'Embaralha a ordem dos grupos a cada disparo.',
  },
  {
    value: 'RANDOM_SINGLE',
    label: '1 Grupo Aleatório',
    description: 'Sorteia apenas 1 grupo diferente por execução.',
  },
] as const;

const isLoading = ref(false);
const feedbackMessage = ref('');
const feedbackIsError = ref(false);
const mlAccounts = ref<any[]>([]);
const mlFeatureFlags = ref({
  ml_alternative_b_enabled: true,
  ml_alternative_a_enabled: false,
});
const hasMlPlatformEnabled = computed(
  () =>
    mlFeatureFlags.value.ml_alternative_b_enabled ||
    mlFeatureFlags.value.ml_alternative_a_enabled,
);

// Wizard Modal
const wizardOpen = ref(false);
const wizardStep = ref(1);
const editingAutomationId = ref<string | null>(null);
const lastSelectedInstanceId = ref('');
const keywordInput = ref('');
const wizardStepLabels = ['Informações', 'Instância', 'Grupos', 'Nichos', 'Agendamento', 'Revisão'];

function createDefaultWizardData() {
  return {
    platform: 'SHOPEE' as 'SHOPEE' | 'MERCADO_LIVRE',
    name: '',
    instanceId: '',
    shopeeCredentialId: '',
    mercadoLivreAccountId: '',
    keywords: [] as string[],
    groupIds: [] as string[],
    dispatchStrategy: 'ALL_SEQUENTIAL' as 'ALL_SEQUENTIAL' | 'RANDOM_ORDER' | 'RANDOM_SINGLE',
    groupRedirectLinkId: '',
    couponId: '',
    captionTemplate: '',
    frequencyMinutes: 60,
    dailyExecutionLimit: 20,
    jitterSeconds: 15,
    windowStartTime: '08:00',
    windowEndTime: '22:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    dedupWindowDays: 7,
  };
}

const wizardData = ref(createDefaultWizardData());

function isAutomationEditable(auto: any): boolean {
  return auto?.status === 'PAUSED' || auto?.status === 'INACTIVE';
}

function isAutomationDeletable(auto: any): boolean {
  return auto?.status === 'INACTIVE';
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'INACTIVE':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

function formatAutomationStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Ativa';
    case 'INACTIVE':
      return 'Inativa';
    default:
      return 'Pausada';
  }
}

const selectedGroupLinkObj = computed(() =>
  groupLinks.value.find((lnk) => lnk.id === wizardData.value.groupRedirectLinkId) || null,
);

const activeCoupons = computed(() =>
  coupons.value.filter(
    (c) => c.isActive && (!c.platform || c.platform === wizardData.value.platform),
  ),
);

const selectedCouponObj = computed(() =>
  coupons.value.find((c) => c.id === wizardData.value.couponId) || null,
);

function formatCouponSummary(coupon: any): string {
  if (coupon.discountType === 'PERCENTAGE') {
    const pct = Number(coupon.discountValue || 0);
    const max = coupon.maxDiscountAmount
      ? ` (até R$ ${Number(coupon.maxDiscountAmount).toFixed(2).replace('.', ',')})`
      : '';
    return `${pct}% OFF${max}`;
  }
  if (coupon.discountType === 'FIXED_AMOUNT') {
    return `R$ ${Number(coupon.discountValue || 0).toFixed(2).replace('.', ',')} OFF`;
  }
  return 'Apenas código';
}

function formatDispatchStrategy(strategy?: string) {
  switch (strategy) {
    case 'RANDOM_ORDER':
      return 'Ordem Randomizada';
    case 'RANDOM_SINGLE':
      return '1 Grupo Aleatório';
    default:
      return 'Todos em Ordem';
  }
}

function applyGroupLinkCaptionTemplate() {
  wizardData.value.captionTemplate =
    '🔥 *{titulo}*\n\n💰 Por apenas: *{preco}*\n🛒 Compre agora: {link_afiliado}\n\n📲 Entre no nosso grupo de ofertas (link permanente):\n{link_grupo}';
}

function applyCouponCaptionTemplate() {
  wizardData.value.captionTemplate =
    '*{titulo}*\nPor *{preco}*\nCupom: *{{cupom}}*\nDesconto: {{cupom_desconto}}\nCom cupom: *R$ {{preco_com_cupom}}*\nVálido até {{cupom_validade}}\n\n🛒 {link_afiliado}';
}

function applySpintaxHelper() {
  wizardData.value.captionTemplate =
    '{🔥 Oferta imperdível|⚡ Achadinho do dia|✨ Oportunidade selecionada}!\n\n*{titulo}*\n{Por apenas|Hoje por}: *{preco}*\nCupom: *{{cupom}}*\n{Confira no link|Garanta agora}: {link_afiliado}';
}

const selectedInstanceObj = computed(() =>
  instances.value.find((inst) => inst.id === wizardData.value.instanceId) || null,
);

const antiBanAssessment = computed(() => {
  const effectiveGroups =
    wizardData.value.dispatchStrategy === 'RANDOM_SINGLE'
      ? 1
      : Math.max(1, wizardData.value.groupIds.length);
  const estimatedDailyMsgs =
    (Number(wizardData.value.dailyExecutionLimit) || 0) * effectiveGroups;
  const instanceCap =
    selectedInstanceObj.value?.effectiveDailyLimit ??
    selectedInstanceObj.value?.dailyMessageLimit ??
    100;
  const hasSpintax = /\{[^{}]+\|[^{}]+\}/.test(wizardData.value.captionTemplate || '');
  const jitter = Number(wizardData.value.jitterSeconds) || 0;
  const freq = Number(wizardData.value.frequencyMinutes) || 60;

  let riskPoints = 0;
  const recommendations: string[] = [];

  if (jitter < 10) {
    riskPoints += 3;
    recommendations.push('Aumente o jitter entre grupos para pelo menos 15s.');
  } else if (jitter < 15) {
    riskPoints += 1;
    recommendations.push('Considere usar jitter de 15s ou mais em múltiplos grupos.');
  }

  if (freq < 30) {
    riskPoints += 2;
    recommendations.push('Intervalo inferior a 30 minutos eleva a frequência de rajadas.');
  }

  if (estimatedDailyMsgs > instanceCap) {
    riskPoints += 3;
    recommendations.push(
      `Volume estimado (${estimatedDailyMsgs}/dia) excede a cota segura da instância (${instanceCap}/dia).`,
    );
  } else if (estimatedDailyMsgs > 80) {
    riskPoints += 2;
    recommendations.push('Considere estratégia "1 Grupo Aleatório" ou reduzir o limite diário.');
  }

  if (!hasSpintax) {
    riskPoints += 1;
    recommendations.push('Adicione variações Spintax {opção A|opção B} na legenda da Etapa 3.');
  }

  if (selectedInstanceObj.value && !selectedInstanceObj.value.warmUpEnabled) {
    recommendations.push('Para chips novos, ative o modo Warm-up na aba Instâncias WhatsApp.');
  }

  if (riskPoints >= 5) {
    return {
      level: 'HIGH',
      label: 'Alto Risco',
      estimatedDailyMsgs,
      hasSpintax,
      boxClass: 'bg-rose-50 border-rose-200 text-rose-800',
      badgeClass: 'bg-rose-600 text-white',
      recommendations,
    };
  }
  if (riskPoints >= 2) {
    return {
      level: 'MEDIUM',
      label: 'Risco Moderado',
      estimatedDailyMsgs,
      hasSpintax,
      boxClass: 'bg-amber-50 border-amber-200 text-amber-800',
      badgeClass: 'bg-amber-500 text-white',
      recommendations,
    };
  }
  return {
    level: 'LOW',
    label: 'Baixo Risco',
    estimatedDailyMsgs,
    hasSpintax,
    boxClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeClass: 'bg-emerald-600 text-white',
    recommendations,
  };
});

// Modal de Histórico
const historyModalOpen = ref(false);
const executionsList = ref<any[]>([]);

function showFeedback(msg: string, isError = false) {
  feedbackMessage.value = msg;
  feedbackIsError.value = isError;
}

function formatDateTime(isoString: string) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR');
}

function getExecutionBadgeClass(status: string) {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-800';
    case 'PARTIAL_SUCCESS':
      return 'bg-amber-100 text-amber-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================
async function loadAutomations() {
  try {
    const res = await fetch('/api/automations', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      automations.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar automações.', true);
  }
}

async function loadDependencies() {
  try {
    const [instRes, credRes, linksRes, couponsRes, mlRes] = await Promise.all([
      fetch('/api/whatsapp-instances', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/shopee-credentials', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/group-links', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/coupons', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/mercadolivre/status', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
    ]);

    const instData = await instRes.json();
    const credData = await credRes.json();
    const linksData = await linksRes.json();
    const couponsData = await couponsRes.json();
    const mlData = mlRes.ok ? await mlRes.json() : null;

    if (instData.success) instances.value = instData.data;
    if (credData.success) credentials.value = credData.data;
    if (linksData.success) groupLinks.value = linksData.data;
    if (couponsData.success) coupons.value = couponsData.data;
    if (mlData?.success && mlData?.data) {
      mlAccounts.value = mlData.data.accounts || [];
      if (mlData.data.featureFlags) {
        mlFeatureFlags.value = mlData.data.featureFlags;
      }
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar dependências.', true);
  }
}

async function loadGroupsForInstance(instanceId: string) {
  try {
    const res = await fetch(`/api/whatsapp-groups?instanceId=${instanceId}`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      availableGroups.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar grupos.', true);
  }
}

// ==========================================
// WIZARD
// ==========================================
function openWizardModal() {
  editingAutomationId.value = null;
  lastSelectedInstanceId.value = '';
  availableGroups.value = [];
  wizardStep.value = 1;
  wizardData.value = createDefaultWizardData();
  wizardOpen.value = true;
}

async function openEditWizardModal(auto: any) {
  if (!isAutomationEditable(auto)) {
    showFeedback(
      'Somente automações pausadas ou inativas podem ser editadas. Pause a automação antes de editar.',
      true,
    );
    return;
  }

  editingAutomationId.value = auto.id;
  lastSelectedInstanceId.value = auto.instanceId || '';
  wizardStep.value = 1;
  wizardData.value = {
    platform: (auto.platform || 'SHOPEE') as 'SHOPEE' | 'MERCADO_LIVRE',
    name: auto.name || '',
    instanceId: auto.instanceId || '',
    shopeeCredentialId: auto.shopeeCredentialId || '',
    mercadoLivreAccountId: auto.mercadoLivreAccountId || '',
    keywords: (auto.keywords || []).map((k: any) => k.keyword),
    groupIds: (auto.groups || []).map((g: any) => g.groupId || g.group?.id).filter(Boolean),
    dispatchStrategy: auto.dispatchStrategy || 'ALL_SEQUENTIAL',
    groupRedirectLinkId: auto.groupRedirectLinkId || '',
    couponId: auto.couponId || '',
    captionTemplate: auto.captionTemplate || '',
    frequencyMinutes: auto.frequencyMinutes ?? 60,
    dailyExecutionLimit: auto.dailyExecutionLimit ?? 20,
    jitterSeconds: auto.jitterSeconds ?? 10,
    windowStartTime: auto.windowStartTime || '08:00',
    windowEndTime: auto.windowEndTime || '22:00',
    daysOfWeek: Array.isArray(auto.daysOfWeek) ? [...auto.daysOfWeek] : [1, 2, 3, 4, 5, 6, 7],
    dedupWindowDays: auto.dedupWindowDays ?? 7,
  };
  wizardOpen.value = true;

  if (auto.instanceId) {
    await loadGroupsForInstance(auto.instanceId);
  }
}

function closeWizardModal() {
  wizardOpen.value = false;
  editingAutomationId.value = null;
}

async function handleInstanceSelection(instanceId: string) {
  if (lastSelectedInstanceId.value && lastSelectedInstanceId.value !== instanceId) {
    wizardData.value.groupIds = [];
  }
  lastSelectedInstanceId.value = instanceId;
  await loadGroupsForInstance(instanceId);
}

function selectWizardPlatform(platform: 'SHOPEE' | 'MERCADO_LIVRE') {
  if (wizardData.value.platform === platform) return;
  wizardData.value.platform = platform;
  wizardData.value.couponId = '';
}

function validateStep(step: number): string | null {
  if (step === 1) {
    if (!wizardData.value.name.trim()) return 'Informe o nome da automação.';
    if (wizardData.value.platform === 'MERCADO_LIVRE') {
      if (!wizardData.value.mercadoLivreAccountId) {
        return 'Selecione a conta do Mercado Livre.';
      }
    } else if (!wizardData.value.shopeeCredentialId) {
      return 'Selecione a credencial Shopee.';
    }
  } else if (step === 2) {
    if (!wizardData.value.instanceId) return 'Selecione a instância WhatsApp.';
  } else if (step === 3) {
    if (wizardData.value.groupIds.length === 0) return 'Selecione ao menos 1 grupo destinatário.';
  } else if (step === 4) {
    if (wizardData.value.keywords.length === 0) return 'Adicione ao menos 1 nicho/palavra-chave.';
  }
  return null;
}

function advanceStep() {
  const error = validateStep(wizardStep.value);
  if (error) return showFeedback(error, true);
  wizardStep.value++;
}

function addKeyword() {
  const kw = keywordInput.value.trim();
  if (kw && !wizardData.value.keywords.includes(kw)) {
    wizardData.value.keywords.push(kw);
    keywordInput.value = '';
  }
}

function removeKeyword(idx: number) {
  wizardData.value.keywords.splice(idx, 1);
}

async function handleSaveAutomation() {
  for (let s = 1; s <= 4; s += 1) {
    const stepErr = validateStep(s);
    if (stepErr) {
      wizardStep.value = s;
      showFeedback(stepErr, true);
      return;
    }
  }

  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const payload = {
      ...wizardData.value,
      name: wizardData.value.name.trim(),
      shopeeCredentialId:
        wizardData.value.platform === 'SHOPEE'
          ? wizardData.value.shopeeCredentialId
          : null,
      mercadoLivreAccountId:
        wizardData.value.platform === 'MERCADO_LIVRE'
          ? wizardData.value.mercadoLivreAccountId
          : null,
      groupRedirectLinkId: wizardData.value.groupRedirectLinkId || null,
      couponId: wizardData.value.couponId || null,
      captionTemplate: wizardData.value.captionTemplate?.trim() || null,
    };

    const isEditing = Boolean(editingAutomationId.value);
    const url = isEditing
      ? `/api/automations/${editingAutomationId.value}`
      : '/api/automations';
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
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback(
      isEditing
        ? 'Automação atualizada com sucesso! Clique em Retomar/Reativar quando desejar ativá-la.'
        : 'Automação criada e agendada com sucesso!',
    );
    closeWizardModal();
    await loadAutomations();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

// ==========================================
// AÇÕES POR AUTOMAÇÃO
// ==========================================
async function togglePauseResume(auto: any) {
  const endpoint = auto.status === 'ACTIVE' ? 'pause' : 'resume';
  try {
    const res = await fetch(`/api/automations/${auto.id}/${endpoint}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback(
      auto.status === 'ACTIVE'
        ? 'Automação pausada com sucesso.'
        : auto.status === 'INACTIVE'
          ? 'Automação reativada com sucesso.'
          : 'Automação retomada com sucesso.',
    );
    await loadAutomations();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function deactivateAutomation(auto: any) {
  try {
    const res = await fetch(`/api/automations/${auto.id}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback('Automação inativada com sucesso. Agora ela pode ser editada ou excluída.');
    await loadAutomations();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function triggerExecuteNow(auto: any) {
  try {
    const res = await fetch(`/api/automations/${auto.id}/execute-now`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback('Disparo manual enfileirado no BullMQ com sucesso!');
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function openExecutionsModal(auto: any) {
  historyModalOpen.value = true;
  executionsList.value = [];
  try {
    const res = await fetch(`/api/automations/${auto.id}/executions`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      executionsList.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar histórico.', true);
  }
}

async function deleteAutomation(auto: any) {
  if (!isAutomationDeletable(auto)) {
    showFeedback(
      'Somente automações inativas podem ser excluídas. Inative a automação antes de excluir.',
      true,
    );
    return;
  }

  if (!confirm(`Deseja realmente excluir a automação '${auto.name}'?`)) return;

  try {
    const res = await fetch(`/api/automations/${auto.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback('Automação excluída com sucesso.');
    await loadAutomations();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

onMounted(async () => {
  await Promise.all([loadAutomations(), loadDependencies()]);
});
</script>
