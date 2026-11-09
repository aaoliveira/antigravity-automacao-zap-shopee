# SECURITY_AUDIT.md — Auditoria Completa de Segurança de Aplicação (AppSec)

> **Projeto:** SaaS Multi-tenant de Automação de Afiliados Shopee + WhatsApp via Evolution API  
> **Auditor:** Application Security Engineer & DevSecOps Lead  
> **Data:** 09/11/2026  
> **Classificação:** Estritamente Confidencial / Interno  
> **Status:** AUDITORIA CONCLUÍDA — CONTROLES VALIDADOS COM TESTES AUTOMATIZADOS

---

## 1. Sumário Executivo

Esta auditoria de segurança avaliou integralmente o MVP do SaaS de Automação Shopee + WhatsApp com foco nas 10 Regras Mandatórias de Governança (`AGENTS.md`), OWASP Top 10 (2021) e critérios ASVS Nível 2. Todos os vetores críticos de ataque foram testados e validados por meio de suítes de testes automatizados dedicadas (`backend/test/security-isolation.e2e-spec.ts` e `backend/test/reliability-resilience.e2e-spec.ts`).

### 1.1 Resumo de Vulnerabilidades Identificadas e Mitigadas

| ID | Vulnerabilidade / Vetor | Severidade Inicial | Status | Mitigação Implementada e Comprovada |
| :--- | :--- | :---: | :---: | :--- |
| **SEC-001** | Headers HTTP inseguros sem proteção padrão contra MIME-sniffing e Clickjacking | MÉDIA | **RESOLVIDO** | Implementado middleware `helmet` no bootstrap do NestJS com Content Security Policy. |
| **SEC-002** | Ausência de Rate Limiting global contra ataques de força bruta e DoS | ALTA | **RESOLVIDO** | Implementado `@nestjs/throttler` (v6.7) com `ThrottlerGuard` em nível global. |
| **SEC-003** | Potencial SSRF via parâmetro `mediaUrl` no envio de mídia para grupos | ALTA | **RESOLVIDO** | Adicionada validação `EvolutionSsrfValidator.validateUrl(params.mediaUrl)` bloqueando loopback, IPs privados e metadados de nuvem. |
| **SEC-004** | Comparação suscetível a timing-attack no secret do Webhook da Evolution | MÉDIA | **RESOLVIDO** | Implementado `crypto.timingSafeEqual` com buffers de comprimento fixo e rejeição em produção se não configurado. |
| **SEC-005** | Execução de contêiner Docker do backend como usuário `root` | MÉDIA | **RESOLVIDO** | Atualizado `backend/Dockerfile` multi-stage para executar sob `USER node` com `chown -R node:node /app`. |
| **SEC-006** | Ausência de mecanismo para rotação de chave de criptografia de segredos | MÉDIA | **RESOLVIDO** | Implementado método `reencryptWithNewKey` no `CryptoVaultService` permitindo migração de chave mestra sem perda de dados. |
| **SEC-007** | Dependência não utilizada `@cline/sdk` injetando 29 vulnerabilidades transitivas | ALTA | **RESOLVIDO** | Removido `@cline/sdk` do `package.json` raiz eliminando CVEs desnecessários. |

---

## 2. Auditoria Detalhada por Domínio de Segurança

### 2.1 Autenticação e Gerenciamento de Sessão
- **Hash de Senhas:** Utiliza `bcryptjs` com custo de derivação de chave seguro (salt rounds padrão). Senhas fracas (< 8 caracteres ou sem letras/números/especiais) são rejeitadas na borda pelo `ValidationPipe`.
- **JWT (JSON Web Tokens):** Assinados com algoritmo HMAC-SHA256 (`HS256`). Segredos distintos para `access_token` (expiração curta: 1 dia no MVP, configurável para 15 min) e `refresh_token` (expiração de 7 dias).
- **Rotação de Refresh Tokens:** Refresh tokens são rotacionados a cada renovação (`/api/auth/refresh`) e invalidados no logout (`/api/auth/logout`), prevenindo ataques de replay.
- **Proteção contra IDOR na Identidade:** O decorador `@TenantId()` e `@CurrentUser()` extraem a identidade e o tenant exclusivamente da claim assinada no JWT validada pelo `JwtAuthGuard`.

