# ShopeeZap — Conector Mercado Livre (Extensão Chrome Independente)

Extensão Google Chrome **Manifest V3** projetada para evoluir de forma **independente** do backend/frontend principal do ShopeeZap, comunicando-se exclusivamente por contrato HTTP versionado (`src/config/contracts.js`).

## Estrutura Desacoplada

- `manifest.json`: Metadados MV3 e permissões estritas (`mercadolivre.com.br`, `mercadolibre.com`, `meli.la` + `optional_host_permissions` para o domínio do cliente).
- `src/config/contracts.js`: Versão do contrato (`1.0.0`) e endpoints da API.
- `src/services/`: Coleta de cookies (`cookie-collector.js`), armazenamento (`storage.js`) e cliente HTTP puro (`api-client.js`).
- `src/content/ml-extractor.js`: Extrator resiliente do DOM/JSON-LD no Mercado Livre.
- `src/background/service-worker.js`: Orquestrador MV3 em segundo plano.
- `src/popup/`: Interface do usuário no popup da extensão.
- `tests/`: Testes automatizados nativos via `node:test` (zero dependências externas).

## Como Evoluir de Forma Independente

1. Altere os arquivos em `src/` ou `manifest.json` (atualizando `"version"` em `manifest.json`, `package.json` e `src/config/contracts.js`).
2. Execute a suíte isolada da extensão:
   ```bash
   cd extensions/mercadolivre-chrome
   npm test
   ```
3. O backend do ShopeeZap lê dinamicamente o `manifest.json` e os arquivos desta pasta no endpoint `GET /api/mercadolivre/extension/download` (ou via variável `ML_EXTENSION_DIR`), disponibilizando automaticamente a nova versão `.zip` para os usuários sem necessidade de alterar o código do backend/frontend.
4. Caso queira distribuir um `.zip` avulso manualmente:
   ```bash
   npm run package
   ```
   O pacote gerado fica em `dist/shopeezap-ml-extensao-v<versao>.zip`.

Consulte o manual completo do usuário em [`../../docs/manuals/EXTENSAO_CHROME_MERCADO_LIVRE.md`](../../docs/manuals/EXTENSAO_CHROME_MERCADO_LIVRE.md).
