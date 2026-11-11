# ADR-010: Blindagem Anti-Banimento WhatsApp / Evolution API nas Automações

- **Status:** Aprovado e Implementado
- **Data:** 2026-11-11
- **Contexto:** Com múltiplas automações rodando em paralelo (BullMQ `concurrency: 5`) sobre a mesma instância WhatsApp, intervalos determinísticos (`jitterSeconds * 1000` e `nextExecutionAt` exato), ausência de limite real por chip e insistência cega em erros `429`/sessão ou grupos bloqueados, havia risco elevado de banimento ou suspensão de números na Evolution API v2 (`evoapicloud/evolution-api:v2.3.7`).

---

## 1. Decisões Arquiteturais Implementadas em 5 Etapas Incrementais

1. **Lock Global por Instância, Cooldown Inter-Automações e Cota Real por `WhatsAppInstance` (Item 1):**
   - `AutomationsExecutorService` adquire `lock:instance:${instanceId}` no Redis (além de `lock:automation:${automationId}`), serializando múltiplas automações que compartilham o mesmo número com re-enfileiramento atrasado em contenção (`enqueueDelayedInstanceRetry`) e aborto limpo em *shutdown* (`OnModuleDestroy`).
   - Cooldown mínimo global (`cooldown:instance:${instanceId}` no Redis com `minIntervalSeconds`, padrão `15s`) impede rajadas entre automações distintas.
   - Contagem diária real de mensagens sobre `Publication` (`status = SUCCESS`, `sentAt >= startOfDay`, filtro estrito por `tenantId` e `instanceId`), respeitando `dailyMessageLimit` (padrão `100`) e modo **Warm-up Progressivo** (`warmUpEnabled`: `20 -> 40 -> 70 -> configuredLimit` até 14 dias via `computeEffectiveInstanceDailyLimit`).
   - Endpoint `PATCH /api/whatsapp-instances/:id/safety-settings` (validação `minIntervalSeconds >= 5`, `dailyMessageLimit` 1–2000).

2. **Jitter Humanizado Aleatório, Macro-Pausa em Lotes e Micro-Variação de Agendamento (Item 2):**
   - `computeHumanizedGroupDelayMs` substitui o delay fixo por distribuição aleatória `[0,7x; 1,6x]` em torno de `max(jitterSeconds, minIntervalSeconds)` + **macro-pausa de 20s–45s** a cada lote de 5 grupos.
   - `AutomationsSchedulerService.calculateNextExecution` aplica micro-variação (`±12%`) em execuções recorrentes (`applyMicroVariation: true`) preservando estritamente `windowStartTime`, `windowEndTime` e `daysOfWeek`.

3. **Circuit Breaker da Evolution API e Alerta no Dashboard (Item 3):**
   - Persistidos `circuitOpenUntil`, `consecutiveSendFailures` e `lastErrorReason` em `WhatsAppInstance`.
   - `classifyEvolutionSendError` separa erros específicos de grupo (`GROUP_PERM_ERROR`) de falhas fatais de sessão (`401`, `Connection Closed`, `logged out`, `banned` → `INSTANCE_DISCONNECTED`) e saturação/gateway (`429`, `rate-overlimit`, `502` → `INSTANCE_RATE_LIMITED`).
   - Erros fatais/429 abortam o restante do lote na hora (evitando insistir nos demais grupos), abrem cooldown exponencial (`15m -> 30m -> 60m`) e exibem alerta no `DashboardService.getSummary` (`alerts.openCircuits`) com reset via reconexão (`getStatus`/webhook) ou `POST /api/whatsapp-instances/:id/reset-circuit`.

4. **Spintax Nativo, `fileName` Dinâmico e `delay` Oficial Verificado (Item 4):**
   - `EvolutionClient.resolveSpintax` resolve blocos `{opção A|opção B}` (inclusive aninhados) antes da interpolação de variáveis para evitar colisão com `{titulo}`/`{{cupom}}`, executado por grupo em `sendMediaToGroup`.
   - `fileName` dinâmico por plataforma/produto (`oferta-{shopee|ml}-{itemId}`) substitui o antigo nome fixo `'oferta-shopee.jpg'`.
   - Verificado na documentação oficial da Evolution API v2 (`https://docs.evolutionfoundation.com.br/evolution-api`) que `POST /message/sendMedia/{instanceName}` suporta `delay` inteiro (ms), registrado em `EVOLUTION_API_CONTRACTS.md` e `INTEGRATIONS.md`.

5. **Permissões de Grupo (`announce`/`restrict`), Auto-Bloqueio e Indicadores na UI (Item 5):**
   - `WhatsAppGroup` armazena `isAnnounceOnly`, `isRestricted` (sincronizados de `fetchAllGroups`) e `sendBlockedReason`.
   - Erros permanentes de permissão/remoção por grupo (`GROUP_PERM_ERROR`) desativam apenas aquele grupo automaticamente sem interromper o restante da esteira, permitindo reativação via `PATCH /api/whatsapp-groups/:id`.
   - UI atualizada em `DashboardView.vue`, `WhatsAppInstancesView.vue` e `AutomationsView.vue` com cota diária, modal de *Warm-up*, controle do Circuit Breaker, badges de grupo e Termômetro Anti-Banimento dinâmico no Wizard.

---

## 2. Consequências

- **Positivas:** Redução drástica do risco de banimento sem sacrificar multi-tenancy ou precisão das publicações individuais, com transparência total para o operador na interface web.
- **Cuidados Operacionais:** Instâncias em *Warm-up* reduzem automaticamente o teto diário durante os 14 primeiros dias após `lastConnectedAt`; operadores podem ajustar limites por instância em **WhatsApp & Evolution -> Proteção Anti-Ban**.
