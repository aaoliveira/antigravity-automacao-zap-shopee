# Registro Formal de Decisões de Produto e Arquitetura (DECISION_LOG)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Status:** Ativo  
> **Última Atualização:** 2026-11-11  

---

## 1. Registro de Decisões Aprovadas pelo Product Owner

### DEC-001: Fallback de Categorias por Palavras-Chave de Nicho (Shopee Open API)
- **ID da Dúvida Relacionada:** `Q-INT-01`
- **Data da Decisão:** 2026-11-09
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** A Shopee Affiliate Open API não expõe uma query GraphQL dedicada para catálogo formal de categorias na árvore brasileira, operando prioritariamente por buscas de ofertas com parâmetros de texto e filtros.
- **Decisão:** Adotar formalmente a **Alternativa A**: o usuário poderá configurar termos de busca e nichos de interesse (ex: "cozinha", "moda feminina", "eletrônicos", "beleza", "casa") diretamente na automação. Cada automação pode conter múltiplas palavras-chave/nichos, que serão sorteadas uniformemente no momento do disparo.
- **Justificativa:** Elimina dependência de catálogo inexistente, previne alucinações na API da Shopee e concede flexibilidade muito superior ao afiliado para direcionar os grupos aos seus nichos reais de audiência.
- **Impacto em Artefatos:** Atualização de `PRD.md`, `BUSINESS_RULES.md`, `ACCEPTANCE_CRITERIA.md` e `USER_STORIES.md`.

---

### DEC-002: Validação de Capacidade de Envio de Imagem + Legenda na Evolution API
- **ID da Dúvida Relacionada:** `Q-INT-02`
- **Data da Decisão:** 2026-11-09
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** Garantir que o envio de ofertas ocorra com imagem do produto e legenda (título, preço e Short Link) em mensagem única via endpoint `/message/sendMedia` no provider Baileys.
- **Decisão:** Confirmada a abordagem de envio integrado com imagem e legenda estruturada, com fallback documentado caso a Evolution API retorne falha de envio de mídia.
- **Justificativa:** Mensagens com imagem e legenda unificada geram maior engajamento, menor poluição visual nos grupos e menor risco de separação texto/imagem em conexões instáveis de clientes.
- **Impacto em Artefatos:** Documentado em `EVOLUTION_API_CONTRACTS.md` e `BUSINESS_RULES.md`.

---

### DEC-003: Modelo de Propriedade Multi-Servidor (BYO-Server) com Suporte a Servidor Padrão
- **ID da Dúvida Relacionada:** `Q-ARC-01` / `Q-SCP-01`
- **Data da Decisão:** 2026-11-09
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** Definição da arquitetura de conectividade do WhatsApp: cada cliente ter seu servidor Evolution ou centralizado.
- **Decisão:** Aprovado o **Cenário A**: a entidade `evolution_servers` pertence estritamente ao `tenant_id`, permitindo que cada cliente cadastre sua própria URL base e Global API Key. Ao mesmo tempo, o modelo permite tecnicamente que a plataforma vincule um servidor compartilhado padrão caso desejado.
- **Justificativa:** Garante isolamento estrito de infraestrutura, reduz os custos operacionais do SaaS no MVP e dá autonomia total aos clientes avançados.
- **Impacto em Artefatos:** Modelagem de dados (`docs/architecture/` e Prompt 03).

---

### DEC-004: Separação Explícita entre Estado `PAUSED` e `INACTIVE` para Edição e Exclusão de Automações
- **ID da Dúvida Relacionada:** `Q-AUT-01`
- **Data da Decisão:** 2026-11-10
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** Necessidade de distinguir pausa operacional temporária (para ajustes sem risco de perda) de desativação prévia obrigatória antes da exclusão definitiva da automação.
- **Decisão:** Aprovada a **Alternativa A**: adicionar o valor `INACTIVE` ao enum `AutomationStatus` (`ACTIVE`, `PAUSED`, `INACTIVE`, `DELETED`) com transição explícita via `PATCH /api/automations/:id/deactivate`.
  - **Edição (`PUT /api/automations/:id`):** permitida quando a automação estiver `PAUSED` **ou** `INACTIVE` (`409 Conflict` se `ACTIVE` ou `DELETED`).
  - **Exclusão (`DELETE /api/automations/:id`):** permitida **somente** quando a automação estiver `INACTIVE` (`409 Conflict` se `ACTIVE` ou `PAUSED`).
