# Dúvidas Bloqueantes e Perguntas Abertas (OPEN_QUESTIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.5 (Q-ML-01 aprovada pelo PO — Arquitetura Híbrida com Feature Flags)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Data:** 2026-11-11  

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

---

## 4. Dúvidas Bloqueantes de Integração — Mercado Livre Afiliados

### Q-ML-01: Inexistência de API Oficial Pública para Geração de Links de Afiliados do Mercado Livre (`meli.la`)
- **Contexto:** Após pesquisa na documentação oficial do Mercado Livre (`https://developers.mercadolivre.com.br` e `https://www.mercadolivre.com.br/l/afiliados-home`), constatou-se:
  1. **Busca de produtos existe oficialmente:** O Mercado Livre Developers oferece autenticação OAuth 2.0 (`APP_ID` + `Client Secret` -> `Access Token` / `Refresh Token`) e endpoint REST oficial `GET https://api.mercadolibre.com/sites/MLB/search?q=...` (além de `/items/{id}`), podendo exigir `Authorization: Bearer <ACCESS_TOKEN>`.
  2. **Geração de links de afiliado (`meli.la`) NÃO possui API oficial pública documentada:** O gerador de links do Programa de Afiliados funciona exclusivamente atrás do portal web autenticado do usuário. O protótipo anexado pelo PO utiliza captura de **cookies de sessão** (`orguserid`, `ssid`, `orguseridp`) manualmente ou por extensão de navegador — abordagem não documentada oficialmente, sujeita à expiração periódica (~14 dias), desafios anti-bot/CAPTCHA e mudanças sem aviso prévio.
- **Alternativas Disponíveis:**
  - *Alternativa A — Integração Oficial OAuth 2.0 (Busca de Produtos) + Fluxo Manual/Assistido de Links Afiliados (100% aderente à documentação oficial):* Integra busca de produtos e credenciais OAuth oficiais de `developers.mercadolivre.com.br`, enquanto os links `meli.la` oficiais gerados pelo afiliado no Portal do Afiliado são cadastrados/enfileirados no sistema (sem engenharia reversa nem spoofing de cookies no backend).
    - **Vantagens:** 100% em conformidade com `AGENTS.md` (Regra 2), termos da plataforma e estabilidade em produção.
    - **Desvantagens / Impactos:** Não converte links `meli.la` automaticamente em background sem ação do usuário no portal oficial.
  - *Alternativa B — Busca Oficial OAuth + Endpoint/Integrador Externo Homologado ou Contrato Fornecido pelo PO (estilo protótipo):* Implementar a UI de configuração do Mercado Livre no design ShopeeZap (armazenamento cifrado AES-256-GCM e gerenciamento da conexão/tag), condicionando a geração automática de links `meli.la` ao fornecimento de um contrato oficial/parceiro documentado (ou integrador/extensão autorizada pelo PO executada do lado do navegador do usuário, sem engenharia reversa especulativa nem bypass de CAPTCHA no backend).
    - **Vantagens:** Mantém arquitetura pronta para automação automática caso haja API parceira autorizada ou extensão cliente operando na sessão legítima do afiliado.
    - **Desvantagens / Impactos:** Geração de link em background no backend permanece **BLOQUEADA** até fornecimento de contrato oficial documentado ou definição de arquitetura via extensão cliente do usuário.
  - *Alternativa C — Não implementar Mercado Livre no backend agora (manter bloqueio registrado em `BLK-003`):* Aguardar eventual lançamento de API oficial de Afiliados pelo Mercado Livre.
    - **Vantagens:** Zero esforço com risco de manutenção frágil.
    - **Desvantagens / Impactos:** Não atende usuários interessados em ofertas do Mercado Livre no curto prazo.
- **Recomendação Técnica:** **Alternativa A** (para operação 100% oficial imediata com busca via OAuth `/sites/MLB/search` + fila de ofertas/links oficiais `meli.la` gerados pelo afiliado) ou **Alternativa B** caso o PO já possua contrato/documentação de API parceira oficial para anexar ao projeto.
- **Bloqueia etapa?** **DESBLOQUEADA APÓS APROVAÇÃO.**
- **Status:** **APROVADA PELO PO (2026-11-11) — Aprovada implementação das Alternativas A e B controladas por Feature Flags (`ml_alternative_b_enabled=true` por padrão; `ml_alternative_a_enabled=false` por padrão).**
- **Decisão Oficial:** Ver [`DEC-005` em DECISION_LOG.md](DECISION_LOG.md#dec-005-integração-híbrida-mercado-livre-com-alternativas-a-e-b-controladas-por-feature-flags).
