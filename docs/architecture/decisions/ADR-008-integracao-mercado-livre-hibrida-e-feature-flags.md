# ADR-008: Integração Mercado Livre Híbrida (Alternativa B + Alternativa A) Controlada por Feature Flags

- **Status:** Aprovado (`Q-ML-01` / `DEC-005`)
- **Data:** 2026-11-11
- **Autores:** Product Owner, Software Architect & AppSec Team

---

## Contexto e Problema

A documentação oficial do Mercado Livre (`developers.mercadolivre.com.br`) fornece OAuth 2.0 e busca de produtos (`GET /sites/MLB/search`), mas **não expõe API oficial pública** para geração/encurtamento automático de links do Programa de Afiliados (`meli.la`). Em paralelo, o protótipo de produto apresentado utiliza configuração baseada em cookie de sessão + tag de afiliado + extensão do navegador ou gateway conversor, mantendo a necessidade de também suportar o fluxo 100% oficial quando desejado pelo usuário.

---

## Decisão Tomada e Justificativa

1. **Feature Flags por Tenant / Usuário Logado (`FeatureFlag`):**
   - `ml_alternative_b_enabled`: padrão **`true`** (habilita o módulo estilo protótipo).
   - `ml_alternative_a_enabled`: padrão **`false`** (habilita o fluxo oficial OAuth 2.0 + busca `/sites/MLB/search` + fila assistida `MercadoLivreOffer`).
   - Endpoints `GET /api/feature-flags` e `PATCH /api/feature-flags` permitem ao usuário logado alternar dinamicamente cada modo, com **aplicação estrita da autorização também no backend** (`ForbiddenException` / HTTP `403` caso o endpoint de um modo desabilitado seja chamado).

2. **Alternativa B (`MercadoLivreAccount` — Modo Protótipo / Sessão / Gateway Homologado):**
   - Armazenamento de `affiliateTag`, `sessionCookieEncrypted` (cifrado via **AES-256-GCM**, nunca logado nem devolvido em claro ao frontend, expondo apenas `sessionCookieMasked` e `sessionExpiresAt`), e campos opcionais `partnerGatewayUrl` / `partnerGatewayApiKeyEncrypted` (validados via `EvolutionSsrfValidator`).
   - Captura automática do navegador do usuário autenticado via token de extensão/pareamento (`POST /api/mercadolivre/extension/sync` e `POST /api/mercadolivre/offers` a partir da sessão do browser do próprio usuário).
   - Teste de conversão (`POST /api/mercadolivre/prototype/test-conversion`): utiliza `partnerGatewayUrl` caso homologado/configurado pelo usuário ou informa explicitamente `OFFICIAL_CONTRACT_REQUIRED` sem inventar chamadas internas não documentadas no servidor.

3. **Alternativa A (`MercadoLivreOAuth` + `MercadoLivreOffer` — Modo 100% Oficial):**
   - Fluxo OAuth 2.0 oficial (`APP_ID`, `Client Secret` em AES-256-GCM, `state` assinado com HMAC-SHA256 vinculado ao `tenantId`, troca em `/oauth/token` e renovação automática por `refresh_token`).
   - Busca oficial em `GET /sites/MLB/search` com retorno normalizado incluindo `seller.nickname` (viabilizando restrição por vendedor em cupons!).
   - Fila assistida `MercadoLivreOffer` armazenando ofertas associadas ao link curto oficial `https://meli.la/...` (ou URL oficial `mercadolivre.com.br` com validação anti-Open Redirect).

4. **Integração Nativa em Automações e Cupons:**
   - Inclusão de `MERCADO_LIVRE` em `AffiliatePlatform` (`CouponsModule` + `Automation`).
   - Automações podem operar com `platform: SHOPEE` ou `platform: MERCADO_LIVRE`, aplicando seleção de cupons da respectiva plataforma, desduplicação (`dedupWindowDays`), randomização de grupos e links permanentes.

---

## Consequências

- **Positivas:** Conformidade absoluta com a Regra 2 do `AGENTS.md` (zero alucinação de API não documentada); controle granular em tempo real via Feature Flags por conta; segurança AES-256-GCM, proteção HMAC contra CSRF no OAuth e anti-SSRF em gateways externos.
- **Negativas / Mitigações:** Sem contrato oficial público de geração `meli.la` ou gateway parceiro configurado, a criação de novos links curtos `meli.la` ocorre no navegador do usuário ou via importação na fila de ofertas antes do disparo agendado.
