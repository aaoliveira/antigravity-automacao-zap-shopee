import { UnauthorizedException, BadGatewayException } from '@nestjs/common';
import {
  classifyEvolutionSendError,
  computeCircuitCooldownMinutes,
  computeEffectiveInstanceDailyLimit,
  computeHumanizedGroupDelayMs,
  getStartOfDayInZone,
} from './instance-safety.helper';

describe('instance-safety.helper (Unit Tests)', () => {
  it('deve retornar o limite configurado integralmente quando warmUpEnabled estiver desabilitado', () => {
    const info = computeEffectiveInstanceDailyLimit({
      dailyMessageLimit: 120,
      warmUpEnabled: false,
      lastConnectedAt: new Date(),
    });

    expect(info.configuredLimit).toBe(120);
    expect(info.effectiveDailyLimit).toBe(120);
    expect(info.warmUpEnabled).toBe(false);
    expect(info.warmUpCapApplied).toBe(false);
    expect(info.warmUpStageDays).toBeNull();
  });

  it('deve aplicar rampa progressiva de warm-up (20 -> 40 -> 70 -> configurado) conforme idade da conexão', () => {
    const now = new Date('2026-11-15T12:00:00Z');

    const day0 = computeEffectiveInstanceDailyLimit(
      {
        dailyMessageLimit: 150,
        warmUpEnabled: true,
        lastConnectedAt: new Date('2026-11-15T08:00:00Z'),
      },
      now,
    );
    expect(day0.effectiveDailyLimit).toBe(20);
    expect(day0.warmUpCapApplied).toBe(true);
    expect(day0.warmUpStageDays).toBe(0);

    const day4 = computeEffectiveInstanceDailyLimit(
      {
        dailyMessageLimit: 150,
        warmUpEnabled: true,
        lastConnectedAt: new Date('2026-11-11T10:00:00Z'),
      },
      now,
    );
    expect(day4.effectiveDailyLimit).toBe(40);
    expect(day4.warmUpCapApplied).toBe(true);
    expect(day4.warmUpStageDays).toBe(4);

    const day10 = computeEffectiveInstanceDailyLimit(
      {
        dailyMessageLimit: 150,
        warmUpEnabled: true,
        lastConnectedAt: new Date('2026-11-05T10:00:00Z'),
      },
      now,
    );
    expect(day10.effectiveDailyLimit).toBe(70);
    expect(day10.warmUpCapApplied).toBe(true);

    const day15 = computeEffectiveInstanceDailyLimit(
      {
        dailyMessageLimit: 150,
        warmUpEnabled: true,
        lastConnectedAt: new Date('2026-10-31T10:00:00Z'),
      },
      now,
    );
    expect(day15.effectiveDailyLimit).toBe(150);
    expect(day15.warmUpCapApplied).toBe(false);
  });

  it('nunca deve exceder dailyMessageLimit configurado mesmo nos primeiros dias de warm-up', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const info = computeEffectiveInstanceDailyLimit(
      {
        dailyMessageLimit: 10,
        warmUpEnabled: true,
        lastConnectedAt: now,
      },
      now,
    );

    expect(info.effectiveDailyLimit).toBe(10);
    expect(info.warmUpCapApplied).toBe(false);
  });

  it('deve calcular corretamente o início do dia no fuso America/Sao_Paulo', () => {
    const ref = new Date('2026-11-11T15:30:00Z'); // 12:30:00 BRT (-03:00)
    const start = getStartOfDayInZone('America/Sao_Paulo', ref);
    // 00:00:00 BRT em UTC = 03:00:00Z
    expect(start.toISOString()).toBe('2026-11-11T03:00:00.000Z');
  });

  describe('computeHumanizedGroupDelayMs (Item 2)', () => {
    it('deve retornar zero após o último grupo ou quando ambos jitter e intervalo forem 0', () => {
      expect(
        computeHumanizedGroupDelayMs({
          baseJitterSeconds: 15,
          minIntervalSeconds: 15,
          sentIndex: 2,
          totalGroups: 3,
        }),
      ).toEqual({ jitterMs: 0, macroPauseMs: 0, totalDelayMs: 0 });

      expect(
        computeHumanizedGroupDelayMs({
          baseJitterSeconds: 0,
          minIntervalSeconds: 0,
          sentIndex: 0,
          totalGroups: 3,
        }),
      ).toEqual({ jitterMs: 0, macroPauseMs: 0, totalDelayMs: 0 });
    });

    it('deve aplicar piso mínimo da instância mesmo quando baseJitterSeconds for 0 e distribuir entre 0.7x e 1.6x', () => {
      const low = computeHumanizedGroupDelayMs({
        baseJitterSeconds: 0,
        minIntervalSeconds: 15,
        sentIndex: 0,
        totalGroups: 4,
        randomFn: () => 0,
      });
      expect(low.jitterMs).toBe(10500); // 15s * 0.7
      expect(low.macroPauseMs).toBe(0);

      const high = computeHumanizedGroupDelayMs({
        baseJitterSeconds: 10,
        minIntervalSeconds: 20, // minInterval 20 vence baseJitter 10
        sentIndex: 1,
        totalGroups: 4,
        randomFn: () => 1,
      });
      expect(high.jitterMs).toBe(32000); // 20s * 1.6
      expect(high.macroPauseMs).toBe(0);
    });

    it('deve adicionar macro-pausa humana (20s-45s) exatamente ao completar lote de 5 grupos quando ainda restarem envios', () => {
      const at5thLow = computeHumanizedGroupDelayMs({
        baseJitterSeconds: 10,
        minIntervalSeconds: 15,
        sentIndex: 4, // 5ª mensagem enviada
        totalGroups: 7,
        batchSize: 5,
        randomFn: () => 0,
      });
      expect(at5thLow.macroPauseMs).toBe(20000);
      expect(at5thLow.totalDelayMs).toBe(at5thLow.jitterMs + 20000);

      const at5thHigh = computeHumanizedGroupDelayMs({
        baseJitterSeconds: 10,
        minIntervalSeconds: 15,
        sentIndex: 4,
        totalGroups: 7,
        batchSize: 5,
        randomFn: () => 1,
      });
      expect(at5thHigh.macroPauseMs).toBe(45000);
    });
  });

  describe('classifyEvolutionSendError & computeCircuitCooldownMinutes (Item 3)', () => {
    it('não deve abortar lote em erros específicos de permissão/remoção de um grupo', () => {
      const c1 = classifyEvolutionSendError(
        new Error('Evolution API error: Contact is not in group (403)'),
      );
      expect(c1.scope).toBe('GROUP_PERM_ERROR');
      expect(c1.abortBatch).toBe(false);
      expect(c1.markInstanceDisconnected).toBe(false);

      const c2 = classifyEvolutionSendError(
        new Error('WhatsApp Group is restricted or bot was removed (403)'),
      );
      expect(c2.scope).toBe('GROUP_PERM_ERROR');
      expect(c2.abortBatch).toBe(false);
    });

    it('deve classificar 401/Connection Closed/logged out como INSTANCE_DISCONNECTED e abortar lote', () => {
      const c1 = classifyEvolutionSendError(
        new UnauthorizedException('Falha de autenticação na Evolution API (Status 401)'),
      );
      expect(c1.scope).toBe('INSTANCE_DISCONNECTED');
      expect(c1.abortBatch).toBe(true);
      expect(c1.markInstanceDisconnected).toBe(true);

      const c2 = classifyEvolutionSendError(new Error('Stream Errored: Connection Closed'));
      expect(c2.scope).toBe('INSTANCE_DISCONNECTED');
      expect(c2.abortBatch).toBe(true);
      expect(c2.markInstanceDisconnected).toBe(true);
    });

    it('deve classificar 429/rate-overlimit/502 como INSTANCE_RATE_LIMITED abortando lote sem desconectar sessão', () => {
      const c1 = classifyEvolutionSendError(
        new Error('Evolution API retornou status 429: rate-overlimit'),
      );
      expect(c1.scope).toBe('INSTANCE_RATE_LIMITED');
      expect(c1.abortBatch).toBe(true);
      expect(c1.markInstanceDisconnected).toBe(false);

      const c2 = classifyEvolutionSendError(
        new BadGatewayException('Não foi possível comunicar com o servidor da Evolution API'),
      );
      expect(c2.scope).toBe('INSTANCE_RATE_LIMITED');
      expect(c2.abortBatch).toBe(true);
      expect(c2.markInstanceDisconnected).toBe(false);
    });

    it('deve escalonar cooldown exponencialmente (15m -> 30m -> 60m)', () => {
      expect(computeCircuitCooldownMinutes(1)).toBe(15);
      expect(computeCircuitCooldownMinutes(2)).toBe(30);
      expect(computeCircuitCooldownMinutes(3)).toBe(60);
      expect(computeCircuitCooldownMinutes(5)).toBe(60);
    });
  });
});