- **Justificativa:** Evita exclusão acidental de automações apenas pausadas durante manutenção de campanhas e torna explícito o ciclo de vida operacional (`Ativa` -> `Pausada` / `Inativa` -> `Excluída`).
- **Impacto em Artefatos:** Migration Prisma no enum `AutomationStatus`, `ADR-006`, `API_CONTRACTS.md`, `BUSINESS_RULES.md`, `ACCEPTANCE_CRITERIA.md`, `DATABASE_SCHEMA.md`, `AutomationsView.vue` e testes automatizados.

---

### DEC-005: Integração Híbrida Mercado Livre com Alternativas A e B Controladas por Feature Flags
- **ID da Dúvida Relacionada:** `Q-ML-01`
- **Data da Decisão:** 2026-11-11
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** O Mercado Livre Developers oferece API oficial OAuth 2.0 e busca (`/sites/MLB/search`), mas não fornece API oficial pública para gerar links curtos de afiliado (`meli.la`).
- **Decisão:** Implementar ambos os modos no backend e frontend protegidos por Feature Flags configuráveis por tenant/usuário logado:
  1. **Alternativa B (`ml_alternative_b_enabled`, padrão `true`):** Tela baseada no protótipo no design ShopeeZap (tag de afiliado, cookie de sessão cifrado em AES-256-GCM com expiração de 14 dias, integração via extensão/navegador do usuário para envio direto sem scraping no servidor e suporte opcional a URL de Gateway Integrador Homologado validada contra SSRF).
  2. **Alternativa A (`ml_alternative_a_enabled`, padrão `false`):** Fluxo 100% oficial via Mercado Livre Developers OAuth 2.0 (`authorization_code` + `refresh_token`), busca oficial `GET /sites/MLB/search` e importação assistida/fila de ofertas com links oficiais `meli.la` para disparo nas automações.
- **Justificativa:** Permite entregar imediatamente a experiência desejada do protótipo mantendo conformidade estrita com a Regra 2 do `AGENTS.md` (zero endpoints internos não documentados inventados no backend), enquanto mantém o caminho 100% oficial pronto para ativação por feature flag quando desejado pelo usuário logado.
- **Impacto em Artefatos:** Schema Prisma (`FeatureFlag`, `MercadoLivreAccount`, `MercadoLivreOffer`, `AffiliatePlatform.MERCADO_LIVRE`, `Automation.platform`), `ADR-008`, `MERCADO_LIVRE_API_CONTRACTS.md`, `INTEGRATIONS.md`, `KNOWN_ISSUES.md`, módulo `mercadolivre` + `feature-flags`, `CouponsModule` e views Vue 3.

---

### DEC-006: Extensão Chrome Manifest V3 Desacoplada e Download via Plataforma para Alternativa B
- **Data da Decisão:** 2026-11-11
- **Aprovador:** Product Owner (Usuário)
- **Contexto:** Necessidade de executar todas as etapas da Alternativa B via extensão Google Chrome (coleta de cookies inclusive `HttpOnly`, tag, gateway homologado e envio de ofertas `meli.la`), com download direto pela plataforma, manual de instalação e capacidade de evolução independente.
- **Decisão:** Criar pacote independente Manifest V3 em `extensions/mercadolivre-chrome/` com contrato versionado (`src/config/contracts.js`), endpoint de download dinâmico `.zip` (`GET /api/mercadolivre/extension/download`), token contínuo revogável via `X-Extension-Token` (`POST/DELETE /api/mercadolivre/extension/token`) e manual em `docs/manuals/EXTENSAO_CHROME_MERCADO_LIVRE.md`.
- **Impacto em Artefatos:** `ADR-009`, `extensions/mercadolivre-chrome/`, `MercadoLivreModule`, `main.ts` (CORS), `MercadoLivreView.vue`, `API_CONTRACTS.md` e suítes de testes.
