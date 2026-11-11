<template>
  <AppLayout>
    <template #header>
      Integração Mercado Livre Afiliados
    </template>

    <div class="max-w-5xl space-y-6">
      <!-- ======================================================== -->
      <!-- BARRA DE FEATURE FLAGS POR ORGANIZAÇÃO                   -->
      <!-- ======================================================== -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 class="text-base font-bold text-gray-900">Modos de Integração Mercado Livre (Feature Flags)</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Habilite ou desabilite dinamicamente as alternativas disponíveis para sua organização. Por padrão, apenas a Alternativa B inicia ativa.
            </p>
          </div>
          <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full self-start md:self-auto">
            Controle por Tenant
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Toggle Alternativa B -->
          <div
            class="flex items-start justify-between gap-4 p-3.5 rounded-lg border transition-colors"
            :class="flags.ml_alternative_b_enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50'"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-900">Alternativa B — Tela Protótipo</span>
                <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-100 text-shopee-orange">
                  Padrão: Ativa
                </span>
              </div>
              <p class="text-xs text-gray-600">
                Tag de afiliado, cookie criptografado (14 dias), conector de navegador e gateway parceiro homologado.
              </p>
            </div>
            <button
              type="button"
              data-testid="toggle-ml-alt-b"
              role="switch"
              :aria-checked="flags.ml_alternative_b_enabled"
              :disabled="flagUpdating === 'ml_alternative_b_enabled'"
              @click="toggleFlag('ml_alternative_b_enabled')"
              :class="flags.ml_alternative_b_enabled ? 'bg-shopee-orange' : 'bg-gray-300'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-shopee-orange focus:ring-offset-1"
            >
              <span
                :class="flags.ml_alternative_b_enabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
              />
            </button>
          </div>

          <!-- Toggle Alternativa A -->
          <div
            class="flex items-start justify-between gap-4 p-3.5 rounded-lg border transition-colors"
            :class="flags.ml_alternative_a_enabled ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50'"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-900">Alternativa A — OAuth 2.0 Oficial</span>
                <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-200 text-gray-700">
                  Padrão: Desabilitada
                </span>
              </div>
              <p class="text-xs text-gray-600">
                Credenciais Mercado Livre Developers (OAuth 2.0), busca oficial (/sites/MLB/search) e fila de links meli.la.
              </p>
            </div>
            <button
              type="button"
              data-testid="toggle-ml-alt-a"
              role="switch"
              :aria-checked="flags.ml_alternative_a_enabled"
              :disabled="flagUpdating === 'ml_alternative_a_enabled'"
              @click="toggleFlag('ml_alternative_a_enabled')"
              :class="flags.ml_alternative_a_enabled ? 'bg-shopee-orange' : 'bg-gray-300'"
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-shopee-orange focus:ring-offset-1"
            >
              <span
                :class="flags.ml_alternative_a_enabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Feedback Global -->
      <div
        v-if="feedbackMessage"
        :class="feedbackIsError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'"
        class="p-4 rounded-lg border text-sm flex items-center justify-between gap-4"
      >
        <span>{{ feedbackMessage }}</span>
        <button @click="feedbackMessage = ''" class="text-xs font-semibold underline shrink-0">Fechar</button>
      </div>

      <!-- Estado quando ambas as flags estiverem desabilitadas -->
      <div
        v-if="!flags.ml_alternative_b_enabled && !flags.ml_alternative_a_enabled"
        class="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center space-y-3"
      >
        <p class="text-base font-bold text-gray-800">Integração Mercado Livre desabilitada</p>
        <p class="text-sm text-gray-500 max-w-lg mx-auto">
          Ambas as alternativas (A e B) estão desativadas para sua organização no momento. Ative ao menos uma chave acima para configurar ou gerenciar ofertas do Mercado Livre.
        </p>
      </div>

      <!-- ======================================================== -->
      <!-- ALTERNATIVA B — TELA ESTILO PROTÓTIPO + CONECTOR         -->
      <!-- ======================================================== -->
      <div
        v-if="flags.ml_alternative_b_enabled"
        data-testid="section-ml-alt-b"
        class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <!-- Cabeçalho estilo protótipo adaptado ao tema claro -->
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-50/70 to-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900">Configurar Mercado Livre</h3>
              <p class="text-xs text-gray-500">
                Cole o cookie de afiliado do ML para gerenciar sua sessão criptografada com sua tag e gateway homologado.
              </p>
            </div>
          </div>

          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            Alternativa B
          </span>
        </div>

        <div class="p-6 space-y-5">
          <!-- Bloco Passo a Passo / Tutorial -->
          <div class="rounded-xl border border-orange-200 bg-orange-50/70 overflow-hidden">
            <button
              type="button"
              @click="showPrototypeGuide = !showPrototypeGuide"
              class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-orange-100/40 transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-shopee-orange/15 text-shopee-orange flex items-center justify-center font-bold text-sm">
                  ▶
                </span>
                <div>
                  <span class="text-sm font-semibold text-gray-900 block">Passo a passo para configurar o Mercado Livre</span>
                  <span class="text-xs text-gray-600">Veja como conectar sua sessão com segurança ou vincular um gateway homologado.</span>
                </div>
              </div>
              <span class="text-xs font-semibold text-shopee-orange">
                {{ showPrototypeGuide ? 'Ocultar' : 'Ver checklist' }}
              </span>
            </button>

            <div v-if="showPrototypeGuide" class="px-4 pb-4 pt-1 border-t border-orange-200/70 text-xs text-gray-700 space-y-1.5">
              <p><strong>1.</strong> Faça login no <a href="https://www.mercadolivre.com.br/l/afiliados-home" target="_blank" rel="noopener noreferrer" class="text-shopee-orange underline font-medium">Portal de Afiliados Mercado Livre</a>.</p>
              <p><strong>2.</strong> Use <strong>Conectar automaticamente</strong> (bookmarklet no navegador) ou copie os cookies <code class="bg-white px-1 py-0.5 rounded border">orguserid</code>, <code class="bg-white px-1 py-0.5 rounded border">ssid</code> e <code class="bg-white px-1 py-0.5 rounded border">orguseridp</code>.</p>
              <p><strong>3.</strong> Os cookies são armazenados com <strong>criptografia AES-256-GCM</strong> e validade exibida de 14 dias. O servidor nunca inventa endpoints privados do ML.</p>
              <p><strong>4.</strong> Para conversão server-side automática em massa nas automações, informe um <strong>Gateway Parceiro Homologado</strong> ou ative a <strong>Alternativa A</strong> para fila de links <code class="bg-white px-1 py-0.5 rounded border">meli.la</code>.</p>
            </div>
          </div>

          <!-- Status Banner Conectado / Expiração -->
          <div
            v-if="defaultAccount && (defaultAccount.isCookieConnected || defaultAccount.affiliateTag)"
            :class="defaultAccount.isCookieExpired
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'"
            class="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div class="flex items-center gap-2 text-sm">
              <span
                :class="defaultAccount.isCookieExpired ? 'bg-amber-500' : 'bg-emerald-500'"
                class="w-2.5 h-2.5 rounded-full shrink-0"
              />
              <div>
                <span class="font-bold">
                  {{ defaultAccount.isCookieExpired ? 'Sessão Expirada' : defaultAccount.isCookieConnected ? 'Conectado' : 'Tag Configurada' }}
                </span>
                <div class="text-xs opacity-90">
                  Tag: <strong class="font-mono">{{ defaultAccount.affiliateTag || 'não definida' }}</strong>
                  <template v-if="defaultAccount.isCookieConnected">
                    • {{ defaultAccount.isCookieExpired ? 'cookie expirado — atualize' : `expira em ${defaultAccount.cookieDaysRemaining} dias` }}
                  </template>
                </div>
              </div>
            </div>
            <span v-if="defaultAccount.sessionCookieMasked" class="font-mono text-[11px] px-2 py-0.5 bg-white/80 rounded border border-emerald-200 text-gray-600">
              {{ defaultAccount.sessionCookieMasked }}
            </span>
          </div>

          <!-- Conectar automaticamente (Recomendado) -->
          <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-gray-900">Conectar automaticamente</span>
                  <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-200 text-amber-900">
                    Recomendado
                  </span>
                </div>
                <p class="text-xs text-gray-700">
                  Gere um token temporário (15 min) e execute o conector no navegador já logado no Mercado Livre para sincronizar sua sessão sem copiar manualmente.
                </p>
              </div>
              <button
                type="button"
                @click="generatePairingConnector"
                :disabled="pairingLoading"
                class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0 disabled:opacity-60"
              >
                {{ pairingLoading ? 'Gerando...' : 'Gerar Conector Navegador' }}
              </button>
            </div>

            <div v-if="pairingInfo" class="bg-white rounded-lg border border-amber-200 p-3 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-800">Conector pronto (válido por 15 min)</span>
                <button
                  type="button"
                  @click="copyBookmarklet"
                  class="text-shopee-orange hover:underline font-semibold"
                >
                  {{ copiedBookmarklet ? 'Snippet copiado!' : 'Copiar script para Console/Bookmarklet' }}
                </button>
              </div>
              <p class="text-gray-600">
                1) Abra sua aba autenticada em <code class="bg-gray-100 px-1 rounded">mercadolivre.com.br</code> → 2) Cole o bookmarklet ou envie via extensão local para <code class="bg-gray-100 px-1 rounded">{{ pairingInfo.syncPath }}</code>.
              </p>
              <pre class="bg-gray-900 text-emerald-300 p-2 rounded overflow-x-auto text-[11px] font-mono">{{ bookmarkletSnippet }}</pre>
            </div>
          </div>

          <div class="relative flex py-1 items-center">
            <div class="flex-grow border-t border-gray-200"></div>
            <span class="flex-shrink mx-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ou cole manualmente
            </span>
            <div class="flex-grow border-t border-gray-200"></div>
          </div>

          <!-- Formulário Manual Protótipo + Gateway -->
          <form @submit.prevent="savePrototypeConfig" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tag de Afiliado Mercado Livre
                </label>
                <input
                  v-model="prototypeForm.affiliateTag"
                  type="text"
                  placeholder="Ex: azevedoalexandre39"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Identificação da Conta
                </label>
                <input
                  v-model="prototypeForm.label"
                  type="text"
                  placeholder="Conta Mercado Livre Principal"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-shopee-orange focus:border-shopee-orange"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-gray-700">Cookie do Mercado Livre</label>
                <span v-if="defaultAccount?.sessionCookieMasked" class="text-xs text-gray-500">
                  Atual salvo: <code class="font-mono">{{ defaultAccount.sessionCookieMasked }}</code>
                </span>
              </div>
              <textarea
                v-model="prototypeForm.sessionCookie"
                rows="3"
                placeholder="orguserid=...; ssid=...; orguseridp=...; (cole aqui — opcional ao editar apenas a tag)"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-shopee-orange focus:border-shopee-orange"
              ></textarea>
              <p class="text-[11px] text-gray-500 mt-1">
                Cifrado com AES-256-GCM antes da persistência. Nunca exibido em texto claro após salvo.
              </p>
            </div>

            <!-- Gateway Parceiro Homologado (Opcional) -->
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <span class="text-xs font-bold text-gray-800 block">
                  Gateway Parceiro Homologado (Opcional — Conversão Server-Side)
                </span>
                <p class="text-[11px] text-gray-500">
                  Informe apenas se possuir contrato/serviço externo próprio autorizado para converter URLs ML em <code class="bg-white px-1 rounded">meli.la</code>. Protegido contra SSRF.
                </p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">URL do Gateway (HTTPS)</label>
                  <input
                    v-model="prototypeForm.partnerGatewayUrl"
                    type="url"
                    placeholder="https://seu-gateway-homologado.com/ml/convert"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">
                    API Key do Gateway
                    <span v-if="defaultAccount?.partnerGatewayApiKeyMasked" class="font-mono text-gray-400">
                      ({{ defaultAccount.partnerGatewayApiKeyMasked }})
                    </span>
                  </label>
                  <input
                    v-model="prototypeForm.partnerGatewayApiKey"
                    type="password"
                    placeholder="Opcional — informe para atualizar"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
                  />
                </div>
              </div>
            </div>

            <!-- Testar conversão -->
            <div class="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
              <div class="flex items-center gap-2 text-xs font-bold text-gray-800">
                <span>⚡ Testar conversão</span>
              </div>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  v-model="testConversionUrl"
                  type="url"
                  placeholder="Cole uma URL do ML (ex: https://www.mercadolivre.com.br/...)"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-shopee-orange focus:border-shopee-orange"
                />
                <button
                  type="button"
                  @click="runTestConversion"
                  :disabled="testingConversion || !testConversionUrl.trim()"
                  class="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {{ testingConversion ? 'Testando...' : 'Testar' }}
                </button>
              </div>

              <div
                v-if="testConversionResult"
                :class="testConversionResult.converted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'"
                class="rounded-lg border p-3 text-xs space-y-1"
              >
                <div class="font-bold">
                  {{ testConversionResult.converted ? 'Conversão realizada!' : 'Validação Local Concluída (Sem Gateway Configurado)' }}
                </div>
                <p>{{ testConversionResult.message }}</p>
                <div v-if="testConversionResult.shortUrl" class="font-mono font-semibold text-green-900 break-all">
                  Link curto gerado: {{ testConversionResult.shortUrl }}
                </div>
              </div>
            </div>

            <!-- Barra Inferior do Protótipo -->
            <div class="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <button
                v-if="defaultAccount"
                type="button"
                @click="removePrototypeConfig"
                class="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Remover
              </button>
              <div class="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  @click="resetPrototypeForm"
                  class="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Restaurar
                </button>
                <button
                  type="submit"
                  :disabled="savingPrototype"
                  class="px-5 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60"
                >
                  {{ savingPrototype ? 'Salvando...' : 'Salvar e Validar' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- ALTERNATIVA A — OAUTH 2.0 OFICIAL + OFERTAS MELI.LA      -->
      <!-- ======================================================== -->
      <div
        v-if="flags.ml_alternative_a_enabled"
        data-testid="section-ml-alt-a"
        class="space-y-6"
      >
        <!-- Subcard OAuth 2.0 Oficial -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-gray-900">Mercado Livre Developers (OAuth 2.0 Oficial)</h3>
              <p class="text-xs text-gray-500 mt-0.5">
                Conecte seu App oficial registrado no DevCenter do Mercado Livre para consultar o catálogo com segurança.
              </p>
            </div>
            <span
              :class="defaultAccount?.isOAuthConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'"
              class="px-2.5 py-1 rounded-full text-xs font-semibold"
            >
              {{ defaultAccount?.isOAuthConnected ? `OAuth Conectado (${defaultAccount.mlNickname})` : 'Não autorizado' }}
            </span>
          </div>

          <form @submit.prevent="saveOAuthCredentials" class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">App ID (Client ID)</label>
                <input
                  v-model="oauthForm.appId"
                  type="text"
                  required
                  placeholder="Ex: 778899001122"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">
                  Client Secret
                  <span v-if="defaultAccount?.oauthClientSecretMasked" class="font-mono text-gray-400">
                    ({{ defaultAccount.oauthClientSecretMasked }})
                  </span>
                </label>
                <input
                  v-model="oauthForm.clientSecret"
                  type="password"
                  :required="!defaultAccount?.oauthClientSecretMasked"
                  placeholder="Secret do aplicativo ML"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Redirect URI</label>
                <input
                  v-model="oauthForm.redirectUri"
                  type="url"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  :disabled="savingOAuth"
                  class="px-4 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {{ savingOAuth ? 'Salvando...' : 'Salvar Credenciais OAuth' }}
                </button>
                <button
                  v-if="defaultAccount?.oauthAppId"
                  type="button"
                  @click="startOAuthAuthorization"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Autorizar no Mercado Livre
                </button>
                <button
                  v-if="defaultAccount?.isOAuthConnected"
                  type="button"
                  @click="disconnectOAuth"
                  class="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-lg"
                >
                  Desconectar OAuth
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Subcard Busca Oficial /sites/MLB/search -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 class="text-base font-bold text-gray-900">Catálogo Oficial Mercado Livre (/sites/MLB/search)</h4>
              <p class="text-xs text-gray-500">
                Pesquise produtos oficiais e vincule seu link curto <code class="bg-gray-100 px-1 rounded">meli.la</code> gerado no Portal de Afiliados ML para disparar nas automações.
              </p>
            </div>
            <button
              type="button"
              @click="openOfferModal()"
              class="px-3.5 py-2 border border-shopee-orange text-shopee-orange hover:bg-orange-50 text-xs font-semibold rounded-lg shrink-0"
            >
              + Importar Link meli.la Manual
            </button>
          </div>

          <form @submit.prevent="searchCatalog" class="flex flex-col sm:flex-row gap-2">
            <input
              v-model="searchKeyword"
              type="text"
              required
              placeholder="Buscar no Mercado Livre (ex: fone bluetooth samsung, smartwatch)..."
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              :disabled="searchingCatalog"
              class="px-5 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-60"
            >
              {{ searchingCatalog ? 'Buscando...' : 'Buscar Produtos' }}
            </button>
          </form>

          <div v-if="searchResults.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div
              v-for="item in searchResults"
              :key="item.mlItemId"
              class="border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-orange-200 transition-colors"
            >
              <div class="flex gap-3">
                <img
                  :src="item.imageUrl"
                  :alt="item.title"
                  class="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white shrink-0"
                />
                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-semibold text-gray-900 line-clamp-2">{{ item.title }}</p>
                  <p class="text-sm font-bold text-shopee-orange">R$ {{ Number(item.price).toFixed(2).replace('.', ',') }}</p>
                  <p v-if="item.sellerName" class="text-[11px] text-gray-500 truncate">
                    Vendedor: <strong>{{ item.sellerName }}</strong>
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <a
                  :href="item.permalink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-blue-600 hover:underline font-medium"
                >
                  Abrir anúncio ↗
                </a>
                <button
                  type="button"
                  @click="openOfferModal(item)"
                  class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg"
                >
                  Vincular meli.la
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Subcard Fila de Ofertas meli.la -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 class="font-bold text-gray-900">Fila de Ofertas Mercado Livre ({{ offers.length }})</h4>
            <button @click="loadOffers" class="text-xs text-shopee-orange hover:underline font-semibold">
              Atualizar Fila
            </button>
          </div>

          <div v-if="offers.length === 0" class="p-8 text-center text-sm text-gray-500">
            Nenhuma oferta com link oficial <code class="bg-gray-100 px-1 rounded">meli.la</code> importada ainda.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="offer in offers"
              :key="offer.id"
              class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div class="flex items-center gap-3 min-w-0">
                <img
                  :src="offer.imageUrl"
                  :alt="offer.title"
                  class="w-12 h-12 object-contain rounded border border-gray-200 bg-white shrink-0"
                />
                <div class="min-w-0 space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-gray-900 truncate">{{ offer.title }}</span>
                    <span
                      :class="offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'"
                      class="px-2 py-0.5 text-[10px] font-bold rounded shrink-0"
                    >
                      {{ offer.isActive ? 'Ativa' : 'Pausada' }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span class="font-bold text-shopee-orange">R$ {{ Number(offer.price).toFixed(2).replace('.', ',') }}</span>
                    <span v-if="offer.sellerName">Vendedor: <strong>{{ offer.sellerName }}</strong></span>
                    <span v-if="offer.keyword" class="px-1.5 py-0.5 bg-gray-100 rounded text-[11px]">Nicho: {{ offer.keyword }}</span>
                    <a
                      :href="offer.affiliateShortUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-blue-600 hover:underline"
                    >
                      {{ offer.affiliateShortUrl }}
                    </a>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  @click="toggleOfferActive(offer)"
                  class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  {{ offer.isActive ? 'Pausar' : 'Ativar' }}
                </button>
                <button
                  type="button"
                  @click="deleteOffer(offer.id)"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Importar Oferta Oficial meli.la (Alternativa A) -->
      <div
        v-if="offerModalOpen"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 class="text-base font-bold text-gray-900">Importar Oferta Mercado Livre (meli.la)</h3>
            <button @click="offerModalOpen = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form @submit.prevent="saveOffer" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Título do Produto</label>
              <input v-model="offerForm.title" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Preço (R$)</label>
                <input v-model.number="offerForm.price" type="number" step="0.01" min="0.01" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Vendedor (p/ match de cupom)</label>
                <input v-model="offerForm.sellerName" type="text" placeholder="Ex: Loja Oficial Samsung" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">URL Original no Mercado Livre (HTTPS)</label>
              <input v-model="offerForm.originalUrl" type="url" required placeholder="https://produto.mercadolivre.com.br/MLB-..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Seu Link de Afiliado Oficial (meli.la)</label>
              <input v-model="offerForm.affiliateShortUrl" type="url" required placeholder="https://meli.la/..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">URL da Imagem</label>
                <input v-model="offerForm.imageUrl" type="url" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Palavra-chave / Nicho</label>
                <input v-model="offerForm.keyword" type="text" placeholder="Ex: fone bluetooth" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                @click="offerModalOpen = false"
                class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="savingOffer"
                class="px-5 py-2 bg-shopee-orange hover:bg-shopee-hover text-white text-sm font-semibold rounded-lg"
              >
                {{ savingOffer ? 'Salvando...' : 'Salvar na Fila' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '../components/AppLayout.vue';
import api from '../services/api';

const route = useRoute();
const router = useRouter();

const flags = ref({
  ml_alternative_b_enabled: true,
  ml_alternative_a_enabled: false,
});
const flagUpdating = ref<string | null>(null);

const accounts = ref<any[]>([]);
const defaultAccount = computed(() => accounts.value[0] || null);
const offers = ref<any[]>([]);
const searchResults = ref<any[]>([]);

const feedbackMessage = ref('');
const feedbackIsError = ref(false);
function showFeedback(msg: string, isError = false) {
  feedbackMessage.value = msg;
  feedbackIsError.value = isError;
}

// Alternativa B state
const showPrototypeGuide = ref(false);
const savingPrototype = ref(false);
const pairingLoading = ref(false);
const pairingInfo = ref<any>(null);
const copiedBookmarklet = ref(false);
const testConversionUrl = ref('');
const testingConversion = ref(false);
const testConversionResult = ref<any>(null);

const prototypeForm = ref({
  label: 'Conta Mercado Livre',
  affiliateTag: '',
  sessionCookie: '',
  partnerGatewayUrl: '',
  partnerGatewayApiKey: '',
});

const bookmarkletSnippet = computed(() => {
  if (!pairingInfo.value) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `javascript:(function(){fetch('${origin}${pairingInfo.value.syncPath}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pairingToken:'${pairingInfo.value.pairingToken}',sessionCookie:document.cookie})}).then(r=>r.json()).then(d=>alert(d.success?'ShopeeZap conectado!':'Falha ao sincronizar')).catch(()=>alert('Erro de conexão'));})();`;
});

// Alternativa A state
const savingOAuth = ref(false);
const searchingCatalog = ref(false);
const searchKeyword = ref('');
const oauthForm = ref({
  appId: '',
  clientSecret: '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/mercadolivre` : 'http://localhost:5173/mercadolivre',
});

const offerModalOpen = ref(false);
const savingOffer = ref(false);
const offerForm = ref({
  mlItemId: '',
  title: '',
  price: 0,
  originalPrice: null as number | null,
  imageUrl: '',
  originalUrl: '',
  affiliateShortUrl: '',
  sellerName: '',
  keyword: '',
});

function syncFormsFromAccount(acc: any) {
  if (!acc) {
    prototypeForm.value = {
      label: 'Conta Mercado Livre',
      affiliateTag: '',
      sessionCookie: '',
      partnerGatewayUrl: '',
      partnerGatewayApiKey: '',
    };
    return;
  }

  prototypeForm.value = {
    label: acc.label || 'Conta Mercado Livre',
    affiliateTag: acc.affiliateTag || '',
    sessionCookie: '',
    partnerGatewayUrl: acc.partnerGatewayUrl || '',
    partnerGatewayApiKey: '',
  };

  if (acc.oauthAppId) {
    oauthForm.value.appId = acc.oauthAppId;
  }
  if (acc.oauthRedirectUri) {
    oauthForm.value.redirectUri = acc.oauthRedirectUri;
  }
}

async function loadStatus() {
  try {
    const res = await api.get('/mercadolivre/status');
    const data = res.data?.data;
    if (data) {
      flags.value = data.featureFlags;
      accounts.value = data.accounts || [];
      syncFormsFromAccount(data.defaultAccount);
    }
    if (flags.value.ml_alternative_a_enabled) {
      await loadOffers();
    }
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao carregar status do Mercado Livre.',
      true,
    );
  }
}

async function toggleFlag(key: 'ml_alternative_a_enabled' | 'ml_alternative_b_enabled') {
  flagUpdating.value = key;
  const nextVal = !flags.value[key];
  try {
    const res = await api.patch('/feature-flags', { [key]: nextVal });
    flags.value = res.data.data.flags;
    showFeedback(
      `Feature flag atualizada: ${key === 'ml_alternative_b_enabled' ? 'Alternativa B' : 'Alternativa A'} ${nextVal ? 'habilitada' : 'desabilitada'}.`,
    );
    if (key === 'ml_alternative_a_enabled' && nextVal) {
      await loadOffers();
    }
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao atualizar feature flag.',
      true,
    );
  } finally {
    flagUpdating.value = null;
  }
}

async function savePrototypeConfig() {
  savingPrototype.value = true;
  try {
    await api.post('/mercadolivre/prototype/config', {
      id: defaultAccount.value?.id,
      label: prototypeForm.value.label || undefined,
      affiliateTag: prototypeForm.value.affiliateTag || undefined,
      sessionCookie: prototypeForm.value.sessionCookie || undefined,
      partnerGatewayUrl: prototypeForm.value.partnerGatewayUrl || null,
      partnerGatewayApiKey: prototypeForm.value.partnerGatewayApiKey || undefined,
    });
    showFeedback('Configuração Mercado Livre (Alternativa B) salva e validada com segurança!');
    await loadStatus();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Falha ao salvar configuração Mercado Livre.',
      true,
    );
  } finally {
    savingPrototype.value = false;
  }
}

function resetPrototypeForm() {
  syncFormsFromAccount(defaultAccount.value);
  testConversionResult.value = null;
}

async function removePrototypeConfig() {
  if (!confirm('Deseja realmente remover a tag e os cookies salvos do Mercado Livre?')) return;
  try {
    await api.delete('/mercadolivre/prototype/config', {
      params: { accountId: defaultAccount.value?.id },
    });
    pairingInfo.value = null;
    testConversionResult.value = null;
    showFeedback('Credenciais de sessão e tag do Mercado Livre removidas.');
    await loadStatus();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Falha ao remover configuração.',
      true,
    );
  }
}

async function generatePairingConnector() {
  pairingLoading.value = true;
  try {
    const res = await api.post('/mercadolivre/prototype/pairing-token', {
      accountId: defaultAccount.value?.id,
    });
    pairingInfo.value = res.data.data;
    copiedBookmarklet.value = false;
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao gerar token de pareamento.',
      true,
    );
  } finally {
    pairingLoading.value = false;
  }
}

