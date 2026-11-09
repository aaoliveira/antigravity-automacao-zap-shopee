# Contratos Oficiais da Shopee Affiliate Open API (SHOPEE_API_CONTRACTS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0  
> **Status:** Verificado e Homologado  
> **Data de Verificação:** 2026-11-09  
> **Fonte Oficial:** [Shopee Open API Portal](https://affiliate.shopee.com.br/open_api/home) e [Documentação Short Link](https://affiliate.shopee.com.br/open_api/list?type=short_link)

---

## 1. Informações Gerais de Transporte e Ambiente

- **Protocolo / Transporte:** HTTPS / JSON over GraphQL
- **Método HTTP:** Estritamente `POST` (tanto para Queries quanto Mutations)
- **Endpoint Oficial de Produção (Brasil):**  
  `https://open-api.affiliate.shopee.com.br/graphql`
- **Content-Type:** `application/json`

---

## 2. Autenticação e Algoritmo de Assinatura (Signature)

A Shopee Affiliate Open API utiliza um modelo de autenticação baseado em hash SHA-256 no cabeçalho `Authorization`.

### 2.1 Formato do Header `Authorization`
```http
Authorization: SHA256 Credential={AppId},Timestamp={Timestamp},Signature={Signature}
```

### 2.2 Algoritmo de Assinatura
A assinatura é calculada através da concatenação direta (sem espaços, delimitadores ou quebras de linha adicionais) de 4 fatores em ordem exata:

$$\text{Factor} = \text{AppId} + \text{Timestamp} + \text{MinifiedPayload} + \text{AppSecret}$$

$$\text{Signature} = \text{hex\_lowercase}(\text{SHA256}(\text{Factor}))$$

- **`AppId`:** String numérica identificadora do aplicativo no portal Shopee Affiliate.
- **`Timestamp`:** Inteiro Unix em segundos (`int(time.time())`).
- **`MinifiedPayload`:** String JSON exata enviada no corpo da requisição HTTP (`body`), sem espaços em branco desnecessários entre chaves e valores (`json.dumps(..., separators=(',', ':'))`).
- **`AppSecret`:** Chave secreta em texto claro obtida no portal da Shopee.

> ⚠️ **Atenção Crítica:** Se o JSON enviado no corpo da requisição for minimamente diferente do serializado no cálculo do hash (ex: espaços ou formatação bonita), o servidor retornará `Invalid Signature`.

---

## 3. Operação 1: Geração de Short Link de Afiliado (`generateShortLink`)

### 3.1 Especificação GraphQL
- **Tipo de Operação:** Mutation
- **Campo:** `generateShortLink`

```graphql
mutation GenerateShortLink($input: ShortLinkInput!) {
  generateShortLink(input: $input) {
    shortLink
  }
}
```

### 3.2 Schema de Entrada (`ShortLinkInput`)
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `originUrl` | `String!` | **Sim** | URL original de produto, loja ou campanha na Shopee (ex: `https://shopee.com.br/produto-i.123.456`). |
| `subIds` | `[String]` | Não | Array de até 5 sub-IDs (identificadores de rastreio de campanha, ex: `["whatsapp_vip", "automacao_casa"]`). |

### 3.3 Exemplo Real de Requisição (POST Payload)
```json
{"query":"mutation { generateShortLink(input: { originUrl: \"https://shopee.com.br/product/12345/67890\", subIds: [\"zap_grupo_vip\"] }) { shortLink } }"}
```

### 3.4 Exemplo de Resposta de Sucesso
```json
{
  "data": {
    "generateShortLink": {
      "shortLink": "https://shope.ee/m9XyzAbc"
    }
  }
}
```

---

## 4. Operação 2: Busca e Listagem de Ofertas de Produtos (`productOfferV2`)

### 4.1 Especificação GraphQL
- **Tipo de Operação:** Query
- **Campo:** `productOfferV2`

```graphql
query FetchProducts($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
  productOfferV2(
    keyword: $keyword
    listType: 0
    sortType: $sortType
    page: $page
    limit: $limit
  ) {
    nodes {
      itemId
      productName
      productLink
      offerLink
      imageUrl
      priceMin
      priceMax
      price
      commissionRate
      commission
      sales
      ratingStar
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
```

### 4.2 Parâmetros de Entrada
| Parâmetro | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `keyword` | `String` | Não | Palavra-chave de busca ou nicho (ex: "cozinha", "fone bluetooth", "maquiagem"). |
| `listType` | `Int` | Não | Tipo de listagem (0: Todas as ofertas, 1: Top produtos). Padrão recomendado: `0`. |
| `sortType` | `Int` | Não | Critério de ordenação (1: Relevância, 2: Vendas, 3: Preço desc, 4: Preço asc, 5: Comissão). Padrão: `1` ou `2`. |
| `page` | `Int` | Não | Número da página (1-indexed). |
| `limit` | `Int` | Não | Quantidade de itens por página (ex: 10, 20, 50). Recomendado: `20`. |

### 4.3 Campos de Retorno do Produto (`nodes`)
- **`itemId`** (`String` ou `Int`): Identificador único do produto no marketplace da Shopee.
- **`productName`** (`String`): Título descritivo do produto.
- **`productLink`** (`String`): URL direta original do produto.
- **`offerLink`** (`String`): Link da oferta pré-gerado.
- **`imageUrl`** (`String`): URL da imagem principal do produto no CDN da Shopee.
- **`priceMin` / `priceMax` / `price`** (`Float` ou `String`): Valores praticados no anúncio.
- **`commissionRate`** (`Float`): Percentual de comissão estimada.

### 4.4 Exemplo de Resposta de Sucesso
```json
{
  "data": {
    "productOfferV2": {
      "nodes": [
        {
          "itemId": "18492019481",
          "productName": "Garrafa Térmica Inox 500ml com Sensor de Temperatura Digital",
          "productLink": "https://shopee.com.br/garrafa-termica-i.18492019481.99281",
          "offerLink": "https://shope.ee/testOffer",
          "imageUrl": "https://down-br.img.susercontent.com/file/br-11134207-7r98o-lx192837",
          "price": "29.90",
          "priceMin": "29.90",
          "priceMax": "39.90",
          "commissionRate": "0.08"
        }
      ],
      "pageInfo": {
        "page": 1,
        "limit": 20,
        "hasNextPage": true
      }
    }
  }
}
```

---

## 5. Status da Operação de Categorias e Resolução Formal

- **Investigação:** A Shopee Affiliate Open API **não disponibiliza** uma query GraphQL de listagem de categorias (`query categories` ou `query categoryList`). O modelo de descoberta de produtos do portal é estritamente baseado no campo `keyword` e filtros de busca da query `productOfferV2`.
- **Resolução Oficial Aprovada (`DEC-001`):** Conforme decisão do Product Owner registrada em [`DECISION_LOG.md`](../product/DECISION_LOG.md), a seleção de categorias no SaaS é implementada como configuração de palavras-chave / nichos de busca pelo usuário (ex: "cozinha", "moda", "celular", "decoração"), preservando 100% de conformidade com a Regra 2 (Zero Alucinações).

---

## 6. Tratamento de Erros e Limitações Conhecidas

### Códigos de Erro Mapeados
| Código HTTP / GraphQL | Erro | Causa Típica | Ação do Sistema |
| :---: | :--- | :--- | :--- |
| `200` com `errors` | `Invalid Signature` | Incompatibilidade entre payload serializado e a assinatura SHA-256 gerada. | Abortar, logar erro de autenticação e verificar normalização do JSON. |
| `200` com `errors` | `AppId not found` | Credencial inválida ou desabilitada no portal Shopee. | Marcar credencial como `INVALID` no tenant e notificar usuário. |
| `429` | `Too Many Requests` | Limite de taxa excedido na API da Shopee. | Aplicar backoff exponencial e postergar próximo disparo. |
| `500 / 503` | `Service Unavailable` | Indisponibilidade momentânea nos servidores da Shopee. | Retentar até 2 vezes com intervalo de 5s; abortar se persistir sem afetar outras automações. |
