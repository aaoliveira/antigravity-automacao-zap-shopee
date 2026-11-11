# Changelog — ShopeeZap Conector Mercado Livre (Extensão Chrome)

Todas as alterações notáveis desta extensão independente são documentadas aqui.

## [1.0.0] - 2026-11-11
### Adicionado
- Manifest V3 desacoplado com permissões mínimas (`cookies`, `storage`, `activeTab`).
- Captura segura de cookies Mercado Livre (incluindo `HttpOnly`: `orguserid`, `ssid`, `orguseridp`).
- Autenticação por Token da Extensão revogável (`X-Extension-Token`) com suporte a pareamento temporário.
- Extração automática de anúncio na aba aberta (`title`, `price`, `sellerName`, `imageUrl`, `mlItemId`) e detecção de links `meli.la`.
- Conversão via Gateway Parceiro Homologado configurado no tenant e envio de ofertas para fila de automações.
- Detector de nova versão disponível na plataforma (`X-Extension-Version` vs versão do pacote).
