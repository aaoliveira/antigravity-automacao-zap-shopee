# Status de Implementação do Projeto (IMPLEMENTATION_STATUS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Última Atualização:** 2026-11-09  

---

## 1. Visão Geral das Etapas

| Etapa | Descrição | Status | Data de Conclusão | Critérios Atendidos | Evidências / Notas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Prompt 00** | Governança permanente, contexto e prevenção de alucinações | **CONCLUÍDO** | 2026-11-09 | 5 / 5 | `AGENTS.md`, `README.md`, `prompts/00-...` criados com regras inegociáveis. |
| **Prompt 01** | Discovery, PRD e especificações funcionais | **CONCLUÍDO** | 2026-11-09 | 7 / 7 | PRD, Escopo MVP, Personas, Histórias, Regras de Negócio e Matriz de Rastreabilidade criados. |
| **Prompt 02** | Investigação técnica das APIs e contratos de integração | **CONCLUÍDO** | 2026-11-09 | 6 / 6 | Contratos oficiais Shopee e Evolution v2 mapeados, matriz de compatibilidade e decisões homologadas. |
| **Prompt 03** | Arquitetura, modelo de dados e desenho de segurança | **CONCLUÍDO** | 2026-11-09 | 7 / 7 | Monólito modular, schema Prisma, contratos REST, BullMQ, AES-256-GCM, STRIDE, ADRs e Test Strategy. |
| **Prompt 04** | Fundação, autenticação e multi-tenancy | **CONCLUÍDO** | 2026-11-09 | 7 / 7 | Base executável NestJS + Vue 3, Docker Compose, PostgreSQL + Prisma, Redis, rotas de auth e testes de multi-tenancy. |
| **Prompt 05** | Credenciais e integração Shopee | **CONCLUÍDO** | 2026-11-09 | 7 / 7 | `ShopeeModule`, signer SHA-256, client GraphQL, Short Link, busca de ofertas, isolamento multi-tenant e view frontend. |
| **Prompt 06** | Evolution API, instâncias, QR Code e grupos | **CONCLUÍDO** | 2026-11-09 | 8 / 8 | `EvolutionModule`, mitigação SSRF, ciclo de vida de instâncias, QR Code modal, grupos `@g.us`, webhooks, testes e view Vue 3. |
| **Prompt 07** | Automações, scheduler e motor de execução | **PENDENTE** | - | 0 / 7 | Próxima etapa a ser iniciada após aprovação. |
| **Prompt 08** | Frontend, dashboard e experiência do usuário | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 08. |
| **Prompt 09** | Qualidade, segurança e readiness para produção | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 09. |
| **Prompt 10** | Validação End-to-End do fluxo de publicação | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 10. |

---

## 2. Detalhes da Etapa Concluída: PROMPT 06

