<template>
  <AppLayout>
    <template #header>
      WhatsApp & Evolution API
    </template>

    <div class="max-w-6xl space-y-6">
      <!-- Navegação por Abas e Opção de Checklist -->
      <div class="border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-0">
        <nav class="-mb-px flex space-x-8 overflow-x-auto">
          <button
            @click="activeTab = 'instances'"
            :class="activeTab === 'instances' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Instâncias WhatsApp ({{ instances.length }})
          </button>

          <button
            @click="activeTab = 'groups'"
            :class="activeTab === 'groups' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Grupos Sincronizados ({{ groups.length }})
          </button>

          <button
            @click="activeTab = 'links'"
            :class="activeTab === 'links' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Links Permanentes ({{ groupLinks.length }})
          </button>

          <button
            @click="activeTab = 'servers'"
            :class="activeTab === 'servers' ? 'border-shopee-orange text-shopee-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            Servidores Evolution ({{ servers.length }})
          </button>
        </nav>

        <button
          type="button"
          @click="showSetupChecklist = !showSetupChecklist"
          :aria-expanded="showSetupChecklist"
          class="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 self-start sm:self-center sm:mb-1"
          :class="showSetupChecklist
            ? 'bg-shopee-light text-shopee-orange border-orange-300'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
        >
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {{ showSetupChecklist ? 'Ocultar Checklist' : 'Como configurar? (Checklist)' }}
        </button>
      </div>

      <!-- Feedback global de erro/sucesso -->
      <div
        v-if="feedbackMessage"
        :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'"
        class="p-4 rounded-lg border text-sm flex items-center justify-between"
      >
        <span>{{ feedbackMessage }}</span>
        <button @click="feedbackMessage = ''" class="text-xs font-semibold underline">Fechar</button>
      </div>

      <!-- Guia em formato de Checklist para criar/configurar Instância e Servidor -->
      <WhatsAppSetupChecklist
        v-if="showSetupChecklist"
        :has-servers="servers.length > 0"
        :server-count="servers.length"
        :has-instances="instances.length > 0"
        :has-connected-instance="hasConnectedInstance"
        :has-groups="groups.length > 0"
        :active-tab="activeTab"
        :draft-server="newServer"
        :draft-instance="newInstance"
        @close="showSetupChecklist = false"
        @go-to-tab="activeTab = $event"
      />

      <!-- ========================================== -->
      <!-- TAB 1: INSTÂNCIAS WHATSAPP                -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'instances'" class="space-y-6">
        <!-- Formulário de Nova Instância -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Criar Nova Instância WhatsApp</h3>
          <p class="text-sm text-gray-500 mb-5">
            Crie uma nova sessão na Evolution API. Após a criação, leia o QR Code com o aplicativo WhatsApp no seu celular.
          </p>

          <div v-if="servers.length === 0" class="space-y-4 mb-4">
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              ⚠️ Nenhum servidor Evolution configurado. Conecte a Evolution API rodando em Docker abaixo ou
              <button @click="activeTab = 'servers'" class="font-bold underline ml-1">
                cadastre um servidor externo
              </button>
              para poder criar instâncias.
            </div>

            <DockerEvolutionCard
              v-if="dockerStatus?.enabled"
              :status="dockerStatus"
              :checking="checkingDocker"
              :connecting="connectingDocker"
              compact
              @refresh="loadDockerStatus"
              @connect="handleConnectDocker"
            />
          </div>

          <form v-else class="space-y-4" @submit.prevent="handleCreateInstance">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Servidor Evolution</label>
                <select
                  v-model="newInstance.serverId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm bg-white"
                >
                  <option value="" disabled>Selecione o servidor</option>
                  <option v-for="srv in servers" :key="srv.id" :value="srv.id">
                    {{ srv.name }} ({{ srv.baseUrl }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Identificador da Instância (Slug)</label>
                <input
                  v-model="newInstance.instanceName"
                  type="text"
                  required
                  placeholder="Ex: zap-promocoes-01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
                <p class="mt-1 text-xs text-gray-400">Apenas letras, números, hífen ou underline.</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                <input
                  v-model="newInstance.displayName"
                  type="text"
                  required
                  placeholder="Ex: WhatsApp Vendas VIP"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                :disabled="isLoading"
                class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <span v-if="!isLoading">Criar Instância</span>
                <span v-else>Criando na Evolution API...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Lista de Instâncias -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-semibold text-gray-900">Instâncias Cadastradas</h4>
            <button
              @click="loadInstances"
              class="text-sm text-shopee-orange hover:underline font-medium"
            >
              Atualizar Lista
            </button>
          </div>

          <div v-if="instances.length === 0" class="p-8 text-center text-gray-500">
            Nenhuma instância cadastrada ainda.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="inst in instances"
              :key="inst.id"
              class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div class="space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <h5 class="text-base font-semibold text-gray-900">{{ inst.displayName }}</h5>
                  <span
                    :class="getStatusBadgeClass(inst.status)"
                    class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  >
                    {{ getStatusLabel(inst.status) }}
                  </span>
                  <span
                    v-if="inst.warmUpEnabled"
                    class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    Warm-up Ativo<span v-if="inst.warmUpStageDays !== null && inst.warmUpStageDays !== undefined"> (Dia {{ inst.warmUpStageDays }})</span>
                  </span>
                  <span
                    v-if="inst.isCircuitOpen"
                    data-testid="instance-circuit-badge"
                    class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                    :title="inst.lastErrorReason || 'Circuit Breaker ativado'"
                  >
                    Circuit Breaker Aberto
                  </span>
                </div>
                <div class="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Slug: <strong class="text-gray-700 font-mono">{{ inst.instanceName }}</strong></span>
                  <span>Servidor: <strong class="text-gray-700">{{ inst.server?.name }}</strong></span>
                  <span>Grupos: <strong class="text-gray-700">{{ inst._count?.groups || 0 }}</strong></span>
                  <span data-testid="instance-daily-quota">
                    Envios hoje:
                    <strong class="text-gray-800">{{ inst.messagesSentToday ?? 0 }} / {{ inst.effectiveDailyLimit ?? inst.dailyMessageLimit ?? 100 }}</strong>
                  </span>
                  <span>Cooldown: <strong class="text-gray-700">{{ inst.minIntervalSeconds ?? 15 }}s</strong></span>
                </div>
                <p
                  v-if="inst.isCircuitOpen || (inst.consecutiveSendFailures && inst.consecutiveSendFailures > 0)"
                  class="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1 inline-block"
                >
                  Proteção ativa ({{ inst.consecutiveSendFailures }} falha(s))
                  <span v-if="inst.circuitOpenUntil"> • Cooldown até {{ new Date(inst.circuitOpenUntil).toLocaleTimeString('pt-BR') }}</span>
                  <span v-if="inst.lastErrorReason"> — {{ inst.lastErrorReason }}</span>
                </p>
              </div>

              <!-- Ações da Instância -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Botão QR Code (se não conectada) -->
                <button
                  v-if="inst.status !== 'CONNECTED'"
                  @click="openQrModal(inst)"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Ler QR Code
                </button>

                <!-- Botão Verificar Status -->
                <button
                  @click="checkInstanceStatus(inst)"
                  class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Verificar Estado
                </button>

                <!-- Botão Proteção Anti-Ban / Warm-up -->
                <button
                  data-testid="btn-open-safety-modal"
                  @click="openSafetyModal(inst)"
                  class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Proteção Anti-Ban
                </button>

                <!-- Botão Resetar Circuit Breaker -->
                <button
                  v-if="inst.isCircuitOpen || (inst.consecutiveSendFailures && inst.consecutiveSendFailures > 0)"
                  data-testid="btn-reset-circuit"
                  @click="resetCircuitBreaker(inst)"
                  class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Resetar Circuit
                </button>

                <!-- Botão Sincronizar Grupos -->
                <button
                  v-if="inst.status === 'CONNECTED'"
                  @click="syncGroups(inst)"
                  class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Sincronizar Grupos
                </button>

                <!-- Botão Desconectar (Logout) -->
                <button
                  v-if="inst.status === 'CONNECTED'"
                  @click="logoutInstance(inst)"
                  class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Desconectar
                </button>

                <!-- Botão Excluir -->
                <button
                  @click="deleteInstance(inst)"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 2: GRUPOS SINCRONIZADOS                -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'groups'" class="space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Grupos de WhatsApp</h3>
              <p class="text-sm text-gray-500">
                Lista de grupos nos quais as instâncias conectadas participam. O JID oficial (@g.us) é preservado.
              </p>
            </div>
            <div class="w-full md:w-72">
              <input
                v-model="groupSearch"
                type="text"
                placeholder="Pesquisar por nome do grupo..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>
          </div>

          <div v-if="filteredGroups.length === 0" class="p-8 text-center text-gray-500">
            Nenhum grupo encontrado. Conecte uma instância e clique em "Sincronizar Grupos".
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th class="py-3 px-4 text-left">Nome do Grupo</th>
                  <th class="py-3 px-4 text-left">JID WhatsApp</th>
                  <th class="py-3 px-4 text-left">Instância</th>
                  <th class="py-3 px-4 text-center">Lotação</th>
                  <th class="py-3 px-4 text-left">Convite</th>
                  <th class="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="grp in filteredGroups" :key="grp.id" class="hover:bg-gray-50">
                  <td class="py-3 px-4 font-semibold text-gray-900">
                    <div>{{ grp.name }}</div>
                    <div class="flex flex-wrap gap-1.5 mt-1">
                      <span
                        v-if="grp.isAnnounceOnly"
                        data-testid="group-announce-badge"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800"
                        title="Somente administradores enviam mensagens neste grupo"
                      >
                        Apenas Admins
                      </span>
                      <span
                        v-if="!grp.isActive"
                        data-testid="group-blocked-badge"
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800"
                        :title="grp.sendBlockedReason || 'Grupo inativo para envios'"
                      >
                        Bloqueado / Inativo
                      </span>
                    </div>
                    <p v-if="!grp.isActive && grp.sendBlockedReason" class="text-[11px] font-normal text-rose-600 mt-0.5">
                      {{ grp.sendBlockedReason }}
                    </p>
                  </td>
                  <td class="py-3 px-4 font-mono text-xs text-gray-500">{{ grp.jid }}</td>
                  <td class="py-3 px-4 text-gray-600">{{ grp.instance?.displayName }}</td>
                  <td class="py-3 px-4 text-center text-gray-600">
                    {{ grp.participantCount ?? '-' }} / {{ grp.maxParticipants || 1024 }}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      v-if="grp.inviteUrl"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800"
                    >
                      Convite salvo
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600"
                    >
                      Não configurado
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="inline-flex items-center gap-2">
                      <button
                        v-if="!grp.isActive"
                        data-testid="btn-reactivate-group"
                        @click="toggleGroupActive(grp, true)"
                        class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-xs font-semibold"
                      >
                        Reativar
                      </button>
                      <button
                        @click="openGroupSettingsModal(grp)"
                        class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
                      >
                        Convite & Limite
                      </button>
                      <button
                        @click="sendTestMessage(grp)"
                        class="px-3 py-1 bg-shopee-light text-shopee-orange hover:bg-orange-100 rounded text-xs font-medium"
                      >
                        Disparo Teste
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- TAB 3: LINKS PERMANENTES DE GRUPO          -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'links'" class="space-y-6">
        <GroupLinksManager
          :groups="groups"
          :links="groupLinks"
          @refresh="refreshAllGroupData"
          @feedback="showFeedback"
        />
      </div>

      <!-- ========================================== -->
      <!-- TAB 4: SERVIDORES EVOLUTION               -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'servers'" class="space-y-6">
        <!-- Conexão 1-clique com Container Docker da Evolution API -->
        <DockerEvolutionCard
          :status="dockerStatus"
          :checking="checkingDocker"
          :connecting="connectingDocker"
          @refresh="loadDockerStatus"
          @connect="handleConnectDocker"
        />

        <!-- Formulário de Servidor -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Cadastrar Servidor Evolution API (Externo / Manual)</h3>
          <p class="text-sm text-gray-500 mb-5">
            Insira o endpoint base e a Global API Key do seu servidor Evolution API v2. A chave será cifrada com AES-256-GCM.
          </p>

          <form class="space-y-4" @submit.prevent="handleCreateServer">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Servidor</label>
                <input
                  v-model="newServer.name"
                  type="text"
                  required
                  placeholder="Ex: Servidor VPS Cloud"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">URL Base (HTTPS)</label>
                <input
                  v-model="newServer.baseUrl"
                  type="url"
                  required
                  placeholder="https://evolution.minhaempresa.com"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Global API Key</label>
                <input
                  v-model="newServer.apiKey"
                  type="password"
                  required
                  placeholder="Chave secreta global"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-shopee-orange focus:border-shopee-orange sm:text-sm"
                />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="submit"
                :disabled="isLoading"
                class="px-5 py-2.5 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <span v-if="!isLoading">Testar e Salvar Servidor</span>
                <span v-else>Conectando ao Servidor...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Lista de Servidores -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-semibold text-gray-900">Servidores Conectados</h4>
            <button @click="loadServers" class="text-sm text-shopee-orange hover:underline font-medium">
              Atualizar
            </button>
          </div>

          <div v-if="servers.length === 0" class="p-8 text-center text-gray-500">
            Nenhum servidor cadastrado ainda.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="srv in servers"
              :key="srv.id"
              class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h5 class="text-base font-semibold text-gray-900">{{ srv.name }}</h5>
                <p class="text-sm text-gray-500 font-mono">{{ srv.baseUrl }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  API Key: <code class="bg-gray-100 px-1 py-0.5 rounded">{{ srv.apiKeyMasked }}</code> • Instâncias: {{ srv._count?.instances || 0 }}
                </p>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  @click="deleteServer(srv)"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Excluir Servidor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL DE QR CODE                          -->
      <!-- ========================================== -->
      <div
        v-if="qrModalOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl space-y-4">
          <h4 class="text-lg font-bold text-gray-900">Conectar WhatsApp</h4>
          <p class="text-sm text-gray-500">
            Abra o WhatsApp no seu celular, vá em <strong>Aparelhos conectados > Conectar um aparelho</strong> e aponte para a imagem abaixo.
          </p>

          <div class="my-4 flex items-center justify-center min-h-[260px] bg-gray-50 rounded-xl p-4 border border-gray-200">
            <img
              v-if="currentQrCode"
              :src="currentQrCode"
              alt="QR Code WhatsApp"
              class="max-w-[240px] max-h-[240px] rounded-lg shadow-sm"
            />
            <div v-else class="text-gray-400 text-sm animate-pulse">
              Carregando QR Code da Evolution API...
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-400 px-2">
            <span>Atualizando a cada 5 segundos...</span>
            <button
              @click="refreshQrCode"
              class="text-shopee-orange font-semibold hover:underline"
            >
              Recarregar QR Agora
            </button>
          </div>

          <div class="pt-2">
            <button
              @click="closeQrModal"
              class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg transition-colors"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Configuração de Convite e Limite do Grupo -->
      <div
        v-if="groupSettingsModalOpen && editingGroup"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="text-base font-bold text-gray-900">Convite & Limite do Grupo</h4>
              <p class="text-xs text-gray-500 mt-0.5">{{ editingGroup.name }}</p>
            </div>
            <button @click="groupSettingsModalOpen = false" class="text-gray-400 hover:text-gray-600 text-sm font-bold">
              ✕
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-gray-700">URL de Convite do WhatsApp</label>
                <button
                  type="button"
                  :disabled="fetchingGroupInvite"
                  @click="fetchEditingGroupInvite"
                  class="text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-50"
                >
                  {{ fetchingGroupInvite ? 'Buscando via Evolution...' : 'Importar via Evolution API' }}
                </button>
              </div>
              <input
                v-model="groupSettingsForm.inviteUrl"
                type="url"
                placeholder="https://chat.whatsapp.com/CodigoDoGrupo"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Limite Máximo de Participantes</label>
              <input
                v-model.number="groupSettingsForm.maxParticipants"
                type="number"
                min="1"
                max="2000"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              @click="groupSettingsModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="savingGroupSettings"
              @click="saveGroupSettings"
              class="px-4 py-2 text-xs font-semibold text-white bg-shopee-orange hover:bg-shopee-hover rounded-lg disabled:opacity-50"
            >
              {{ savingGroupSettings ? 'Salvando...' : 'Salvar Configuração' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Proteção Anti-Ban / Warm-up da Instância -->
      <div
        v-if="safetyModalOpen && editingSafetyInstance"
        class="fixed inset-0 z-50 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-start justify-between border-b border-gray-100 pb-3">
            <div>
              <h4 class="font-bold text-gray-900">Proteção Anti-Ban & Aquecimento</h4>
              <p class="text-xs text-gray-500 mt-0.5">{{ editingSafetyInstance.displayName }}</p>
            </div>
            <button @click="safetyModalOpen = false" class="text-gray-400 hover:text-gray-700 font-bold">✕</button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Limite Diário Máximo de Mensagens (Instância)</label>
              <input
                v-model.number="safetyForm.dailyMessageLimit"
                data-testid="input-safety-daily-limit"
                type="number"
                min="1"
                max="2000"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p class="text-[11px] text-gray-500 mt-1">
                Conta mensagens reais enviadas em grupos para proteger o chip mesmo com múltiplas automações.
              </p>
            </div>

            <div>
              <label class="block font-semibold text-gray-700 mb-1">Cooldown Mínimo Global entre Mensagens (segundos)</label>
              <input
                v-model.number="safetyForm.minIntervalSeconds"
                data-testid="input-safety-min-interval"
                type="number"
                min="5"
                max="300"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p class="text-[11px] text-gray-500 mt-1">
                Intervalo mínimo obrigatório entre disparos consecutivos nesta instância (recomendado: 15s+).
              </p>
            </div>

            <label class="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/70 cursor-pointer">
              <input
                v-model="safetyForm.warmUpEnabled"
                data-testid="input-safety-warmup"
                type="checkbox"
                class="mt-0.5 rounded text-shopee-orange focus:ring-shopee-orange"
              />
              <div>
                <span class="font-semibold text-blue-900 block">Ativar Modo Warm-up (Aquecimento Progressivo)</span>
                <span class="text-[11px] text-blue-700">
                  Limita chips recém-conectados automaticamente: Dias 1-3 (20/dia), Dias 4-7 (40/dia), Dias 8-14 (70/dia).
                </span>
              </div>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              @click="safetyModalOpen = false"
              class="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="btn-save-safety-settings"
              :disabled="savingSafety"
              @click="saveSafetySettings"
              class="px-4 py-2 text-xs font-semibold text-white bg-shopee-orange hover:bg-shopee-hover rounded-lg disabled:opacity-50"
            >
              {{ savingSafety ? 'Salvando...' : 'Salvar Limites' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AppLayout from '../components/AppLayout.vue';
import WhatsAppSetupChecklist from '../components/whatsapp/WhatsAppSetupChecklist.vue';
import DockerEvolutionCard, { type DockerEvolutionStatus } from '../components/whatsapp/DockerEvolutionCard.vue';
import GroupLinksManager from '../components/whatsapp/GroupLinksManager.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const activeTab = ref<'instances' | 'groups' | 'links' | 'servers'>('instances');
const showSetupChecklist = ref(false);
const isLoading = ref(false);
const feedbackMessage = ref('');
const feedbackIsError = ref(false);

const dockerStatus = ref<DockerEvolutionStatus | null>(null);
const checkingDocker = ref(false);
const connectingDocker = ref(false);

const servers = ref<any[]>([]);
const instances = ref<any[]>([]);
const groups = ref<any[]>([]);
const groupLinks = ref<any[]>([]);
const groupSearch = ref('');

const groupSettingsModalOpen = ref(false);
const editingGroup = ref<any>(null);
const groupSettingsForm = ref({ inviteUrl: '', maxParticipants: 1024 });
const fetchingGroupInvite = ref(false);
const savingGroupSettings = ref(false);

const safetyModalOpen = ref(false);
const editingSafetyInstance = ref<any>(null);
const safetyForm = ref({
  dailyMessageLimit: 100,
  minIntervalSeconds: 15,
  warmUpEnabled: false,
});
const savingSafety = ref(false);

const hasConnectedInstance = computed(() =>
  instances.value.some((inst) => inst.status === 'CONNECTED'),
);

// Novo Servidor
const newServer = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
});

// Nova Instância
const newInstance = ref({
  serverId: '',
  instanceName: '',
  displayName: '',
});

// Modal de QR Code
const qrModalOpen = ref(false);
const selectedInstance = ref<any>(null);
const currentQrCode = ref<string | null>(null);
let qrPollingTimer: any = null;

const filteredGroups = computed(() => {
  if (!groupSearch.value.trim()) return groups.value;
  const q = groupSearch.value.toLowerCase();
  return groups.value.filter(
    (g) => g.name.toLowerCase().includes(q) || g.jid.toLowerCase().includes(q),
  );
});

function showFeedback(msg: string, isError = false) {
  feedbackMessage.value = msg;
  feedbackIsError.value = isError;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'bg-green-100 text-green-800';
    case 'CONNECTING':
      return 'bg-amber-100 text-amber-800 animate-pulse';
    case 'DISCONNECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'Conectada';
    case 'CONNECTING':
      return 'Conectando...';
    case 'DISCONNECTED':
      return 'Desconectada';
    case 'CREATED':
      return 'Aguardando QR';
    default:
      return status;
  }
}

// ==========================================
// SERVIDORES
// ==========================================
async function loadServers() {
  try {
    const res = await fetch('/api/evolution-servers', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      servers.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar servidores.', true);
  }
}

async function loadDockerStatus() {
  checkingDocker.value = true;
  try {
    const res = await fetch('/api/evolution-servers/docker/status', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      dockerStatus.value = data.data;
    }
  } catch {
    // Falha silenciosa de status; usuário pode clicar em Verificar Container
  } finally {
    checkingDocker.value = false;
  }
}

async function handleConnectDocker(customName?: string) {
  connectingDocker.value = true;
  feedbackMessage.value = '';
  try {
    const payload = customName && customName.trim().length > 0 ? { name: customName.trim() } : {};
    const res = await fetch('/api/evolution-servers/docker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao vincular Evolution API Docker.');
    }

    showFeedback('Evolution API (Docker) conectada e validada com sucesso!');
    await Promise.all([loadServers(), loadDockerStatus()]);

    if (data.data?.id && !newInstance.value.serverId) {
      newInstance.value.serverId = data.data.id;
    }
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    connectingDocker.value = false;
  }
}

async function handleCreateServer() {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch('/api/evolution-servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(newServer.value),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Falha ao conectar no servidor Evolution.');
    }

    showFeedback('Servidor Evolution cadastrado e validado com sucesso!');
    newServer.value = { name: '', baseUrl: '', apiKey: '' };
    await loadServers();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function deleteServer(server: any) {
  if (!confirm(`Deseja realmente excluir o servidor '${server.name}'?`)) return;

  try {
    const res = await fetch(`/api/evolution-servers/${server.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Servidor removido.');
    await Promise.all([loadServers(), loadDockerStatus()]);
  } catch (err: any) {
    showFeedback(err.error?.message || err.message, true);
  }
}

// ==========================================
// INSTÂNCIAS
// ==========================================
async function loadInstances() {
  try {
    const res = await fetch('/api/whatsapp-instances', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      instances.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar instâncias.', true);
  }
}

async function handleCreateInstance() {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch('/api/whatsapp-instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(newInstance.value),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Falha ao criar instância na Evolution API.');
    }

    showFeedback('Instância criada com sucesso! Agora leia o QR Code.');
    newInstance.value = { serverId: '', instanceName: '', displayName: '' };
    await loadInstances();

    // Se a instância foi criada, abre o QR Code automaticamente
    openQrModal(data.data);
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function checkInstanceStatus(inst: any) {
  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}/status`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Status atual de ${inst.displayName}: ${getStatusLabel(data.data.status)}`);
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function logoutInstance(inst: any) {
  if (!confirm(`Deseja desconectar a sessão do WhatsApp de '${inst.displayName}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Instância desconectada.');
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function deleteInstance(inst: any) {
  if (!confirm(`Deseja remover completamente a instância '${inst.displayName}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback('Instância removida com sucesso.');
    await loadInstances();
    await loadGroups();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

function openSafetyModal(inst: any) {
  editingSafetyInstance.value = inst;
  safetyForm.value = {
    dailyMessageLimit: inst.dailyMessageLimit ?? 100,
    minIntervalSeconds: inst.minIntervalSeconds ?? 15,
    warmUpEnabled: Boolean(inst.warmUpEnabled),
  };
  safetyModalOpen.value = true;
}

async function saveSafetySettings() {
  if (!editingSafetyInstance.value) return;
  savingSafety.value = true;
  try {
    const res = await fetch(
      `/api/whatsapp-instances/${editingSafetyInstance.value.id}/safety-settings`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: JSON.stringify({
          dailyMessageLimit: Number(safetyForm.value.dailyMessageLimit) || 100,
          minIntervalSeconds: Math.max(5, Number(safetyForm.value.minIntervalSeconds) || 15),
          warmUpEnabled: Boolean(safetyForm.value.warmUpEnabled),
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao salvar limites anti-ban.');
    }
    showFeedback('Limites anti-ban da instância atualizados com sucesso!');
    safetyModalOpen.value = false;
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    savingSafety.value = false;
  }
}

async function resetCircuitBreaker(inst: any) {
  try {
    const res = await fetch(`/api/whatsapp-instances/${inst.id}/reset-circuit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao resetar Circuit Breaker.');
    }
    showFeedback(`Circuit Breaker de '${inst.displayName}' resetado.`);
    await loadInstances();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function toggleGroupActive(grp: any, isActive: boolean) {
  try {
    const res = await fetch(`/api/whatsapp-groups/${grp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao atualizar grupo.');
    }
    showFeedback(isActive ? `Grupo '${grp.name}' reativado.` : `Grupo '${grp.name}' desativado.`);
    await loadGroups();
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

// ==========================================
// QR CODE & PAREAMENTO
// ==========================================
async function openQrModal(inst: any) {
  selectedInstance.value = inst;
  currentQrCode.value = null;
  qrModalOpen.value = true;

  await refreshQrCode();

  // Inicia polling a cada 5 segundos
  if (qrPollingTimer) clearInterval(qrPollingTimer);
  qrPollingTimer = setInterval(async () => {
    if (!selectedInstance.value || !qrModalOpen.value) return;

    // Checa status
    const statusRes = await fetch(`/api/whatsapp-instances/${selectedInstance.value.id}/status`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const statusData = await statusRes.json();

    if (statusData.data?.status === 'CONNECTED') {
      clearInterval(qrPollingTimer);
      closeQrModal();
      showFeedback(`WhatsApp conectado com sucesso na instância ${selectedInstance.value.displayName}!`);
      await loadInstances();
    }
  }, 5000);
}

async function refreshQrCode() {
  if (!selectedInstance.value) return;
  try {
    const res = await fetch(`/api/whatsapp-instances/${selectedInstance.value.id}/qrcode`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();

    if (data.data?.status === 'CONNECTED') {
      closeQrModal();
      showFeedback('Instância já conectada!');
      await loadInstances();
      return;
    }

    if (data.data?.base64) {
      currentQrCode.value = data.data.base64;
    }
  } catch (err: any) {
    showFeedback('Falha ao obter QR Code atualizado.', true);
  }
}

function closeQrModal() {
  qrModalOpen.value = false;
  selectedInstance.value = null;
  currentQrCode.value = null;
  if (qrPollingTimer) {
    clearInterval(qrPollingTimer);
    qrPollingTimer = null;
  }
}

// ==========================================
// GRUPOS
// ==========================================
async function loadGroups() {
  try {
    const res = await fetch('/api/whatsapp-groups', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      groups.value = data.data;
    }
  } catch (err: any) {
    showFeedback('Falha ao carregar grupos.', true);
  }
}

async function syncGroups(inst: any) {
  isLoading.value = true;
  feedbackMessage.value = '';
  try {
    const res = await fetch(`/api/whatsapp-groups/sync/${inst.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Sincronizados ${data.data.count} grupos com sucesso!`);
    await loadGroups();
    activeTab.value = 'groups';
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    isLoading.value = false;
  }
}

async function sendTestMessage(group: any) {
  if (!confirm(`Enviar mensagem de demonstração para o grupo '${group.name}'?`)) return;

  try {
    const res = await fetch(`/api/whatsapp-groups/${group.id}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify({
        text: '🔥 Teste de Conexão ShopeeZap: Integração Evolution API ativa e operacional!',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showFeedback(`Mensagem de teste despachada com sucesso para ${group.name}!`);
  } catch (err: any) {
    showFeedback(err.message, true);
  }
}

async function loadGroupLinks() {
  try {
    const res = await fetch('/api/group-links', {
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (data.success) {
      groupLinks.value = data.data;
    }
  } catch {
    showFeedback('Falha ao carregar links permanentes de grupos.', true);
  }
}

async function refreshAllGroupData() {
  await Promise.all([loadGroups(), loadGroupLinks()]);
}

function openGroupSettingsModal(grp: any) {
  editingGroup.value = grp;
  groupSettingsForm.value = {
    inviteUrl: grp.inviteUrl || '',
    maxParticipants: grp.maxParticipants || 1024,
  };
  groupSettingsModalOpen.value = true;
}

async function fetchEditingGroupInvite() {
  if (!editingGroup.value) return;
  fetchingGroupInvite.value = true;
  try {
    const res = await fetch(`/api/whatsapp-groups/${editingGroup.value.id}/fetch-invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao obter convite via Evolution API.');
    }
    if (data.data?.inviteUrl) {
      groupSettingsForm.value.inviteUrl = data.data.inviteUrl;
    }
    showFeedback('Convite oficial obtido com sucesso!');
    await refreshAllGroupData();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    fetchingGroupInvite.value = false;
  }
}

async function saveGroupSettings() {
  if (!editingGroup.value) return;
  savingGroupSettings.value = true;
  try {
    const payload: Record<string, any> = {
      maxParticipants: Number(groupSettingsForm.value.maxParticipants) || 1024,
    };
    if (groupSettingsForm.value.inviteUrl.trim()) {
      payload.inviteUrl = groupSettingsForm.value.inviteUrl.trim();
    }

    const res = await fetch(`/api/whatsapp-groups/${editingGroup.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || data.message || 'Falha ao atualizar configuração do grupo.');
    }
    showFeedback('Configuração do grupo atualizada com sucesso!');
    groupSettingsModalOpen.value = false;
    await refreshAllGroupData();
  } catch (err: any) {
    showFeedback(err.message, true);
  } finally {
    savingGroupSettings.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadServers(), loadInstances(), loadGroups(), loadGroupLinks(), loadDockerStatus()]);
});

onUnmounted(() => {
  if (qrPollingTimer) clearInterval(qrPollingTimer);
});
</script>
