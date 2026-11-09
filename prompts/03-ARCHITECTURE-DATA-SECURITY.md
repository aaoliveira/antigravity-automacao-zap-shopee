# PROMPT 03 --- Arquitetura, modelo de dados e desenho de segurança

**Arquivo sugerido:** `prompts/03-ARCHITECTURE-DATA-SECURITY.md`  
**Objetivo:** estruturar a arquitetura técnica, modelo de dados relacional e requisitos de segurança do SaaS.

```text
Atue como Software Architect e Security Architect.
Use exclusivamente requisitos e contratos aprovados.

STACK PREFERENCIAL:
Frontend: Vue 3 + TypeScript + Vite.
Backend: Node.js + NestJS + TypeScript.
Banco: PostgreSQL + Prisma.
Filas: Redis + BullMQ.
Infra: Docker Compose + Nginx.
Testes: Vitest/Jest conforme stack existente, Supertest e Playwright.

Se o repositório já tiver stack funcional, preserve-a e registre ADR
para qualquer mudança proposta.

1. ARQUITETURA
Defina monólito modular para o MVP, com módulos:
auth, users/tenants, shopee, evolution, instances, groups, categories,
products, automations, scheduler, queue, publications, history, audit.

Workers devem compartilhar regras de domínio e validar tenant.
Não duplicar lógica de negócio entre API e worker.

2. MODELO DE DADOS
Avalie e modele, no mínimo:
User, Tenant, ShopeeCredential, EvolutionServer, WhatsAppInstance,
WhatsAppGroup, Category, Automation, AutomationCategory, AutomationGroup,
AutomationExecution, ProductSnapshot, AffiliateLink, Publication,
AuditLog e WebhookEvent, conforme necessidade comprovada.

Defina:
- PKs e FKs;
- tenant_id/owner_id;
- índices;
- unique constraints;
- estados e transições;
- timestamps;
- retenção;
- soft delete apenas quando fizer sentido;
- integridade entre automação, instância, grupo e credencial.

Não armazenar catálogo completo de produtos sem necessidade.
Guardar snapshot mínimo necessário para auditoria e histórico.

3. MULTI-TENANCY
- Tenant obtido da autenticação.
- Queries com escopo obrigatório.
- Guards/policies no backend.
- Constraints e relações no banco.
- Workers revalidam propriedade.
- Webhooks são associados a uma instância/tenant por segredo ou
  mecanismo verificável.
- Testes negativos de acesso cruzado.

Avalie Row-Level Security do PostgreSQL como defesa adicional, sem
substituir autorização de aplicação. Documente a decisão.

4. SEGREDOS
Defina criptografia autenticada em repouso, gestão externa da chave,
rotação, mascaramento, acesso mínimo e procedimento de backup/restore.
Não persistir API keys em logs ou traces.

5. FILAS E CONFIABILIDADE
Defina:
- filas e tipos de jobs;
- idempotency keys;
- lock/concurrency;
- retry com backoff e jitter;
- limites por tenant e por instância;
- dead-letter queue;
- timeout;
- cancelamento;
- recuperação após restart;
- reconciliação de resultado de envio indeterminado.

Não afirmar entrega exatamente uma vez se a API externa não oferece
mecanismo que a garanta. Definir semântica realista de entrega e deduplicação.

6. PUBLICAÇÃO MULTIGRUPO
Uma execução seleciona um produto e gera um link.
Cria um registro de destino por grupo.
Cada destino possui estado independente.
Falha em um grupo não apaga sucesso dos demais.
Não refazer busca/conversão para cada grupo sem necessidade.

7. OBSERVABILIDADE
Defina correlationId, executionId, tenantId não sensível, métricas,
logs sanitizados, health checks e alertas operacionais.

ENTREGÁVEIS
- docs/architecture/SYSTEM_ARCHITECTURE.md
- docs/architecture/DATABASE_SCHEMA.md
- docs/architecture/API_CONTRACTS.md
- docs/architecture/QUEUE_AND_RELIABILITY.md
- docs/security/SECURITY_POLICY.md
- docs/security/THREAT_MODEL.md
- docs/architecture/decisions/
- docs/quality/TEST_STRATEGY.md

Não implementar ainda. Solicite aprovação da arquitetura.
```

**Critérios de aceite:**
- [ ] Diagrama de componentes e sequência do fluxo principal.
- [ ] Modelo de dados contempla propriedade e integridade.
- [ ] Estratégia de filas e estados indeterminados está documentada.
- [ ] Publicação multigrupo possui estado por destino.
- [ ] Segurança de credenciais e isolamento estão definidos.
- [ ] Decisões relevantes possuem ADR.
- [ ] Arquitetura aprovada antes da implementação.
