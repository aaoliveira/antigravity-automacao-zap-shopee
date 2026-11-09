# Matriz de Compatibilidade de APIs (API_COMPATIBILITY_MATRIX)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão:** 1.0  
> **Status:** Homologado para o MVP  
> **Data de Atualização:** 2026-11-09  

---

## 1. Visão Geral da Matriz de Compatibilidade

Esta matriz consolida a avaliação técnica formal das operações externas necessárias para o MVP, classificando cada uma como:
- **SUPORTADO:** Contrato confirmado, documentado e viável para o fluxo de produção.
- **NÃO SUPORTADO:** Operação ausente na API externa; alternativa homologada e documentada formalmente.
- **NÃO CONFIRMADO / BLOQUEADO:** Sem documentação ou evidência verificada; proibido implementar até desbloqueio.

---

## 2. Matriz de Integração Shopee Affiliate Open API

| Funcionalidade / Operação | Status | Endpoint / Operação | Provedor / Protocolo | Fonte Documental | Data da Verificação | Notas de Engenharia |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **Autenticação HMAC-SHA256** | **SUPORTADO** | Header `Authorization: SHA256 Credential=...` | HTTP / SHA-256 | Portal Shopee / Doc Oficial | 2026-11-09 | Concatenação estrita de `AppId + Timestamp + MinifiedPayload + Secret`. |
| **Geração de Short Link** | **SUPORTADO** | Mutation `generateShortLink` | GraphQL POST | Portal Shopee Short Link | 2026-11-09 | Retorna link encurtado oficial `shope.ee` com suporte a até 5 `subIds`. |
| **Busca de Ofertas de Produtos** | **SUPORTADO** | Query `productOfferV2` | GraphQL POST | Shopee Open API | 2026-11-09 | Suporta `keyword`, `page`, `limit`, `sortType`. Retorna imagem, preço e link. |
| **Catálogo Nativo de Categorias** | **NÃO SUPORTADO** | Query de Categorias | GraphQL POST | Investigação Shopee API | 2026-11-09 | **Resolução DEC-001:** Usuário configura palavras-chave/nichos de busca por automação. Sem alucinação de categorias. |
| **Detalhes do Produto por ItemId** | **NÃO SUPORTADO** | Query dedicada de item individual | GraphQL POST | Investigação Shopee API | 2026-11-09 | Desnecessário no MVP; `productOfferV2` já fornece todos os dados necessários (título, preço, imagem). |

---

## 3. Matriz de Integração Evolution API (v2.x)

| Funcionalidade / Operação | Status | Endpoint / Rota | Provedor / Engine | Fonte Documental | Data da Verificação | Notas de Engenharia |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **Health / Conexão do Servidor** | **SUPORTADO** | `GET /instance/connectionState/:id` ou `GET /` | REST / JSON | Evolution API v2 Docs | 2026-11-09 | Permite validar se o servidor e a chave global estão ativos. |
| **Criação de Instância** | **SUPORTADO** | `POST /instance/create` | Baileys (`WHATSAPP-BAILEYS`) | Evolution API v2 Docs | 2026-11-09 | Cria instância configurada para pareamento por QR Code. |
| **Geração de QR Code** | **SUPORTADO** | `GET /instance/connect/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Retorna QR Code em string Base64 para renderização direta no frontend. |
| **Consulta de Estado da Sessão** | **SUPORTADO** | `GET /instance/connectionState/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Retorna estados `open`, `close`, `connecting`. |
| **Logout de Instância** | **SUPORTADO** | `DELETE /instance/logout/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Encerra sessão no aparelho sem apagar histórico local. |
| **Exclusão de Instância** | **SUPORTADO** | `DELETE /instance/delete/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Remove a instância completamente do servidor Evolution. |
| **Listagem de Grupos** | **SUPORTADO** | `GET /group/fetchAllGroups/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Retorna JIDs (`@g.us`) e nomes de grupos. Usar `?getParticipants=false`. |
| **Envio de Mídia com Legenda** | **SUPORTADO** | `POST /message/sendMedia/:instanceName` | Baileys | Evolution API v2 Docs | 2026-11-09 | Envia imagem remota via URL com legenda estruturada em requisição única JSON. |
| **Envio de Mídia na Meta Cloud API**| **NÃO CONFIRMADO**| Meta Official Cloud API | Meta Cloud API | Evolution Docs | 2026-11-09 | **Fora do escopo do MVP.** Suporte exclusivo a Baileys para grupos. |
