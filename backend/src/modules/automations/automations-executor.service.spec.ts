import { DispatchStrategy } from '@prisma/client';
import { AutomationsExecutorService } from './automations-executor.service';

describe('AutomationsExecutorService - Randomização de Disparos (Unit Tests)', () => {
  let executor: AutomationsExecutorService;

  beforeEach(() => {
    executor = new AutomationsExecutorService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeTargets = () => [
    { group: { id: 'g1', name: 'Grupo 1', isActive: true } },
    { group: { id: 'g2', name: 'Grupo 2', isActive: false } },
    { group: { id: 'g3', name: 'Grupo 3', isActive: true } },
    { group: { id: 'g4', name: 'Grupo 4', isActive: true } },
  ];

  it('deve preservar a ordem original em ALL_SEQUENTIAL', () => {
    const groups = makeTargets();
    const selected = executor.selectTargetGroups(
      groups,
      DispatchStrategy.ALL_SEQUENTIAL,
    );

    expect(selected.map((g) => g.group.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
  });

  it('deve retornar todos os grupos embaralhados sem perder nem duplicar nenhum em RANDOM_ORDER', () => {
    const groups = makeTargets();
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.4);

    const selected = executor.selectTargetGroups(
      groups,
      DispatchStrategy.RANDOM_ORDER,
    );

    expect(selected).toHaveLength(groups.length);
    expect(new Set(selected.map((g) => g.group.id))).toEqual(
      new Set(['g1', 'g2', 'g3', 'g4']),
    );
  });

  it('deve sortear exatamente 1 grupo ativo por execução em RANDOM_SINGLE', () => {
    const groups = makeTargets();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const selected = executor.selectTargetGroups(
      groups,
      DispatchStrategy.RANDOM_SINGLE,
    );

    expect(selected).toHaveLength(1);
    expect(selected[0].group.isActive).toBe(true);
    expect(selected[0].group.id).toBe('g4');
  });

  it('deve manter fallback se nenhum grupo estiver ativo em RANDOM_SINGLE para registro explícito de falha', () => {
    const inactiveGroups = [
      { group: { id: 'g1', name: 'Inativo 1', isActive: false } },
      { group: { id: 'g2', name: 'Inativo 2', isActive: false } },
    ];
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const selected = executor.selectTargetGroups(
      inactiveGroups,
      DispatchStrategy.RANDOM_SINGLE,
    );

    expect(selected).toHaveLength(1);
    expect(selected[0].group.id).toBe('g1');
  });
});

describe('AutomationsExecutorService - Item 1: Lock por Instância, Cooldown e Cota Real (Unit Tests)', () => {
  const buildExecutor = (overrides: {
    prisma?: any;
    queueService?: any;
    shopeeClient?: any;
    cryptoVault?: any;
    whatsappGroupsService?: any;
    schedulerService?: any;
  } = {}) => {
    const mockPrisma = {
      automation: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      automationExecution: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      publication: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'pub-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      productSnapshot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ...overrides.prisma,
    };

    const mockQueue = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
      getInstanceCooldownUntil: jest.fn().mockResolvedValue(null),
      setInstanceCooldown: jest.fn().mockResolvedValue(undefined),
      getAutomationQueue: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: 'retry-job-1' }),
      }),
      ...overrides.queueService,
    };

    const mockShopee = {
      searchProducts: jest.fn().mockResolvedValue({
        products: [
          {
            itemId: 'item-1',
            title: 'Produto Teste',
            price: 99.9,
            originalPrice: 129.9,
            imageUrl: 'https://img.example.com/1.jpg',
            productUrl: 'https://shopee.com.br/p/1',
            commissionRate: 0.1,
          },
        ],
      }),
      generateShortLink: jest.fn().mockResolvedValue('https://shope.ee/short1'),
      ...overrides.shopeeClient,
    };

    const mockCrypto = {
      decrypt: jest.fn().mockReturnValue('secret-value'),
      ...overrides.cryptoVault,
    };

    const mockGroups = {
      sendMediaToGroup: jest.fn().mockResolvedValue({ result: { key: { id: 'msg-1' } } }),
      ...overrides.whatsappGroupsService,
    };

    const mockScheduler = {
      isWithinScheduleWindow: jest.fn().mockReturnValue(true),
      calculateNextExecution: jest.fn().mockReturnValue(new Date(Date.now() + 3600_000)),
      ...overrides.schedulerService,
    };

    const executor = new AutomationsExecutorService(
      mockPrisma,
      mockQueue,
      mockShopee,
      mockCrypto,
      mockGroups,
      mockScheduler,
    );

    return { executor, mockPrisma, mockQueue, mockGroups, mockScheduler };
  };

  const baseAutomation = {
    id: 'auto-1',
    tenantId: 'tenant-1',
    instanceId: 'inst-1',
    platform: 'SHOPEE',
    status: 'ACTIVE',
    name: 'Promo',
    frequencyMinutes: 60,
    windowStartTime: '00:00',
    windowEndTime: '23:59',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    dailyExecutionLimit: 20,
    jitterSeconds: 0,
    dedupWindowDays: 7,
    dispatchStrategy: DispatchStrategy.ALL_SEQUENTIAL,
    tenant: { timezone: 'America/Sao_Paulo' },
    instance: {
      id: 'inst-1',
      displayName: 'Zap Principal',
      status: 'CONNECTED',
      dailyMessageLimit: 100,
      minIntervalSeconds: 0,
      warmUpEnabled: false,
      lastConnectedAt: new Date(),
      createdAt: new Date(),
      server: { baseUrl: 'http://evo', apiKeyEncrypted: 'enc' },
    },
    shopeeCredential: {
      isActive: true,
      appId: 'app-id',
      appSecretEncrypted: 'enc-sec',
    },
    keywords: [{ keyword: 'fone' }],
    groups: [
      { group: { id: 'g1', name: 'Grupo 1', jid: '1@g.us', isActive: true } },
      { group: { id: 'g2', name: 'Grupo 2', jid: '2@g.us', isActive: true } },
      { group: { id: 'g3', name: 'Grupo 3', jid: '3@g.us', isActive: true } },
    ],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve adquirir lock por instanceId e liberar ao concluir, reagendando retry quando lock da instância estiver ocupado', async () => {
    const queueAdd = jest.fn().mockResolvedValue({ id: 'retry-1' });
    const acquireLock = jest
      .fn()
      .mockResolvedValueOnce(true) // lock:automation:auto-1
      .mockResolvedValue(false); // lock:instance:inst-1 ocupado

    const { executor, mockQueue, mockGroups } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue(baseAutomation),
          update: jest.fn(),
        },
      },
      queueService: {
        acquireLock,
        getAutomationQueue: jest.fn().mockReturnValue({ add: queueAdd }),
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', false, {
      instanceLockWaitMs: 0,
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('ocupada');
    expect(mockGroups.sendMediaToGroup).not.toHaveBeenCalled();
    expect(queueAdd).toHaveBeenCalledWith(
      'execute-automation',
      expect.objectContaining({
        automationId: 'auto-1',
        tenantId: 'tenant-1',
        reason: 'instance_lock_retry',
      }),
      expect.objectContaining({ delay: expect.any(Number) }),
    );
    expect(mockQueue.releaseLock).toHaveBeenCalledWith(
      'lock:automation:auto-1',
      expect.any(String),
    );
  });

  it('deve abortar execução antes de disparar quando a instância atingir o limite diário real de mensagens', async () => {
    const { executor, mockGroups } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: { ...baseAutomation.instance, dailyMessageLimit: 50 },
          }),
          update: jest.fn(),
        },
        publication: {
          count: jest.fn().mockResolvedValue(50),
          create: jest.fn(),
          update: jest.fn(),
        },
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.success).toBe(false);
    expect(res.message).toContain('Limite diário de mensagens da instância atingido');
    expect(mockGroups.sendMediaToGroup).not.toHaveBeenCalled();
  });

  it('deve limitar os grupos-alvo à cota restante da instância sem exceder o teto diário (inclusive com warm-up ativo)', async () => {
    const { executor, mockGroups } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: {
              ...baseAutomation.instance,
              dailyMessageLimit: 100,
              warmUpEnabled: true,
              lastConnectedAt: new Date(), // Dia 0 -> teto warm-up 20
            },
          }),
          update: jest.fn(),
        },
        publication: {
          count: jest.fn().mockResolvedValue(18), // restam 2 de 20
          create: jest.fn().mockResolvedValue({ id: 'pub-x' }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.success).toBe(true);
    expect(mockGroups.sendMediaToGroup).toHaveBeenCalledTimes(2);
    expect(mockGroups.sendMediaToGroup).toHaveBeenNthCalledWith(
      1,
      'tenant-1',
      'g1',
      expect.any(Object),
    );
    expect(mockGroups.sendMediaToGroup).toHaveBeenNthCalledWith(
      2,
      'tenant-1',
      'g2',
      expect.any(Object),
    );
  });

  it('deve aguardar apenas o tempo restante do cooldown global da instância no Redis', async () => {
    const { executor, mockQueue } = buildExecutor({
      queueService: {
        getInstanceCooldownUntil: jest.fn().mockResolvedValue(Date.now() + 2500),
      },
    });
    const sleepSpy = jest
      .spyOn(executor as any, 'sleep')
      .mockResolvedValue(undefined);

    const waitedMs = await executor.waitForInstanceCooldown('inst-1', 15);

    expect(mockQueue.getInstanceCooldownUntil).toHaveBeenCalledWith('inst-1');
    expect(waitedMs).toBeGreaterThan(2000);
    expect(waitedMs).toBeLessThanOrEqual(2500);
    expect(sleepSpy).toHaveBeenCalledWith(waitedMs);
  });

  it('deve aplicar jitter humanizado aleatório e macro-pausa ao enviar para lote de 6 grupos (Item 2)', async () => {
    const sixGroups = Array.from({ length: 6 }, (_, idx) => ({
      group: {
        id: `g-${idx + 1}`,
        name: `Grupo ${idx + 1}`,
        jid: `${idx + 1}@g.us`,
        isActive: true,
      },
    }));

    const { executor, mockGroups, mockScheduler } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            jitterSeconds: 10,
            instance: { ...baseAutomation.instance, minIntervalSeconds: 15 },
            groups: sixGroups,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        publication: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'pub-batch' }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });

    const sleepSpy = jest
      .spyOn(executor as any, 'sleep')
      .mockResolvedValue(undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.success).toBe(true);
    expect(mockGroups.sendMediaToGroup).toHaveBeenCalledTimes(6);
    // Deve haver 5 intervalos entre 6 grupos
    expect(sleepSpy).toHaveBeenCalledTimes(5);
    const delays = sleepSpy.mock.calls.map((c) => c[0] as number);
    // Envios 1..4 apenas jitter [10.5s..24s] (com random=0.5 sobre max(10,15)=15 -> ~17250ms)
    expect(delays[0]).toBe(17250);
    // 5º intervalo inclui macro-pausa (20s..45s -> 32500ms em random=0.5) => 17250 + 32500 = 49750ms
    expect(delays[4]).toBe(49750);
    // Próxima execução agendada deve habilitar micro-variação
    expect(mockScheduler.calculateNextExecution).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Date),
      { applyMicroVariation: true },
    );
  });

  it('deve bloquear execução antes de consultar Shopee quando o Circuit Breaker da instância estiver aberto (Item 3)', async () => {
    const openUntil = new Date(Date.now() + 10 * 60_000);
    const { executor, mockPrisma, mockGroups } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: {
              ...baseAutomation.instance,
              circuitOpenUntil: openUntil,
              consecutiveSendFailures: 2,
              lastErrorReason: 'Evolution API retornou status 429: rate-overlimit',
            },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        automationExecution: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 'exec-cb-open' }),
          update: jest.fn().mockResolvedValue({}),
        },
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.success).toBe(false);
    expect(res.status).toBe('SKIPPED_INSTANCE_OFFLINE');
    expect(res.message).toContain('Circuit Breaker');
    expect(mockGroups.sendMediaToGroup).not.toHaveBeenCalled();
    expect(mockPrisma.automationExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SKIPPED_INSTANCE_OFFLINE',
          errorMessage: expect.stringContaining('rate-overlimit'),
        }),
      }),
    );
  });

  it('deve acionar Circuit Breaker e abortar os demais grupos imediatamente ao receber erro fatal/429 (Item 3)', async () => {
    const instanceUpdate = jest.fn().mockResolvedValue({});
    let calls = 0;
    const { executor, mockGroups, mockPrisma } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: {
              ...baseAutomation.instance,
              consecutiveSendFailures: 1, // já teve 1 falha -> próxima deve ir para 30min
              circuitOpenUntil: null,
            },
            groups: [
              { group: { id: 'g1', name: 'Grupo 1', jid: '1@g.us', isActive: true } },
              { group: { id: 'g2', name: 'Grupo 2', jid: '2@g.us', isActive: true } },
              { group: { id: 'g3', name: 'Grupo 3', jid: '3@g.us', isActive: true } },
              { group: { id: 'g4', name: 'Grupo 4', jid: '4@g.us', isActive: true } },
            ],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        whatsAppInstance: {
          update: instanceUpdate,
        },
      },
      whatsappGroupsService: {
        sendMediaToGroup: jest.fn().mockImplementation(async () => {
          calls++;
          if (calls === 1) {
            return { result: { key: { id: 'ok-1' } } };
          }
          throw new Error('Connection Closed - session logged out');
        }),
      },
    });

    const before = Date.now();
    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.status).toBe('PARTIAL_SUCCESS');
    // Grupo 1 OK (reseta falhas anteriores para 0), Grupo 2 Connection Closed -> +1 (=1, 15min); Grupos 3 e 4 NÃO devem ser chamados!
    expect(mockGroups.sendMediaToGroup).toHaveBeenCalledTimes(2);
    expect(instanceUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          consecutiveSendFailures: 0,
          circuitOpenUntil: null,
        }),
      }),
    );
    expect(instanceUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          consecutiveSendFailures: 1,
          status: 'DISCONNECTED',
          lastErrorReason: expect.stringContaining('Connection Closed'),
        }),
      }),
    );
    const updatedCircuitUntil: Date =
      instanceUpdate.mock.calls[1][0].data.circuitOpenUntil;
    const diffMins = (updatedCircuitUntil.getTime() - before) / 60_000;
    expect(diffMins).toBeGreaterThanOrEqual(14.5);
    expect(diffMins).toBeLessThanOrEqual(15.5);

    // Se falhar já na 1ª tentativa com consecutiveSendFailures=1, escala exponencialmente para 2 (30min)
    instanceUpdate.mockClear();
    const escalateExecutor = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: {
              ...baseAutomation.instance,
              consecutiveSendFailures: 1,
              circuitOpenUntil: null,
            },
            groups: [
              { group: { id: 'g1', name: 'Grupo 1', jid: '1@g.us', isActive: true } },
              { group: { id: 'g2', name: 'Grupo 2', jid: '2@g.us', isActive: true } },
            ],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        whatsAppInstance: { update: instanceUpdate },
      },
      whatsappGroupsService: {
        sendMediaToGroup: jest
          .fn()
          .mockRejectedValue(new Error('Evolution API retornou status 429: rate-overlimit')),
      },
    });
    const resEscalate = await escalateExecutor.executor.execute('auto-1', 'tenant-1', true);
    expect(resEscalate.status).toBe('FAILED');
    expect(escalateExecutor.mockGroups.sendMediaToGroup).toHaveBeenCalledTimes(1);
    const escalatedUntil: Date =
      instanceUpdate.mock.calls[0][0].data.circuitOpenUntil;
    expect((escalatedUntil.getTime() - before) / 60_000).toBeGreaterThanOrEqual(29.5);
    expect(mockPrisma.automationExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          successCount: 1,
          failureCount: 1,
          errorMessage: expect.stringContaining('Circuit Breaker acionado'),
        }),
      }),
    );
  });

  it('deve resetar contador de falhas do Circuit Breaker após publicação bem-sucedida', async () => {
    const instanceUpdate = jest.fn().mockResolvedValue({});
    const { executor } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            instance: {
              ...baseAutomation.instance,
              consecutiveSendFailures: 2,
              circuitOpenUntil: null,
              lastErrorReason: 'Timeout anterior',
            },
            groups: [
              { group: { id: 'g1', name: 'Grupo 1', jid: '1@g.us', isActive: true } },
            ],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        whatsAppInstance: {
          update: instanceUpdate,
        },
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', true);
    expect(res.success).toBe(true);
    expect(instanceUpdate).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: {
        consecutiveSendFailures: 0,
        circuitOpenUntil: null,
        lastErrorReason: null,
      },
    });
  });

  it('deve desativar automaticamente o grupo em erro permanente de permissão/remoção sem abortar os demais grupos (Item 5)', async () => {
    const groupUpdate = jest.fn().mockResolvedValue({});
    let calls = 0;
    const { executor, mockGroups } = buildExecutor({
      prisma: {
        automation: {
          findFirst: jest.fn().mockResolvedValue({
            ...baseAutomation,
            groups: [
              { group: { id: 'g1', name: 'Grupo Bloqueado', jid: '1@g.us', isActive: true } },
              { group: { id: 'g2', name: 'Grupo Normal', jid: '2@g.us', isActive: true } },
            ],
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        whatsAppGroup: {
          update: groupUpdate,
        },
      },
      whatsappGroupsService: {
        sendMediaToGroup: jest.fn().mockImplementation(async () => {
          calls++;
          if (calls === 1) {
            throw new Error('Evolution API error: Contact is not in group (403)');
          }
          return { result: { key: { id: 'msg-g2-ok' } } };
        }),
      },
    });

    const res = await executor.execute('auto-1', 'tenant-1', true);

    expect(res.status).toBe('PARTIAL_SUCCESS');
    expect(mockGroups.sendMediaToGroup).toHaveBeenCalledTimes(2);
    expect(groupUpdate).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: {
        isActive: false,
        sendBlockedReason: 'Evolution API error: Contact is not in group (403)',
      },
    });
  });
});
