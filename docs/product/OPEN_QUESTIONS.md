# Dúvidas Bloqueantes e Perguntas Abertas (OPEN_QUESTIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.1 (Atualizado pós-decisões do PO)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Data:** 2026-11-09  

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
