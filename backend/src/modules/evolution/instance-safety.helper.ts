export interface InstanceDailyLimitBreakdown {
  configuredLimit: number;
  effectiveDailyLimit: number;
  warmUpEnabled: boolean;
  warmUpStageDays: number | null;
  warmUpCapApplied: boolean;
  warmUpRecommendedCap: number | null;
}

/**
 * Calcula a data/hora correspondente à meia-noite (00:00:00) no fuso horário informado.
 */
export function getStartOfDayInZone(
  timeZone: string,
  referenceDate: Date = new Date(),
): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(referenceDate);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const elapsedMs =
      ((Number.parseInt(map.hour || '0', 10) % 24) * 3600 +
        Number.parseInt(map.minute || '0', 10) * 60 +
        Number.parseInt(map.second || '0', 10)) *
      1000;
    return new Date(referenceDate.getTime() - elapsedMs);
  } catch {
    const fallback = new Date(referenceDate);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
}

function toValidDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calcula o limite diário efetivo de mensagens da instância WhatsApp,
 * aplicando teto progressivo caso o modo de aquecimento (Warm-up) esteja habilitado.
 */
export function computeEffectiveInstanceDailyLimit(
  instance: {
    dailyMessageLimit?: number | null;
    warmUpEnabled?: boolean | null;
    lastConnectedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
  now: Date = new Date(),
): InstanceDailyLimitBreakdown {
  const configuredLimit = Math.max(1, instance.dailyMessageLimit ?? 100);
  const warmUpEnabled = Boolean(instance.warmUpEnabled);

  if (!warmUpEnabled) {
    return {
      configuredLimit,
      effectiveDailyLimit: configuredLimit,
      warmUpEnabled: false,
      warmUpStageDays: null,
      warmUpCapApplied: false,
      warmUpRecommendedCap: null,
    };
  }

  const refDate =
    toValidDate(instance.lastConnectedAt) ??
    toValidDate(instance.createdAt) ??
    now;

  const warmUpStageDays = Math.max(
    0,
    Math.floor((now.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000)),
  );

  let warmUpCap = configuredLimit;
  let warmUpRecommendedCap: number | null = null;

  if (warmUpStageDays < 3) {
    warmUpCap = 20;
    warmUpRecommendedCap = 20;
  } else if (warmUpStageDays < 7) {
    warmUpCap = 40;
    warmUpRecommendedCap = 40;
  } else if (warmUpStageDays < 14) {
    warmUpCap = 70;
    warmUpRecommendedCap = 70;
  }

  const effectiveDailyLimit = Math.min(configuredLimit, warmUpCap);

  return {
    configuredLimit,
    effectiveDailyLimit,
    warmUpEnabled: true,
    warmUpStageDays,
    warmUpCapApplied: effectiveDailyLimit < configuredLimit,
    warmUpRecommendedCap,
  };
}

export interface HumanizedDelayOptions {
  baseJitterSeconds: number;
  minIntervalSeconds?: number;
  sentIndex: number;
  totalGroups: number;
  batchSize?: number;
  randomFn?: () => number;
}

export interface HumanizedDelayPlan {
  jitterMs: number;
  macroPauseMs: number;
  totalDelayMs: number;
}

/**
 * Calcula intervalo humanizado realmente aleatório entre disparos consecutivos para grupos,
 * incluindo piso mínimo de segurança (quando configurado na instância) e macro-pausa periódica em lotes.
 */
export function computeHumanizedGroupDelayMs(
  options: HumanizedDelayOptions,
): HumanizedDelayPlan {
  const {
    baseJitterSeconds,
    minIntervalSeconds = 0,
    sentIndex,
    totalGroups,
    batchSize = 5,
    randomFn = Math.random,
  } = options;

  if (sentIndex < 0 || sentIndex >= totalGroups - 1) {
    return { jitterMs: 0, macroPauseMs: 0, totalDelayMs: 0 };
  }

  const safeBase = Math.max(0, baseJitterSeconds || 0);
  const safeMinInterval = Math.max(0, minIntervalSeconds || 0);

  if (safeBase === 0 && safeMinInterval === 0) {
    return { jitterMs: 0, macroPauseMs: 0, totalDelayMs: 0 };
  }

  const effectiveBaseSeconds = Math.max(safeBase, safeMinInterval);
  const minMs = Math.round(effectiveBaseSeconds * 1000 * 0.7);
  const maxMs = Math.round(effectiveBaseSeconds * 1000 * 1.6);

  const rand1 = Math.min(1, Math.max(0, randomFn()));
  const jitterMs = Math.round(minMs + rand1 * Math.max(0, maxMs - minMs));

  let macroPauseMs = 0;
  const safeBatchSize = Math.max(2, batchSize);
  if ((sentIndex + 1) % safeBatchSize === 0) {
    const rand2 = Math.min(1, Math.max(0, randomFn()));
    if (effectiveBaseSeconds >= 5) {
      // Lote padrão de produção: macro-pausa humana de 20s a 45s a cada N grupos
      macroPauseMs = Math.round(20_000 + rand2 * 25_000);
    } else {
      macroPauseMs = Math.round(
        effectiveBaseSeconds * 1000 * (2 + rand2 * 1.5),
      );
    }
  }

  return {
    jitterMs,
    macroPauseMs,
    totalDelayMs: jitterMs + macroPauseMs,
  };
}

export type EvolutionErrorScope =
  | 'INSTANCE_DISCONNECTED'
  | 'INSTANCE_RATE_LIMITED'
  | 'GROUP_PERM_ERROR'
  | 'TRANSIENT_OR_UNKNOWN';

export interface EvolutionErrorClassification {
  scope: EvolutionErrorScope;
  abortBatch: boolean;
  markInstanceDisconnected: boolean;
  reason: string;
}

/**
 * Classifica erros retornados pela Evolution API / Baileys para decidir se o Circuit Breaker
 * deve abortar os disparos restantes na mesma execução e/ou desconectar a instância.
 */
export function classifyEvolutionSendError(
  err: any,
): EvolutionErrorClassification {
  const rawMessage =
    typeof err === 'string'
      ? err
      : err?.message || err?.response?.message || String(err || 'Erro desconhecido');
  const msg = String(rawMessage).toLowerCase();
  const statusCode =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.getStatus === 'function'
        ? err.getStatus()
        : undefined;

  // 1. Erros específicos de um único grupo (não devem interromper envios aos demais grupos)
  const isGroupSpecific =
    msg.includes('not in group') ||
    msg.includes('not a participant') ||
    msg.includes('group is restricted') ||
    msg.includes('bot was removed') ||
    msg.includes('group not found') ||
    msg.includes('only admins') ||
    msg.includes('apenas administradores') ||
    msg.includes('somente admin') ||
    msg.includes('announce') ||
    (msg.includes('grupo') && msg.includes('inativo'));

  if (isGroupSpecific) {
    return {
      scope: 'GROUP_PERM_ERROR',
      abortBatch: false,
      markInstanceDisconnected: false,
      reason: String(rawMessage),
    };
  }

  // 2. Erros fatais de sessão / autenticação / banimento da instância
  const isInstanceDisconnected =
    statusCode === 401 ||
    (statusCode === 403 && !isGroupSpecific) ||
    msg.includes('status 401') ||
    msg.includes('unauthorized') ||
    msg.includes('falha de autenticação na evolution') ||
    msg.includes('connection closed') ||
    msg.includes('logged out') ||
    msg.includes('device_removed') ||
    msg.includes('stream:error') ||
    msg.includes('session closed') ||
    msg.includes('not connected') ||
    msg.includes('não está conectada') ||
    msg.includes('instância não encontrada na evolution') ||
    msg.includes('instance not found') ||
    msg.includes('temporarily banned') ||
    msg.includes('account banned') ||
    (msg.includes('banned') &&
      (msg.includes('whatsapp') || msg.includes('number') || msg.includes('account')));

  if (isInstanceDisconnected) {
    return {
      scope: 'INSTANCE_DISCONNECTED',
      abortBatch: true,
      markInstanceDisconnected: true,
      reason: String(rawMessage),
    };
  }

  // 3. Erros globais de rate-limit, flood ou indisponibilidade do gateway Evolution
  const isRateLimitedOrUnavailable =
    statusCode === 429 ||
    statusCode === 502 ||
    msg.includes('status 429') ||
    msg.includes('too many requests') ||
    msg.includes('rate-overlimit') ||
    msg.includes('rate limit') ||
    msg.includes('overlimit') ||
    msg.includes('flood') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('não foi possível comunicar com o servidor da evolution') ||
    msg.includes('fetch failed');

  if (isRateLimitedOrUnavailable) {
    return {
      scope: 'INSTANCE_RATE_LIMITED',
      abortBatch: true,
      markInstanceDisconnected: false,
      reason: String(rawMessage),
    };
  }

  return {
    scope: 'TRANSIENT_OR_UNKNOWN',
    abortBatch: false,
    markInstanceDisconnected: false,
    reason: String(rawMessage),
  };
}

/**
 * Calcula o tempo de cooldown exponencial (em minutos) para o Circuit Breaker da instância.
 * Progressão: 15 min -> 30 min -> 60 min (teto máximo).
 */
export function computeCircuitCooldownMinutes(
  consecutiveFailures: number,
): number {
  const safeCount = Math.max(1, consecutiveFailures || 1);
  return Math.min(60, 15 * Math.pow(2, safeCount - 1));
}
