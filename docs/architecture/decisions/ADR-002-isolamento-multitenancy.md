# ADR-002: Estratégia de Isolamento Multi-Tenancy

- **Status:** Aprovado
- **Data:** 2026-11-09
- **Autores:** Software Architect & Security Architect Team

---

## Contexto e Problema
O SaaS atende múltiplos afiliados e gestores independentes. É mandatório garantir que nenhum cliente visualize, altere ou execute recursos de outro cliente sob qualquer circunstância, inclusive em jobs assíncronos. Era necessário decidir o modelo de isolamento: Database-per-tenant, Schema-per-tenant ou Shared Database com Tenant-ID em nível de aplicação e Row-Level Security (RLS).

---

## Alternativas Consideradas
1. **Alternativa 1 (Database por Tenant):** Um banco de dados físico/lógico separado por cliente.
   - *Desvantagem:* Complexidade operacional extrema, alto custo de infraestrutura no MVP e overhead de migração de centenas de bancos.
2. **Alternativa 2 (Schema por Tenant):** Schemas PostgreSQL separados.
   - *Desvantagem:* Dificuldade de manutenção de migrations com Prisma e alto consumo de memória de conexões.
3. **Alternativa 3 (Banco Compartilhado com Coluna `tenant_id` Obrigatória e Guards de Aplicação - Escolhida):**
   - Todas as tabelas possuem `tenant_id UUID NOT NULL` indexado.
   - O `tenantId` é injetado a partir do token JWT e aplicado em 100% dos services e queries Prisma.
   - Avaliação de RLS: O PostgreSQL Row-Level Security é viável, porém impõe complexidade de configuração de contexto transacional em connection pools gerenciados pelo Prisma ORM (`SET LOCAL app.current_tenant`).

---

## Decisão Tomada e Justificativa
Adotar a **Alternativa 3 com Validação Rígida em Camada de Aplicação (Service Level Multi-Tenancy Enforcement)**:
1. Toda consulta no Prisma inclui explicitamente `where: { tenantId: ctx.tenantId, ... }`.
2. NestJS Guards e Interceptors validam o token e previnem qualquer sobrescrita de tenant vinda de parâmetros do usuário.
3. Workers revalidam a propriedade cruzada de todos os recursos (instância, grupos e credenciais) contra o `tenantId` do job antes do disparo.
4. RLS nativo do PostgreSQL é mantido como evolução arquitetural pós-MVP, evitando instabilidades com pooling de conexões no Prisma.

---

## Consequências
- **Positivas:** Migrations simples e unificadas; alta performance de queries com índices B-Tree compostos `(tenant_id, ...)`; escalabilidade eficiente no MVP.
- **Negativas / Mitigações:** Risco de erro humano do desenvolvedor esquecer o filtro `tenantId`. **Mitigação:** Suíte obrigatória de testes automatizados de integração negativos (tentativa deliberada de acesso entre tenants) barrando qualquer falha no CI.