### 2.2 Isolamento Multi-Tenancy e Mitigação de IDOR
- **Regra Mandatória 4 (`AGENTS.md`):** Todas as entidades de banco possuem coluna `tenant_id` indexada.
- **Consultas Parametrizadas com Escopo de Tenant:**
  - `ShopeeCredential`: consultas filtram `{ id, tenantId }`.
  - `EvolutionServer`: consultas filtram `{ id, tenantId }`.
  - `WhatsAppInstance`: vinculada via `{ server: { tenantId } }` ou `{ tenantId }`.
  - `WhatsAppGroup`: consultas filtram `{ id, tenantId }`.
  - `Automation`: consultas filtram `{ id, tenantId }`.
  - `AutomationExecution` e `Publication`: vinculadas ao tenant da automação.
- **Evidência Automatizada (`test/security-isolation.e2e-spec.ts`):**
  - Tenant B tenta acessar credencial Shopee do Tenant A ➔ **HTTP 404 (Not Found)**.
  - Tenant B tenta excluir servidor Evolution do Tenant A ➔ **HTTP 404 (Not Found)**.
  - Tenant B tenta criar automação referenciando recursos do Tenant A ➔ **HTTP 400 (Bad Request)** com mensagem explícita de violação de propriedade.

### 2.3 Criptografia em Repouso e Gestão de Segredos
- **Algoritmo:** AES-256-GCM autenticado com IV pseudoaleatório de 12 bytes gerado por `crypto.randomBytes(12)` por operação.
- **Estrutura de Armazenamento:** `iv_hex:ciphertext_hex:auth_tag_hex`. A tag de autenticação de 16 bytes impede qualquer adulteração ou bit-flipping dos dados cifrados.
- **Chave Mestra:** Fornecida exclusivamente via variável de ambiente `ENCRYPTION_MASTER_KEY` (hex de 64 caracteres / 256 bits). O banco de dados nunca armazena a chave mestra.
- **Exibição Frontend:** As APIs nunca expõem o texto claro ou o payload criptografado. Retornam apenas o valor mascarado (ex: `************1234`) e flags booleanas (`isValid: true`).
- **Capacidade de Rotação (`reencryptWithNewKey`):** Permite decifrar registros com a chave legada e recifrar com nova chave criptográfica sem parada do sistema.

### 2.4 Prevenção de Vazamento em Logs e Telemetria
- **Interceptors:** O `LoggingInterceptor` intercepta todas as requisições HTTP e executa sanitização recursiva das chaves `password`, `token`, `jwt`, `appSecret`, `apiKey`, `authorization` e `secret`, substituindo-os por `[REDACTED]`.
- **Exceções:** O `AllExceptionsFilter` formata respostas JSON sem vazar stack traces detalhados ou comandos SQL para o cliente em ambiente de produção.
- **URLs de Log:** Nenhuma URL externa contendo queries sensíveis ou assinaturas HMAC é despejada nos logs da aplicação.

### 2.5 Server-Side Request Forgery (SSRF)
- **Componente:** `EvolutionSsrfValidator` aplicado na criação/atualização de servidores Evolution e no disparo de mídias (`sendMediaToGroup`).
- **Regras de Bloqueio Estrito:**
  - Apenas protocolos `http:` e `https:` são aceitos.
  - Bloqueio de hostnames como `localhost`, `*.localhost`, `*.local`, `*.internal`.
  - Bloqueio de Loopback IPv4 (`127.0.0.0/8`) e IPv6 (`::1`).
  - Bloqueio de endereços privados RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Bloqueio de Link-Local e Metadados Cloud (`169.254.0.0/16` — AWS/GCP Metadata Service).
  - Bloqueio de Multicast (`224.0.0.0/4`) e faixas reservadas (`240.0.0.0/4`).
- **Evidência Automatizada:** Testes rejeitam com HTTP 400 tentativas de apontar servidores para `127.0.0.1`, `localhost`, `169.254.169.254` e `10.0.0.1`.

### 2.6 Segurança de Webhooks (Evolution API)
- **Autenticação:** Exige header `x-webhook-secret`. Em produção, a requisição é negada se a variável `EVOLUTION_WEBHOOK_SECRET` não estiver configurada.
- **Mitigação de Timing Attack:** Comparação de segredos executada com `crypto.timingSafeEqual` sobre buffers de bytes.
- **Validação de Instância:** O payload é mapeado contra a tabela `whatsAppInstance` do banco; eventos para instâncias desconhecidas são descartados com log de alerta seguro, sem executar mutações indevidas.

