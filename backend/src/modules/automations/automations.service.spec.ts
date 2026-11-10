import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AutomationStatus, DispatchStrategy } from '@prisma/client';
import { AutomationsService } from './automations.service';

describe('AutomationsService - Edição Restrita a Automações Pausadas/Inativas (Unit Tests)', () => {
  let service: AutomationsService;
  let mockPrisma: any;
  let mockSchedulerService: any;

  const tenantA = 'tenant-a-111';
  const tenantB = 'tenant-b-222';
  const automationId = 'auto-111';

  const makeAutomation = (status: AutomationStatus = AutomationStatus.PAUSED) => ({
    id: automationId,
    tenantId: tenantA,
    instanceId: 'inst-1',
    shopeeCredentialId: 'cred-1',
    groupRedirectLinkId: null,
    name: 'Campanha Teste',
    status,
    dispatchStrategy: DispatchStrategy.ALL_SEQUENTIAL,
    captionTemplate: null,
    frequencyMinutes: 60,
    dailyExecutionLimit: 20,
    jitterSeconds: 10,
    windowStartTime: '08:00',
    windowEndTime: '22:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    dedupWindowDays: 7,
    keywords: [{ id: 'kw-1', keyword: 'fone' }],
    groups: [{ groupId: 'grp-1', group: { id: 'grp-1', name: 'Grupo 1' } }],
  });

  beforeEach(() => {
    mockPrisma = {
      automation: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      automationKeyword: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      automationGroup: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      whatsAppInstance: {
        findFirst: jest.fn(),
      },
      shopeeCredential: {
        findFirst: jest.fn(),
      },
      whatsAppGroup: {
        findMany: jest.fn(),
      },
      groupRedirectLink: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    mockSchedulerService = {
      calculateNextExecution: jest.fn().mockReturnValue(new Date('2026-11-11T10:00:00Z')),
    };

    service = new AutomationsService(mockPrisma, mockSchedulerService);
  });

  it('deve BLOQUEAR edição de automação com status ACTIVE lançando ConflictException (409)', async () => {
    mockPrisma.automation.findFirst.mockResolvedValue(
      makeAutomation(AutomationStatus.ACTIVE),
    );

    await expect(
      service.update(tenantA, automationId, { name: 'Novo Nome' }),
    ).rejects.toThrow(ConflictException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.automation.update).not.toHaveBeenCalled();
  });

  it('deve BLOQUEAR edição de automação com status DELETED lançando ConflictException (409)', async () => {
    mockPrisma.automation.findFirst.mockResolvedValue(
      makeAutomation(AutomationStatus.DELETED),
    );

    await expect(
      service.update(tenantA, automationId, { name: 'Reativar Invalido' }),
    ).rejects.toThrow(ConflictException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('deve PERMITIR edição completa quando automação estiver PAUSED mantendo-a PAUSED', async () => {
    mockPrisma.automation.findFirst.mockResolvedValue(
      makeAutomation(AutomationStatus.PAUSED),
    );
    mockPrisma.whatsAppGroup.findMany.mockResolvedValue([
      { id: 'grp-2', tenantId: tenantA, instanceId: 'inst-1' },
    ]);
    mockPrisma.groupRedirectLink.findFirst.mockResolvedValue({
      id: 'link-1',
      tenantId: tenantA,
    });
    mockPrisma.automation.update.mockResolvedValue({
      ...makeAutomation(AutomationStatus.PAUSED),
      name: 'Campanha Editada',
      frequencyMinutes: 90,
      dispatchStrategy: DispatchStrategy.RANDOM_ORDER,
      groupRedirectLinkId: 'link-1',
    });

    const updated = await service.update(tenantA, automationId, {
      name: 'Campanha Editada',
      keywords: ['smartwatch', 'airfryer'],
      groupIds: ['grp-2'],
      frequencyMinutes: 90,
      dispatchStrategy: 'RANDOM_ORDER',
      groupRedirectLinkId: 'link-1',
      captionTemplate: '🔥 {titulo} - {link_grupo}',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.automationKeyword.deleteMany).toHaveBeenCalledWith({
      where: { automationId },
    });
    expect(mockPrisma.automationKeyword.createMany).toHaveBeenCalledWith({
      data: [
        { automationId, keyword: 'smartwatch' },
        { automationId, keyword: 'airfryer' },
      ],
    });
    expect(mockPrisma.automationGroup.deleteMany).toHaveBeenCalledWith({
      where: { automationId },
    });
    expect(mockPrisma.automation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: automationId },
        data: expect.objectContaining({
          name: 'Campanha Editada',
          frequencyMinutes: 90,
          dispatchStrategy: DispatchStrategy.RANDOM_ORDER,
          groupRedirectLinkId: 'link-1',
        }),
      }),
    );
    expect(updated.status).toBe(AutomationStatus.PAUSED);
  });

  it('deve exigir grupos da nova instância se instanceId for alterado na edição', async () => {
    mockPrisma.automation.findFirst.mockResolvedValue(
      makeAutomation(AutomationStatus.PAUSED),
    );
    mockPrisma.whatsAppInstance.findFirst.mockResolvedValue({
      id: 'inst-2',
      tenantId: tenantA,
    });

    await expect(
      service.update(tenantA, automationId, { instanceId: 'inst-2' }),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('MULTI-TENANCY: deve lançar NotFoundException (404) antes de checar status se pertencer a outro tenant', async () => {
    mockPrisma.automation.findFirst.mockResolvedValue(null);

    await expect(
      service.update(tenantB, automationId, { name: 'Hack' }),
    ).rejects.toThrow(NotFoundException);
  });
});