async function copyBookmarklet() {
  if (!bookmarkletSnippet.value) return;
  await navigator.clipboard.writeText(bookmarkletSnippet.value);
  copiedBookmarklet.value = true;
  setTimeout(() => {
    copiedBookmarklet.value = false;
  }, 2500);
}

async function runTestConversion() {
  testingConversion.value = true;
  testConversionResult.value = null;
  try {
    const res = await api.post('/mercadolivre/prototype/test-conversion', {
      accountId: defaultAccount.value?.id,
      url: testConversionUrl.value.trim(),
    });
    testConversionResult.value = res.data.data;
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Falha ao testar conversão.',
      true,
    );
  } finally {
    testingConversion.value = false;
  }
}

// Alternativa A Handlers
async function saveOAuthCredentials() {
  savingOAuth.value = true;
  try {
    await api.post('/mercadolivre/oauth/credentials', {
      accountId: defaultAccount.value?.id,
      appId: oauthForm.value.appId.trim(),
      clientSecret: oauthForm.value.clientSecret.trim() || undefined,
      redirectUri: oauthForm.value.redirectUri.trim(),
    });
    oauthForm.value.clientSecret = '';
    showFeedback('Credenciais OAuth 2.0 salvas com segurança!');
    await loadStatus();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao salvar credenciais OAuth.',
      true,
    );
  } finally {
    savingOAuth.value = false;
  }
}

