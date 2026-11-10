# Dúvidas Bloqueantes e Perguntas Abertas (OPEN_QUESTIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.3 (Q-AUT-01 aprovada pelo PO)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Data:** 2026-11-10  

---

## 1. Dúvidas Bloqueantes de Integração Externa

### Q-INT-01: Exposição de Categorias na Shopee Affiliate Open API
- **Contexto:** A Shopee Affiliate Open API opera prioritariamente por buscas de ofertas (`productOfferV2`) sem expor catálogo formal de categorias via GraphQL.
- **Alternativas:**
  - *Alternativa A (Aprovada):* Permitir que o usuário configure palavras-chave/nichos de busca (ex: "cozinha", "moda", "celular") por automação.
  - *Alternativa B:* Lista estática fixa de IDs numéricos.
- **Status:** **APROVADA PELO PO (2026-11-09)**.
- **Decisão Oficial:** Ver [`DEC-001` em DECISION_LOG.md](DECISION_LOG.md#dec-001-fallback-de-categorias-por-palavras-chave-de-nicho-shopee-open-api).

---

### Q-INT-02: Capacidade de Envio de Imagem + Legenda na Evolution API v2 (Provider Baileys)
- **Contexto:** Envio unificado de imagem do produto + legenda formatada (Título, Preço e Short Link) em mensagem única via endpoint `/message/sendMedia` com o campo `caption`.
- **Status:** **APROVADA PELO PO (2026-11-09)**.
- **Decisão Oficial:** Ver [`DEC-002` em DECISION_LOG.md](DECISION_LOG.md#dec-002-validação-de-capacidade-de-envio-de-imagem--legenda-na-evolution-api).

---

## 2. Decisões de Arquitetura e Modelo de Propriedade

### Q-ARC-01 / Q-SCP-01: Modelo de Hospedagem do Servidor Evolution API
- **Contexto:** Modelo de multi-tenancy para os servidores Evolution API.
- **Cenário A (Aprovado):** Cada tenant possui seus próprios registros de `evolution_servers` (`BYO-Server`), permitindo configurar URL e API Key do seu cluster ou VPS, com suporte técnico a um servidor compartilhado padrão caso provisionado.
- **Status:** **APROVADA PELO PO (2026-11-09)**.
- **Decisão Oficial:** Ver [`DEC-003` em DECISION_LOG.md](DECISION_LOG.md#dec-003-modelo-de-propriedade-multi-servidor-byo-server-com-suporte-a-servidor-padrão).

---

### Q-ARC-02: Política de Fuso Horário e Horário de Verão
- **Proposta:** Timestamps em UTC (`TIMESTAMPTZ`), conversão no agendador para o timezone configurado no tenant (padrão `America/Sao_Paulo`).
- **Status:** **APROVADA TACITAMENTE / EM REVISÃO NA ARQUITETURA**.

---

## 3. Dúvidas Bloqueantes de Regra de Negócio (Automações)

### Q-AUT-01: Distinção entre Estado `PAUSED` (Pausada) e `INACTIVE` (Inativa) para Edição e Exclusão de Automações
- **Contexto:** O modelo aprovado atualmente em [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) define `AutomationStatus` com apenas três valores: `ACTIVE`, `PAUSED` e `DELETED` (sem enum `INACTIVE` dedicado). Enquanto o requisito anterior solicitou permitir edição quando a automação estiver *"pausada ou inativa"*, o novo requisito solicita permitir exclusão *"somente se a automação estiver inativa"*.
- **Alternativas Disponíveis:**
  - *Alternativa A — Criar estado explícito `INACTIVE` separado de `PAUSED`:* Adiciona `INACTIVE` ao enum `AutomationStatus` (nova migration Prisma), endpoint `PATCH /api/automations/:id/deactivate` (além de `pause`/`resume`) e botão `Inativar`/`Reativar` na interface. Edição liberada em `PAUSED` ou `INACTIVE`; exclusão liberada **exclusivamente** em `INACTIVE`.
    - **Vantagens:** Diferencia claramente uma pausa temporária (`PAUSED`, que protege contra exclusão acidental) de uma desativação definitiva pré-exclusão (`INACTIVE`); atende literalmente ambos os requisitos sem ambiguidade.
    - **Desvantagens / Impactos:** Altera schema de banco (migration), contrato REST (`API_CONTRACTS.md`), métricas do Dashboard (`DashboardService`), UI e suíte de testes E2E existente.
  - *Alternativa B — Tratar `PAUSED` como o único estado não ativo (pausada/inativa):* Mantém o schema atual (`ACTIVE`, `PAUSED`, `DELETED`), bloqueando exclusão de automações `ACTIVE` (`HTTP 409 Conflict` no backend e botão `Excluir` desabilitado na UI) e liberando exclusão quando `PAUSED`.
    - **Vantagens:** Mantém o schema e a interface enxutos sem migration nem novo botão de transição de estado.
    - **Desvantagens / Impactos:** Não diferencia `Pausada` de `Inativa`; uma automação apenas pausada poderá ser excluída diretamente.
- **Recomendação Técnica:** **Alternativa A** caso deseje proteger automações pausadas contra exclusão acidental exigindo inativação prévia; **Alternativa B** caso "pausada" e "inativa" sejam sinônimos operacionais no MVP.
- **Bloqueia etapa?** **DESBLOQUEADA APÓS APROVAÇÃO.**
- **Status:** **APROVADA PELO PO (2026-11-10) — Alternativa A selecionada.**
- **Decisão Oficial:** Ver [`DEC-004` em DECISION_LOG.md](DECISION_LOG.md#dec-004-separação-explícita-entre-estado-paused-e-inactive-para-edição-e-exclusão-de-automações).
