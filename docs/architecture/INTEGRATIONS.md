# Registro Oficial de Integrações e Contratos de APIs Externas (INTEGRATIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Status:** Investigação Técnica Concluída e Homologada (Prompt 02)  
> **Última Atualização:** 2026-11-11  

---

## 1. Fontes Oficiais Homologadas

1. **Shopee Affiliate Open API:**
   - **Portal de Desenvolvedores:** `https://affiliate.shopee.com.br/open_api/home`
   - **Documentação de Short Link:** `https://affiliate.shopee.com.br/open_api/list?type=short_link`
   - **Endpoint Oficial:** `https://open-api.affiliate.shopee.com.br/graphql`
   - **Contrato Detalhado:** Consulte [`docs/architecture/SHOPEE_API_CONTRACTS.md`](SHOPEE_API_CONTRACTS.md)

2. **Evolution API:**
   - **Documentação Oficial:** `https://docs.evolutionfoundation.com.br/evolution-api`
   - **Versão:** v2.x
   - **Provedor Homologado:** `WHATSAPP-BAILEYS`
   - **Contrato Detalhado:** Consulte [`docs/architecture/EVOLUTION_API_CONTRACTS.md`](EVOLUTION_API_CONTRACTS.md)

3. **Mercado Livre Developers (Alternativa A) & Modo Protótipo/Parceiro (Alternativa B):**
   - **Portal Oficial Developers:** `https://developers.mercadolivre.com.br`
   - **Portal Oficial Afiliados:** `https://www.mercadolivre.com.br/l/afiliados-home`
   - **Contrato Detalhado:** Consulte [`docs/architecture/MERCADO_LIVRE_API_CONTRACTS.md`](MERCADO_LIVRE_API_CONTRACTS.md)

4. **Matriz de Compatibilidade:**
   - Consulte [`docs/architecture/API_COMPATIBILITY_MATRIX.md`](API_COMPATIBILITY_MATRIX.md) para o status de cada operação.

---

## 2. Síntese dos Contratos Técnicos

### 2.1 Shopee Affiliate Open API (GraphQL)
- **Autenticação:** Assinatura SHA-256 no header `Authorization`:  
  `Authorization: SHA256 Credential={AppId},Timestamp={Timestamp},Signature={Signature}`
  $$\text{Signature} = \text{hex\_lowercase}(\text{SHA256}(\text{AppId} + \text{Timestamp} + \text{MinifiedPayload} + \text{AppSecret}))$$
- **Operação de Link:** Mutation `generateShortLink(input: { originUrl, subIds })`
- **Operação de Ofertas:** Query `productOfferV2(keyword, listType, sortType, page, limit)`
- **Categorias:** Não expostas via GraphQL. Resolução oficial aprovada [`DEC-001`](../product/DECISION_LOG.md): parametrização por palavras-chave / nichos de busca.

### 2.2 Evolution API v2 (REST)
- **Autenticação:** Header HTTP `apikey: <api_key>`
- **Instâncias:**
  - Criar: `POST /instance/create`
  - Conectar / QR Code: `GET /instance/connect/{instanceName}`
  - Status da Conexão: `GET /instance/connectionState/{instanceName}`
  - Desconectar: `DELETE /instance/logout/{instanceName}`
  - Deletar: `DELETE /instance/delete/{instanceName}`
- **Grupos:** `GET /group/fetchAllGroups/{instanceName}?getParticipants=false`
- **Publicação:** `POST /message/sendMedia/{instanceName}` com payload JSON (`number` [JID do grupo], `mediatype: "image"`, `media: <URL_MIDIA>`, `caption: <LEGENDA_COM_SPINTAX_E_LINK_CURTO>`, `fileName` dinâmico por plataforma/produto e campo opcional verificado `delay` em ms — consultado em `https://docs.evolutionfoundation.com.br/evolution-api` em `2026-11-11`).

---

## 3. Política de Tolerância Zero com Alucinações de Integração

Fica ratificado que:
1. Nenhum código de conector utilizará endpoints ou operações que divirjam das especificações contidas em `SHOPEE_API_CONTRACTS.md` e `EVOLUTION_API_CONTRACTS.md`.
2. O envio de dados será sempre autenticado e validado antes de qualquer chamada em produção.