async function startOAuthAuthorization() {
  try {
    const res = await api.get('/mercadolivre/oauth/authorize-url', {
      params: { accountId: defaultAccount.value?.id },
    });
    window.location.href = res.data.data.authorizationUrl;
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao iniciar autorização OAuth.',
      true,
    );
  }
}

async function disconnectOAuth() {
  try {
    await api.delete('/mercadolivre/oauth/disconnect', {
      params: { accountId: defaultAccount.value?.id },
    });
    showFeedback('Conta OAuth Mercado Livre desconectada.');
    await loadStatus();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao desconectar OAuth.',
      true,
    );
  }
}

async function searchCatalog() {
  searchingCatalog.value = true;
  try {
    const res = await api.get('/mercadolivre/search', {
      params: {
        accountId: defaultAccount.value?.id,
        keyword: searchKeyword.value.trim(),
        limit: 12,
      },
    });
    searchResults.value = res.data.data.items || [];
    if (searchResults.value.length === 0) {
      showFeedback('Nenhum anúncio retornado para a palavra-chave informada.');
    }
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao pesquisar produtos no Mercado Livre.',
      true,
    );
  } finally {
    searchingCatalog.value = false;
  }
}

async function loadOffers() {
  try {
    const res = await api.get('/mercadolivre/offers');
    offers.value = res.data.data.items || [];
  } catch {
    // Silencioso se flag A estiver desabilitada
  }
}

