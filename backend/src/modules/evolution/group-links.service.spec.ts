import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GroupLinkStrategy, InstanceStatus } from '@prisma/client';
import { GroupLinksService } from './group-links.service';

describe('GroupLinksService - Unit Tests', () => {
  let service: GroupLinksService;
  let mockPrisma: any;
  let mockCryptoVault: any;
  let mockEvolutionClient: any;

  const tenantA = 'tenant-aaa-111';
  const tenantB = 'tenant-bbb-222';

  const makeGroup = (overrides: Partial<any> = {}) => ({
    id: 'group-1',
    tenantId: tenantA,
    name: 'Ofertas VIP #1',
    jid: '120363000000001@g.us',
    participantCount: 100,
    maxParticipants: 1024,
    inviteUrl: 'https://chat.whatsapp.com/AbCdEfGhIj1',
    isActive: true,
    instanceId: 'inst-1',
    instance: {
      id: 'inst-1',
      displayName: 'WhatsApp Principal',
      instanceName: 'shopee-vip',
      status: InstanceStatus.CONNECTED,
      server: {
        baseUrl: 'http://localhost:8080',
        apiKeyEncrypted: 'enc-key',
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      groupRedirectLink: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      groupRedirectTarget: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      whatsAppGroup: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(mockPrisma);
      }),
    };

    mockCryptoVault = {
      decrypt: jest.fn().mockReturnValue('plain-evolution-key'),
    };

    mockEvolutionClient = {
      findGroupInfos: jest.fn().mockResolvedValue(null),
      getGroupInviteCode: jest.fn().mockResolvedValue(null),
    };

    service = new GroupLinksService(
      mockPrisma,
      mockCryptoVault,
      mockEvolutionClient,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Multi-Tenancy e Segurança contra Open Redirect', () => {
    it('deve rejeitar criação quando um ou mais grupos pertencem a outro tenant', async () => {
      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue(null);
      // Simula que o tenantA só possui 1 dos 2 grupos informados
      mockPrisma.whatsAppGroup.findMany.mockResolvedValue([
        makeGroup({ id: 'group-a1', tenantId: tenantA }),
      ]);

      await expect(
        service.create(tenantA, {
          name: 'Clube VIP',
          slug: 'clube-vip',
          targets: [
            { groupId: 'group-a1' },
            { groupId: 'group-from-tenant-b' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar URLs externas não oficiais (proteção Open Redirect / Phishing)', async () => {
      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue(null);
      mockPrisma.whatsAppGroup.findMany.mockResolvedValue([
        makeGroup({ id: 'group-1', tenantId: tenantA }),
      ]);

      await expect(
        service.create(tenantA, {
          name: 'Clube VIP',
          slug: 'clube-vip',
          targets: [
            {
              groupId: 'group-1',
              inviteUrl: 'https://evil-phishing.com/whatsapp-fake',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException ao tentar acessar link de outro tenant', async () => {
      mockPrisma.groupRedirectLink.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantB, 'link-tenant-a')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.groupRedirectLink.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'link-tenant-a', tenantId: tenantB },
        }),
      );
    });

    it('deve rejeitar criação de slug duplicado com ConflictException', async () => {
      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue({
        id: 'existing-id',
        slug: 'clube-vip',
      });

      await expect(
        service.create(tenantA, {
          name: 'Clube VIP',
          slug: 'clube-vip',
          targets: [{ groupId: 'group-1' }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resolvePublicRedirect - Estratégia LEAST_FILLED (próximo grupo mais vazio)', () => {
    it('deve detectar grupo lotado via Evolution API e direcionar para o próximo grupo mais vazio', async () => {
      const group1 = makeGroup({
        id: 'g1',
        name: 'VIP #1 (Vai Lotar)',
        jid: '111@g.us',
        participantCount: 99,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/InviteGroup001',
      });
      const group2 = makeGroup({
        id: 'g2',
        name: 'VIP #2 (Quase Cheio)',
        jid: '222@g.us',
        participantCount: 80,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/InviteGroup002',
      });
      const group3 = makeGroup({
        id: 'g3',
        name: 'VIP #3 (Mais Vazio)',
        jid: '333@g.us',
        participantCount: 15,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/InviteGroup003',
      });

      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue({
        id: 'link-1',
        tenantId: tenantA,
        name: 'Grupo Ofertas Shopee',
        slug: 'ofertas-shopee',
        strategy: GroupLinkStrategy.LEAST_FILLED,
        maxParticipants: 100,
        isActive: true,
        currentGroupId: 'g1',
        targets: [
          {
            id: 't1',
            groupId: 'g1',
            inviteUrl: group1.inviteUrl,
            maxParticipants: 100,
            priority: 0,
            isEnabled: true,
            group: group1,
          },
          {
            id: 't2',
            groupId: 'g2',
            inviteUrl: group2.inviteUrl,
            maxParticipants: 100,
            priority: 1,
            isEnabled: true,
            group: group2,
          },
          {
            id: 't3',
            groupId: 'g3',
            inviteUrl: group3.inviteUrl,
            maxParticipants: 100,
            priority: 2,
            isEnabled: true,
            group: group3,
          },
        ],
      });

      // Evolution API informa em tempo real que g1 atingiu o limite (100), g2 tem 82 e g3 tem 12
      mockEvolutionClient.findGroupInfos.mockImplementation(
        async (_url: string, _key: string, _inst: string, jid: string) => {
          if (jid === '111@g.us') return { id: jid, subject: group1.name, size: 100 };
          if (jid === '222@g.us') return { id: jid, subject: group2.name, size: 82 };
          if (jid === '333@g.us') return { id: jid, subject: group3.name, size: 12 };
          return null;
        },
      );

      mockPrisma.groupRedirectLink.update.mockResolvedValue({});
      mockPrisma.groupRedirectTarget.update.mockResolvedValue({});

      const result = await service.resolvePublicRedirect('ofertas-shopee');

      expect(result.available).toBe(true);
      expect(result.switchedGroup).toBe(true);
      expect(result.groupName).toBe('VIP #3 (Mais Vazio)');
      expect(result.inviteUrl).toBe('https://chat.whatsapp.com/InviteGroup003');
      expect(result.participantCount).toBe(12);
      expect(mockPrisma.groupRedirectLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'link-1' },
          data: expect.objectContaining({
            currentGroupId: 'g3',
          }),
        }),
      );
      expect(mockPrisma.groupRedirectTarget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't3' },
        }),
      );
    });

    it('deve retornar available=false quando todos os grupos vinculados estiverem lotados', async () => {
      const fullGroup = makeGroup({
        id: 'g-full',
        name: 'VIP Lotado',
        participantCount: 500,
        maxParticipants: 500,
        inviteUrl: 'https://chat.whatsapp.com/InviteFull001',
        instance: { status: InstanceStatus.DISCONNECTED },
      });

      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue({
        id: 'link-full',
        tenantId: tenantA,
        name: 'Clube Lotado',
        slug: 'clube-lotado',
        strategy: GroupLinkStrategy.LEAST_FILLED,
        maxParticipants: 500,
        isActive: true,
        currentGroupId: 'g-full',
        targets: [
          {
            id: 't-full',
            groupId: 'g-full',
            inviteUrl: fullGroup.inviteUrl,
            maxParticipants: 500,
            priority: 0,
            isEnabled: true,
            group: fullGroup,
          },
        ],
      });

      const result = await service.resolvePublicRedirect('clube-lotado');

      expect(result.available).toBe(false);
      expect(result.inviteUrl).toBeNull();
      expect(result.message).toContain('atingiram o limite máximo');
    });
  });

  describe('resolvePublicRedirect - MANUAL_WITH_FALLBACK e RANDOM_AVAILABLE', () => {
    it('deve manter o grupo manual selecionado enquanto não lotar e fazer failover quando atingir o limite', async () => {
      const gManual = makeGroup({
        id: 'g-manual',
        name: 'Grupo Manual',
        participantCount: 40,
        maxParticipants: 50,
        inviteUrl: 'https://chat.whatsapp.com/ManualGroup01',
        instance: { status: InstanceStatus.DISCONNECTED },
      });
      const gReserve = makeGroup({
        id: 'g-reserve',
        name: 'Grupo Reserva Mais Vazio',
        participantCount: 5,
        maxParticipants: 50,
        inviteUrl: 'https://chat.whatsapp.com/ReserveGroup2',
        instance: { status: InstanceStatus.DISCONNECTED },
      });

      const linkRecord = {
        id: 'link-manual',
        tenantId: tenantA,
        name: 'Link Manual',
        slug: 'link-manual',
        strategy: GroupLinkStrategy.MANUAL_WITH_FALLBACK,
        maxParticipants: 50,
        isActive: true,
        currentGroupId: 'g-manual',
        targets: [
          {
            id: 'tm',
            groupId: 'g-manual',
            inviteUrl: gManual.inviteUrl,
            maxParticipants: 50,
            priority: 0,
            isEnabled: true,
            group: gManual,
          },
          {
            id: 'tr',
            groupId: 'g-reserve',
            inviteUrl: gReserve.inviteUrl,
            maxParticipants: 50,
            priority: 1,
            isEnabled: true,
            group: gReserve,
          },
        ],
      };

      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue(linkRecord);
      mockPrisma.groupRedirectLink.update.mockResolvedValue({});
      mockPrisma.groupRedirectTarget.update.mockResolvedValue({});

      // 1ª chamada: gManual (40/50) ainda está abaixo do limite -> deve manter gManual
      const firstResult = await service.resolvePublicRedirect('link-manual');
      expect(firstResult.available).toBe(true);
      expect(firstResult.switchedGroup).toBe(false);
      expect(firstResult.inviteUrl).toBe(gManual.inviteUrl);

      // 2ª chamada: gManual lota (50/50) -> failover automático para gReserve (5/50)
      gManual.participantCount = 50;
      const secondResult = await service.resolvePublicRedirect('link-manual');
      expect(secondResult.available).toBe(true);
      expect(secondResult.switchedGroup).toBe(true);
      expect(secondResult.groupName).toBe('Grupo Reserva Mais Vazio');
      expect(secondResult.inviteUrl).toBe(gReserve.inviteUrl);
    });

    it('deve escolher apenas entre grupos elegíveis na estratégia RANDOM_AVAILABLE', async () => {
      const gFull = makeGroup({
        id: 'g-full',
        name: 'Lotado',
        participantCount: 100,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/FullGroup0001',
        instance: { status: InstanceStatus.DISCONNECTED },
      });
      const gOpenA = makeGroup({
        id: 'g-open-a',
        name: 'Aberto A',
        participantCount: 20,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/OpenGroup000A',
        instance: { status: InstanceStatus.DISCONNECTED },
      });
      const gOpenB = makeGroup({
        id: 'g-open-b',
        name: 'Aberto B',
        participantCount: 30,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/OpenGroup000B',
        instance: { status: InstanceStatus.DISCONNECTED },
      });

      mockPrisma.groupRedirectLink.findUnique.mockResolvedValue({
        id: 'link-random',
        tenantId: tenantA,
        name: 'Link Aleatório',
        slug: 'link-aleatorio',
        strategy: GroupLinkStrategy.RANDOM_AVAILABLE,
        maxParticipants: 100,
        isActive: true,
        currentGroupId: 'g-open-a',
        targets: [
          {
            id: 'tf',
            groupId: 'g-full',
            inviteUrl: gFull.inviteUrl,
            maxParticipants: 100,
            priority: 0,
            isEnabled: true,
            group: gFull,
          },
          {
            id: 'ta',
            groupId: 'g-open-a',
            inviteUrl: gOpenA.inviteUrl,
            maxParticipants: 100,
            priority: 1,
            isEnabled: true,
            group: gOpenA,
          },
          {
            id: 'tb',
            groupId: 'g-open-b',
            inviteUrl: gOpenB.inviteUrl,
            maxParticipants: 100,
            priority: 2,
            isEnabled: true,
            group: gOpenB,
          },
        ],
      });
      mockPrisma.groupRedirectLink.update.mockResolvedValue({});
      mockPrisma.groupRedirectTarget.update.mockResolvedValue({});

      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      const res = await service.resolvePublicRedirect('link-aleatorio');
      expect(res.available).toBe(true);
      expect(res.groupName).toBe('Aberto B');
      expect(res.inviteUrl).toBe(gOpenB.inviteUrl);
    });
  });
});
