# ADR-009: Extensão Google Chrome Desacoplada para Alternativa B (Mercado Livre) e Distribuição pela Plataforma

- **Status:** Aprovado (`DEC-006`)
- **Data:** 2026-11-11
- **Contexto:** Após a entrega da integração híbrida do Mercado Livre (`ADR-008`), o Product Owner solicitou a criação de uma extensão Google Chrome para executar todas as etapas da Alternativa B, com suporte a download diretamente pela plataforma, arquitetura preparada para evolução independente e manual detalhado de instalação.

---

## 1. Problema Arquitetural

1. Um bookmarklet (`document.cookie`) não consegue ler cookies `HttpOnly` do Mercado Livre e não oferece uma UI completa de captura de ofertas/vendedores na aba ativa.
2. A extensão precisa evoluir e receber melhorias de seletores DOM, popup e coletores **sem depender de rebuild ou deploy acoplado** do backend NestJS ou frontend Vue 3.
3. Tokens temporários de 15 minutos não são práticos para uso contínuo em navegador instalado; ainda assim, é obrigatório manter autenticação segura, revogabilidade imediata e isolamento multi-tenant.

---

## 2. Alternativas Consideradas

- **A) Extensão acoplada dentro de `frontend/` com build único Vite e autenticação via senha do usuário:**
  - *Contras:* acopla o ciclo de release da extensão ao frontend e expõe credenciais principais do usuário no `chrome.storage`.
- **B) Pacote autônomo Manifest V3 em `extensions/mercadolivre-chrome/` com contrato HTTP versionado e empacotamento dinâmico `.zip` no backend (Escolhida):**
  - *Prós:* Zero bundler obrigatório no pacote final; suíte de testes própria (`node --test`); evolução independente via `ML_EXTENSION_DIR` ou diretório isolado; backend lê dinamicamente `manifest.json` e empacota `.zip` com proteção anti-*path-traversal*; autenticação via Token da Extensão revogável (`extensionTokenEncrypted` cifrado com `AES-256-GCM`).

---

## 3. Decisão Tomada

1. **Extensão Manifest V3 Independente ([`extensions/mercadolivre-chrome/`](../../../extensions/mercadolivre-chrome/README.md)):**
   - Permissões estritas: `cookies`, `storage`, `activeTab`, `host_permissions` apenas para domínios Mercado Livre e `optional_host_permissions` solicitada sob demanda no popup para a URL do SaaS.
   - Camadas desacopladas: `src/config/contracts.js` (versão do contrato `1.0.0`), `src/services/cookie-collector.js` (`chrome.cookies.getAll`, incluindo `HttpOnly`), `src/content/ml-extractor.js` (extração DOM/JSON-LD/`meli.la`), `src/services/api-client.js`, `src/background/service-worker.js` e `src/popup/`.
2. **Backend (`MercadoLivreController` / `extension-zip.util.ts` / `main.ts`):**
   - `GET /api/mercadolivre/extension/package` e `GET /api/mercadolivre/extension/download` empacotam os arquivos runtime em ZIP padrão sem dependências externas (`zlib`), bloqueando se `ml_alternative_b_enabled=false`.
   - `POST/DELETE /api/mercadolivre/extension/token` gerencia token contínuo revogável validado via header `X-Extension-Token` (sem expor tokens na URL), além de endpoints dedicados (`/extension/status`, `/extension/sync`, `/extension/test-conversion`, `/extension/gateway`, `/extension/session`).
   - CORS atualizado em `main.ts` para aceitar origens válidas `chrome-extension://[a-z]{32}` e headers da extensão.
3. **Frontend & Manual:**
   - Card em `MercadoLivreView.vue` exibe versão dinâmica, download `.zip`, geração/rotação/revogação de token e manual interativo passo a passo, acompanhado por [`docs/manuals/EXTENSAO_CHROME_MERCADO_LIVRE.md`](../../manuals/EXTENSAO_CHROME_MERCADO_LIVRE.md).

---

## 4. Consequências

- **Positivas:** Evolução independente garantida (`version` e novos seletores DOM no ML podem ser atualizados na extensão e distribuídos via download `.zip` instantaneamente), coleta real de cookies `HttpOnly` e zero violação das regras de segurança/não-alucinação (`AGENTS.md`).
- **Negativas / Cuidados:** Enquanto não publicada na Chrome Web Store, a instalação requer ativação do *Modo do desenvolvedor* em `chrome://extensions` (*Carregar sem compactação*), documentada passo a passo no manual.
