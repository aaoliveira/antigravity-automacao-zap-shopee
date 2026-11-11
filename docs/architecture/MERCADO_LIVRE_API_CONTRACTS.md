# Contratos Oficiais do Mercado Livre Developers (MERCADO_LIVRE_API_CONTRACTS)

> **Projeto:** SaaS Multi-tenant Shopee & Mercado Livre + WhatsApp Automation  
> **Portal Oficial:** `https://developers.mercadolivre.com.br`  
> **API Base Oficial:** `https://api.mercadolibre.com` / Auth Brasil: `https://auth.mercadolivre.com.br`  
> **Data de Verificação:** 2026-11-11  

---

## 1. Endpoints Oficiais Homologados (Alternativa A)

### 1.1 Autorização OAuth 2.0 (`GET https://auth.mercadolivre.com.br/authorization`)
- **Parâmetros de Query:**
  - `response_type=code`
  - `client_id=<APP_ID>`
  - `redirect_uri=<REDIRECT_URI_CADASTRADA>`
  - `state=<TOKEN_CSRF_HMAC_TENANT>`

### 1.2 Troca / Renovação de Token (`POST https://api.mercadolibre.com/oauth/token`)
- **Headers:** `Content-Type: application/x-www-form-urlencoded`, `Accept: application/json`
- **Body (Authorization Code):**
  - `grant_type=authorization_code`
  - `client_id=<APP_ID>`
  - `client_secret=<CLIENT_SECRET>`
  - `code=<AUTHORIZATION_CODE>`
  - `redirect_uri=<REDIRECT_URI>`
- **Body (Refresh Token):**
  - `grant_type=refresh_token`
  - `client_id=<APP_ID>`
  - `client_secret=<CLIENT_SECRET>`
  - `refresh_token=<REFRESH_TOKEN>`
- **Resposta Oficial (`HTTP 200 OK`):**
```json
{
  "access_token": "APP_USR-...",
  "token_type": "Bearer",
  "expires_in": 21600,
  "scope": "offline_access read write",
  "user_id": 123456789,
  "refresh_token": "TG-..."
}
```

### 1.3 Consulta de Usuário Autenticado (`GET https://api.mercadolibre.com/users/me`)
- **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`
- **Campos utilizados:** `id`, `nickname`, `site_id` (`MLB`).

### 1.4 Busca de Produtos Brasil (`GET https://api.mercadolibre.com/sites/MLB/search`)
- **Headers:** `Authorization: Bearer <ACCESS_TOKEN>` (quando conectado via OAuth 2.0)
- **Parâmetros de Query:**
  - `q`: palavra-chave de busca
  - `limit`: limite por página (ex: `20`, máx `50`)
  - `offset`: deslocamento de paginação
- **Campos mapeados de `results[]`:**
  - `id`: ID do anúncio (`MLB...`)
  - `title`: título do produto
  - `price`: preço atual
  - `original_price`: preço original riscado (quando houver)
  - `permalink`: URL pública do produto
  - `thumbnail` (ou `secure_thumbnail`): imagem do produto
  - `seller.id` / `seller.nickname`: identificação do vendedor (usada para restrição de loja em cupons)

---

## 2. Limitação Oficial: Geração de Links de Afiliados (`meli.la`)

- **Fato Verificado:** O Portal oficial `https://developers.mercadolivre.com.br` **não documenta nem expõe endpoint público** para geração programática de links `meli.la` do Programa de Afiliados (`https://www.mercadolivre.com.br/l/afiliados-home`).
- **Conformidade (`DEC-005` / `ADR-008`):**
  - No modo **Alternativa A**, links `meli.la` gerados oficialmente pelo afiliado são importados na fila `MercadoLivreOffer` (ou capturados pelo navegador do usuário).
  - No modo **Alternativa B**, o backend armazena tag e cookie cifrados (`AES-256-GCM`) e aceita URL de **Gateway Integrador Homologado** (`partnerGatewayUrl`, protegido por `EvolutionSsrfValidator`) ou captura enviada diretamente pelo navegador/extensão do próprio usuário autenticado, **sem inventar endpoints internos não documentados no servidor**.