function openOfferModal(product?: any) {
  offerForm.value = {
    mlItemId: product?.mlItemId || '',
    title: product?.title || '',
    price: product ? Number(product.price) : 0,
    originalPrice: product?.originalPrice ? Number(product.originalPrice) : null,
    imageUrl: product?.imageUrl || '',
    originalUrl: product?.permalink || '',
    affiliateShortUrl: '',
    sellerName: product?.sellerName || '',
    keyword: searchKeyword.value.trim() || '',
  };
  offerModalOpen.value = true;
}

async function saveOffer() {
  savingOffer.value = true;
  try {
    await api.post('/mercadolivre/offers', {
      accountId: defaultAccount.value?.id,
      mlItemId: offerForm.value.mlItemId || undefined,
      title: offerForm.value.title,
      price: offerForm.value.price,
      originalPrice: offerForm.value.originalPrice || undefined,
      imageUrl: offerForm.value.imageUrl,
      originalUrl: offerForm.value.originalUrl,
      affiliateShortUrl: offerForm.value.affiliateShortUrl,
      sellerName: offerForm.value.sellerName || undefined,
      keyword: offerForm.value.keyword || undefined,
    });
    offerModalOpen.value = false;
    showFeedback('Oferta Mercado Livre adicionada à fila com sucesso!');
    await loadOffers();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Falha ao cadastrar oferta Mercado Livre.',
      true,
    );
  } finally {
    savingOffer.value = false;
  }
}