- **Objetivo:** Implementar o gerenciamento completo de servidores Evolution API v2 (provider `WHATSAPP-BAILEYS`), mitigação rigorosa de SSRF, ciclo de vida de instâncias WhatsApp com pareamento por QR Code, sincronização de grupos preservando JID oficial `@g.us`, despacho de mídia com legenda estruturada homologada, webhook com validação de secret e interface frontend em Vue 3.
- **Artefatos Entregues:**
  - [`prompts/06-EVOLUTION-WHATSAPP.md`](../../prompts/06-EVOLUTION-WHATSAPP.md): Registro fiel das diretrizes do Prompt 06.
  - [`backend/src/modules/evolution/evolution-ssrf.validator.ts`](../../backend/src/modules/evolution/evolution-ssrf.validator.ts): Validação de URLs para bloqueio de IPs privados RFC 1918, loopback, metadados de nuvem e esquemas não-HTTP.
  - [`backend/src/modules/evolution/evolution.client.ts`](../../backend/src/modules/evolution/evolution.client.ts): Cliente HTTP oficial para Evolution API v2 com timeout de 15s, headers com `apikey`, ping/health, criação (`WHATSAPP-BAILEYS`), QR code, consulta de estado em tempo real, logout, delete, fetchAllGroups e envio de mensagens/mídia com legenda estruturada.
  - [`backend/src/modules/evolution/evolution-servers.service.ts`](../../backend/src/modules/evolution/evolution-servers.service.ts) e [`backend/src/modules/evolution/evolution-servers.controller.ts`](../../backend/src/modules/evolution/evolution-servers.controller.ts): CRUD de servidores Evolution por tenant (`DEC-003`), com teste de conectividade, criptografia de API Key (AES-256-GCM) e retorno apenas de chave mascarada.
  - [`backend/src/modules/evolution/whatsapp-instances.service.ts`](../../backend/src/modules/evolution/whatsapp-instances.service.ts) e [`backend/src/modules/evolution/whatsapp-instances.controller.ts`](../../backend/src/modules/evolution/whatsapp-instances.controller.ts): Ciclo de vida completo das instâncias WhatsApp (`CREATED`, `CONNECTING`, `CONNECTED`, `DISCONNECTED`), pareamento com QR Code Base64 e consulta de estado síncrono.
  - [`backend/src/modules/evolution/whatsapp-groups.service.ts`](../../backend/src/modules/evolution/whatsapp-groups.service.ts) e [`backend/src/modules/evolution/whatsapp-groups.controller.ts`](../../backend/src/modules/evolution/whatsapp-groups.controller.ts): Sincronização de grupos a partir da Evolution API preservando o JID original `@g.us`, contagem de membros, listagem com busca e envio de mídia/texto.
  - [`backend/src/modules/evolution/evolution-webhook.controller.ts`](../../backend/src/modules/evolution/evolution-webhook.controller.ts): Endpoint `/api/webhooks/evolution` com validação de `x-webhook-secret`, processamento de `connection.update` e `qrcode.updated`, persistência em `WebhookEvent`.
  - [`frontend/src/views/WhatsAppInstancesView.vue`](../../frontend/src/views/WhatsAppInstancesView.vue): Interface com abas para Instâncias, Grupos e Servidores, com modal de QR Code em tempo real (polling e refresh), verificação de status e disparo de testes.
  - [`backend/src/modules/evolution/evolution.client.spec.ts`](../../backend/src/modules/evolution/evolution.client.spec.ts): Testes unitários do client, templates e validador SSRF.
  - [`backend/test/evolution.e2e-spec.ts`](../../backend/test/evolution.e2e-spec.ts): Testes e2e cobrindo servidores, instâncias, QR code, grupos, webhook e isolamento negativo multi-tenant cruzado A/B.
- **Suíte de Testes Automatizados Executada (65 testes passando):**
  - **Unitários (23 testes):**
    - `src/modules/evolution/evolution.client.spec.ts` (13 testes)
    - `src/modules/shopee/shopee.signer.spec.ts` (3 testes)
    - `src/modules/shopee/shopee.client.spec.ts` (3 testes)
    - `src/modules/crypto-vault/crypto-vault.service.spec.ts` (4 testes)
  - **E2E (42 testes):**
    - `test/evolution.e2e-spec.ts` (16 testes)
    - `test/shopee-credentials.e2e-spec.ts` (9 testes)
    - `test/multi-tenancy.e2e-spec.ts` (6 testes)
    - `test/auth.e2e-spec.ts` (10 testes)
    - `test/health.e2e-spec.ts` (1 teste)
- **Critérios de Aceite Validados:**
  - [x] API Key do servidor criptografada em repouso (AES-256-GCM) e mascarada na API (`************abcd`).
  - [x] URLs de servidor e imagens validadas contra SSRF (bloqueio de IPs privados, localhost e metadados de nuvem).
  - [x] Instância tem ciclo de vida rastreável (`CREATED` -> `CONNECTING` -> `CONNECTED` -> `DISCONNECTED`).
  - [x] QR Code é gerado e atualizado, e estado conectado é verificado de forma síncrona ou via webhook.
  - [x] Grupos pertencem estritamente à instância e tenant correspondentes.
  - [x] IDs de grupo (JID `@g.us`) são preservados integralmente.
  - [x] Envio de imagem com legenda formatada no template oficial homologado.
  - [x] Isolamento multi-tenant (A/B) comprovado: Tenant B recebe 404 em qualquer tentativa de leitura, alteração ou envio em servidores, instâncias ou grupos do Tenant A.

---

## 3. Próximo Passo
Aguardar aprovação formal do usuário para a etapa **PROMPT 06** e instrução para avançar ao **PROMPT 07 (Automações, scheduler e motor de execução)**.