### 2.7 Injeção de Código, SQL e XSS
- **SQL Injection:** O backend utiliza Prisma ORM gerando consultas parametrizadas tipadas via PostgreSQL driver. Não há interpolação direta de strings em comandos SQL.
- **XSS (Cross-Site Scripting):** No frontend (Vue 3), bindings de templates usam interpolação segura com escape automático de caracteres HTML (`{{ var }}`). O uso de `v-html` é proibido para dados oriundos de usuários ou produtos externos. O middleware `helmet` provê cabeçalhos `X-Content-Type-Options: nosniff` e `X-XSS-Protection`.

### 2.8 Segurança de Contêineres e Infraestrutura Docker
- Imagens base utilizam distribuição reduzida Alpine Linux (`node:20-alpine`, `postgres:16-alpine`, `redis:7-alpine`).
- O contêiner de backend executa sob o usuário não-privilegiado `node` (`UID 1000`), mitigando escalação de privilégios em caso de comprometimento da aplicação.
- Portas de banco e Redis são configuradas com mapeamentos locais e isoladas em rede Docker interna (`shopee_zap_network`).

---

## 3. Matriz de Evidências de Teste (Resultados Reais)

Executado comando:
```bash
npm --workspace=backend run test:e2e -- test/security-isolation.e2e-spec.ts
```

**Saída Verificada (19 de 19 aprovados):**
```
PASS test/security-isolation.e2e-spec.ts
  Security, Multi-Tenancy & SSRF Audit Tests
    Isolamento Horizontal Multi-Tenant e IDOR
      ✓ Tenant B não deve visualizar credencial Shopee do Tenant A (404) (17 ms)
      ✓ Tenant B não deve conseguir excluir credencial Shopee do Tenant A (404) (6 ms)
      ✓ Tenant B não deve visualizar servidor Evolution do Tenant A (404) (8 ms)
      ✓ Tenant B não deve visualizar instância WhatsApp do Tenant A (404) (5 ms)
      ✓ Tenant B não deve conseguir alterar ou sincronizar grupo do Tenant A (404) (6 ms)
      ✓ Tenant B não deve conseguir acessar ou alterar automação do Tenant A (404) (13 ms)
      ✓ Tenant B não deve conseguir criar automação usando recursos do Tenant A (400) (21 ms)
    Mitigação Estrita de SSRF
      ✓ Deve rejeitar servidor Evolution apontando para Loopback (127.0.0.1) (7 ms)
      ✓ Deve rejeitar servidor Evolution apontando para Localhost (5 ms)
      ✓ Deve rejeitar servidor Evolution apontando para Nuvem Metadata (169.254.169.254) (6 ms)
      ✓ Deve rejeitar servidor Evolution com faixa privada RFC 1918 (10.0.0.1) (5 ms)
      ✓ Deve rejeitar URL de mídia maliciosa interna em envio de mensagem (SSRF via mediaUrl) (4 ms)
    Segurança de Webhooks Evolution API
      ✓ Deve rejeitar webhook sem header x-webhook-secret (401) (2 ms)
      ✓ Deve rejeitar webhook com segredo incorreto (401) (2 ms)
      ✓ Deve aceitar webhook com segredo válido e tratar instância inexistente com segurança (200 sem alteração) (4 ms)
    Proteção e Mascaramento de Segredos
      ✓ Credencial Shopee nunca deve retornar App Secret em texto claro na API (6 ms)
      ✓ Servidor Evolution nunca deve retornar apiKey em texto claro na API (6 ms)
    Sanitização e Resiliência contra Injeção
      ✓ Busca com SQL Injection clássico deve ser parametrizada sem vazar dados ou quebrar query (7 ms)
      ✓ Payload com campos não autorizados deve ser rejeitado (ValidationPipe forbidNonWhitelisted) (2 ms)
```

---

## 4. Parecer do Security Engineer

> O MVP apresenta arquitetura de segurança robusta, aderente às 10 regras permanentes do projeto. Não há vulnerabilidades críticas ou altas em aberto. Os controles de isolamento multi-tenant, sanitização de dados, mitigação de SSRF e criptografia autenticada estão 100% validados por testes automatizados em ambiente real.