async function toggleOfferActive(offer: any) {
  try {
    await api.patch(`/mercadolivre/offers/${offer.id}`, {
      isActive: !offer.isActive,
    });
    await loadOffers();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Falha ao atualizar status da oferta.',
      true,
    );
  }
}

async function deleteOffer(id: string) {
  try {
    await api.delete(`/mercadolivre/offers/${id}`);
    showFeedback('Oferta removida da fila.');
    await loadOffers();
  } catch (err: any) {
    showFeedback(
      err.response?.data?.error?.message || 'Erro ao excluir oferta.',
      true,
    );
  }
}

onMounted(async () => {
  await loadStatus();

  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const state = typeof route.query.state === 'string' ? route.query.state : '';
  if (code && state && flags.value.ml_alternative_a_enabled) {
    try {
      await api.post('/mercadolivre/oauth/exchange', {
        accountId: defaultAccount.value?.id,
        code,
        state,
      });
      showFeedback('Conta Mercado Livre autorizada via OAuth 2.0 com sucesso!');
      await loadStatus();
    } catch (err: any) {
      showFeedback(
        err.response?.data?.error?.message || 'Falha ao concluir callback OAuth do Mercado Livre.',
        true,
      );
    } finally {
      await router.replace({ path: '/mercadolivre' });
    }
  }
});
</script>
