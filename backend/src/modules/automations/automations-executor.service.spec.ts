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
