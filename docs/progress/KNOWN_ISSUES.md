# Registro de Bloqueios, Limitações e Débitos Técnicos (KNOWN_ISSUES)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Status:** Ativo  
> **Última Atualização:** 2026-11-09  

Este arquivo é a fonte oficial de rastreamento para impedimentos, ausência de contratos formais de APIs externas, dependências de credenciais de produção e restrições conhecidas das plataformas de terceiros.

---

## 1. Bloqueios e Incertezas de Contrato Externo

| ID | Data | Descrição do Bloqueio | Módulo / Dependência | Impacto | Resolução Adotada | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **BLK-001** | 2026-11-09 | Validação de endpoint oficial Shopee para listagem de categorias vs listagem de ofertas | Shopee Open API (`Prompt 02`) | Definição de como o usuário filtrará produtos nas automações | **RESOLVIDO via DEC-001:** Shopee opera via `productOfferV2(keyword: ...)`. Usuário configura palavras-chave/nichos por automação. | **RESOLVIDO** |
| **BLK-002** | 2026-11-09 | Compatibilidade do provider Baileys da Evolution API para envio de mensagens com mídia e listagem de grupos | Evolution API (`Prompt 02`/`06`) | Garantir que o envio de imagem + legenda funcione em instâncias WhatsApp | **RESOLVIDO via DEC-002:** Confirmado suporte a `POST /message/sendMedia` com JSON (imagem via URL + legenda) e `GET /group/fetchAllGroups`. | **RESOLVIDO** |

---

## 2. Limitações Conhecidas de Escopo (MVP)

- **LIM-001 (Marketplaces Adicionais):** O escopo do MVP está restrito à Shopee Affiliate Open API. Integrações com Mercado Livre, Amazon ou Magazine Luiza estão formalmente fora do escopo do MVP.
- **LIM-002 (Geração de Copy via LLM):** O MVP utilizará templates determinísticos estruturados (Título, Preço, Link curto de afiliado e Imagem oficial). IA generativa para copy fica para fase pós-MVP.
- **LIM-003 (Cobrança e Billing):** Não haverá gateway de pagamento ou faturamento automático no MVP. A provisão de acesso/tenant será manual ou auto-cadastro inicial conforme definido no PRD.
- **LIM-004 (App Mobile):** Plataforma estritamente web responsiva (desktop e mobile web).
- **LIM-005 (Múltiplos Provedores WhatsApp):** Suporte exclusivo à Evolution API via provider homologado (Baileys) no MVP.

---

## 3. Débitos Técnicos e Riscos Monitorados

| ID | Data | Risco / Débito Técnico | Severidade | Mitigação Implementada e Comprovada | Status |
| :--- | :---: | :--- | :---: | :--- | :---: |
| **RSK-001** | 2026-11-09 | Banimento de instâncias WhatsApp por disparos excessivos | Alta | Jitter/delay configurável entre disparos, limites diários de execução e circuit breaker com status `SKIPPED_INSTANCE_OFFLINE`. | **MITIGADO & TESTADO** |
| **RSK-002** | 2026-11-09 | Vazamento de credenciais da Shopee ou chaves da Evolution | Crítica | Criptografia autenticada em repouso (AES-256-GCM), sanitização de logs com `LoggingInterceptor`, mascaramento no frontend e `reencryptWithNewKey`. | **MITIGADO & TESTADO** |
| **RSK-003** | 2026-11-09 | Falhas de isolamento multi-tenant em background workers | Crítica | Resolução obrigatória e validação estrita do `tenantId` no payload e no banco em todas as camadas (testado em `security-isolation.e2e-spec.ts`). | **MITIGADO & TESTADO** |
| **RSK-004** | 2026-11-09 | Tentativa de Server-Side Request Forgery (SSRF) via servidores Evolution e mediaUrl | Alta | Validador `EvolutionSsrfValidator` com bloqueio de loopback, faixas RFC 1918 e metadados de nuvem 169.254. | **MITIGADO & TESTADO** |
| **RSK-005** | 2026-11-09 | Concorrência e publicação duplicada por múltiplos workers | Alta | Locks distribuídos no Redis (`lock:automation:<id>`) com script Lua para liberação segura pelo worker proprietário. | **MITIGADO & TESTADO** |
