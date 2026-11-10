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
                  :class="auto.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                >
                  {{ auto.status === 'ACTIVE' ? 'Ativa' : 'Pausada' }}
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
                <span v-else class="text-gray-400 italic">Automação pausada.</span>
              </div>
            </div>

            <!-- Ações -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <!-- Botão Disparo Manual Imediato -->
              <button
                @click="triggerExecuteNow(auto)"
                class="px-3.5 py-1.5 bg-shopee-light text-shopee-orange hover:bg-orange-100 text-xs font-semibold rounded-lg transition-colors flex items-center"
                title="Executar agora sem esperar o agendamento"
              >
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Disparar Agora
              </button>

              <!-- Botão Pausar / Retomar -->
              <button
                @click="togglePauseResume(auto)"
                :class="auto.status === 'ACTIVE' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              >
                {{ auto.status === 'ACTIVE' ? 'Pausar' : 'Retomar' }}
              </button>

              <!-- Botão Histórico de Execuções -->
              <button
                @click="openExecutionsModal(auto)"
                class="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Histórico
              </button>

              <!-- Botão Excluir -->
              <button
                @click="deleteAutomation(auto)"
                class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors"
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
              <h3 class="text-lg font-bold text-gray-900">Configurar Nova Automação</h3>
              <button @click="wizardOpen = false" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Etapas -->
            <div class="flex items-center space-x-2 text-xs font-medium">
              <span :class="wizardStep >= 1 ? 'text-shopee-orange font-bold' : 'text-gray-400'">1. Informações</span>
              <span class="text-gray-300">›</span>
              <span :class="wizardStep >= 2 ? 'text-shopee-orange font-bold' : 'text-gray-400'">2. Instância</span>
              <span class="text-gray-300">›</span>
              <span :class="wizardStep >= 3 ? 'text-shopee-orange font-bold' : 'text-gray-400'">3. Grupos</span>
              <span class="text-gray-300">›</span>
              <span :class="wizardStep >= 4 ? 'text-shopee-orange font-bold' : 'text-gray-400'">4. Nichos</span>
              <span class="text-gray-300">›</span>
              <span :class="wizardStep >= 5 ? 'text-shopee-orange font-bold' : 'text-gray-400'">5. Agendamento</span>
              <span class="text-gray-300">›</span>
              <span :class="wizardStep >= 6 ? 'text-shopee-orange font-bold' : 'text-gray-400'">6. Revisão</span>
            </div>
          </div>

          <!-- ETAPA 1: INFORMAÇÕES BÁSICAS -->
          <div v-if="wizardStep === 1" class="space-y-4">
            <h4 class="font-semibold text-gray-800 text-sm">Etapa 1: Dados da Automação e Credencial Shopee</h4>
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
                  @change="loadGroupsForInstance(inst.id)"
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
                  <p class="text-sm font-semibold text-gray-800">{{ grp.name }}</p>
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
                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label class="block text-xs font-semibold text-gray-800">
                    Modelo de Legenda Personalizado (Opcional)
                  </label>
                  <button
                    type="button"
                    @click="applyGroupLinkCaptionTemplate"
                    class="text-[11px] font-semibold text-shopee-orange hover:underline"
                  >
                    + Inserir modelo com &#123;link_grupo&#125;
                  </button>
                </div>
                <textarea
                  v-model="wizardData.captionTemplate"
                  rows="3"
                  placeholder="Deixe em branco para usar o modelo padrão. Variáveis: {titulo}, {preco}, {link_afiliado}, {link_grupo}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-shopee-orange focus:border-shopee-orange"
                ></textarea>
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
                <p class="text-[11px] text-gray-400 mt-0.5">Proteção contra bloqueio no WhatsApp.</p>
              </div>
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
              <p><strong>Nichos:</strong> {{ wizardData.keywords.join(', ') }}</p>
              <p><strong>Frequência:</strong> A cada {{ wizardData.frequencyMinutes }} minutos</p>
              <p><strong>Horário de Envio:</strong> Das {{ wizardData.windowStartTime }} às {{ wizardData.windowEndTime }}</p>
              <p><strong>Limite Diário:</strong> Até {{ wizardData.dailyExecutionLimit }} envios/dia</p>
              <p><strong>Proteção Anti-Spam:</strong> Jitter de {{ wizardData.jitterSeconds }}s e desduplicação de {{ wizardData.dedupWindowDays }} dias</p>
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
              <span v-if="!isLoading">Ativar e Salvar Automação</span>
              <span v-else>Gravando Automação...</span>
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

// Wizard Modal
const wizardOpen = ref(false);
const wizardStep = ref(1);
const keywordInput = ref('');

const wizardData = ref({
  name: '',
  instanceId: '',
  shopeeCredentialId: '',
  keywords: [] as string[],
  groupIds: [] as string[],
  dispatchStrategy: 'ALL_SEQUENTIAL' as 'ALL_SEQUENTIAL' | 'RANDOM_ORDER' | 'RANDOM_SINGLE',
  groupRedirectLinkId: '',
  captionTemplate: '',
  frequencyMinutes: 60,
  dailyExecutionLimit: 20,
  jitterSeconds: 10,
  windowStartTime: '08:00',
  windowEndTime: '22:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  dedupWindowDays: 7,
});

const selectedGroupLinkObj = computed(() =>
  groupLinks.value.find((lnk) => lnk.id === wizardData.value.groupRedirectLinkId) || null,
);

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
    const [instRes, credRes, linksRes] = await Promise.all([
      fetch('/api/whatsapp-instances', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/shopee-credentials', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
      fetch('/api/group-links', {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      }),
    ]);

    const instData = await instRes.json();
    const credData = await credRes.json();
    const linksData = await linksRes.json();

    if (instData.success) instances.value = instData.data;
    if (credData.success) credentials.value = credData.data;
    if (linksData.success) groupLinks.value = linksData.data;
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
  wizardStep.value = 1;
  wizardData.value = {
    name: '',
    instanceId: '',
    shopeeCredentialId: '',
    keywords: [],
    groupIds: [],
    dispatchStrategy: 'ALL_SEQUENTIAL',
    groupRedirectLinkId: '',
    captionTemplate: '',
    frequencyMinutes: 60,
    dailyExecutionLimit: 20,
    jitterSeconds: 10,
    windowStartTime: '08:00',
    windowEndTime: '22:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    dedupWindowDays: 7,
  };
  wizardOpen.value = true;
}

function advanceStep() {
  if (wizardStep.value === 1) {
    if (!wizardData.value.name.trim()) return showFeedback('Informe o nome da automação.', true);
    if (!wizardData.value.shopeeCredentialId) return showFeedback('Selecione a credencial Shopee.', true);
  } else if (wizardStep.value === 2) {
    if (!wizardData.value.instanceId) return showFeedback('Selecione a instância WhatsApp.', true);
  } else if (wizardStep.value === 3) {
    if (wizardData.value.groupIds.length === 0) return showFeedback('Selecione ao menos 1 grupo destinatário.', true);
  } else if (wizardStep.value === 4) {
    if (wizardData.value.keywords.length === 0) return showFeedback('Adicione ao menos 1 nicho/palavra-chave.', true);
  }
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
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const payload = {
      ...wizardData.value,
      groupRedirectLinkId: wizardData.value.groupRedirectLinkId || null,
      captionTemplate: wizardData.value.captionTemplate?.trim() || null,
    };

    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message);

    showFeedback('Automação criada e agendada com sucesso!');
    wizardOpen.value = false;
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
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Automação ${auto.status === 'ACTIVE' ? 'pausada' : 'retomada'} com sucesso.`);
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
    if (!res.ok) throw new Error(data.message);

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
  if (!confirm(`Deseja realmente excluir a automação '${auto.name}'?`)) return;

  try {
    const res = await fetch(`/api/automations/${auto.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

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
