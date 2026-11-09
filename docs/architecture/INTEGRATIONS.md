# Registro Oficial de Integrações e Contratos de APIs Externas (INTEGRATIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Status:** Estrutura base de governança inicializada  
> **Última Atualização:** 2026-11-09

Este documento registra exclusivamente informações verificadas das APIs de terceiros. **É terminantemente proibido inserir contratos, operações, schemas ou parâmetros especulativos ou alucinados.**

---

## 1. Fontes Oficiais Referenciadas

1. **Shopee Affiliate Open API:**
   - Portal Oficial de Desenvolvedores: `https://affiliate.shopee.com.br/open_api/home`
   - Documentação de Short Link / Ofertas: `https://affiliate.shopee.com.br/open_api/list?type=short_link`
   - Ambiente / Domínio de Chamadas: `https://open-api.affiliate.shopee.com.br` (a ser confirmado no Prompt 02)
   - Modelo de Autenticação: Assinatura HMAC com `AppId`, `AppSecret` e `Timestamp` (a ser detalhado formalmente com evidências oficiais).

2. **Evolution API:**
   - Documentação Oficial: `https://docs.evolutionfoundation.com.br/evolution-api`
   - Escopo de Funcionalidades Requeridas:
     - Gerenciamento de Instâncias (`create`, `connect`, `status`, `logout`, `delete`)
     - Obtenção de QR Code / Conexão (Provider Baileys)
     - Consulta e listagem de grupos do WhatsApp (`findGroups` / `fetchAllGroups`)
     - Envio de mensagens com imagem, texto e formatação (`sendMedia` / `sendImage`)

---

## 2. Matriz de Mapeamento de Contratos (a ser preenchida no Prompt 02)

| Sistema | Operação / Endpoint | Método / Tipo | Versão Documentada | Status de Verificação | Data da Evidência |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Shopee** | `generateShortLink` | POST / GraphQL | A verificar | Aguardando Prompt 02 | - |
| **Shopee** | `productOfferV2` / Listagem | POST / GraphQL | A verificar | Aguardando Prompt 02 | - |
| **Shopee** | Consulta de Categorias | A verificar | A verificar | Aguardando Prompt 02 | - |
| **Evolution** | Criação de Instância | POST | v2.x | Aguardando Prompt 02 | - |
| **Evolution** | Obter QR Code / Conexão | GET / POST | v2.x | Aguardando Prompt 02 | - |
| **Evolution** | Buscar Grupos | GET / POST | v2.x | Aguardando Prompt 02 | - |
| **Evolution** | Enviar Imagem com Legenda | POST | v2.x | Aguardando Prompt 02 | - |

---

## 3. Diretriz para Registro de Evidências

Para cada contrato analisado no `Prompt 02`, registrar:
1. URL exata da documentação oficial.
2. Cabeçalhos (`Headers`) obrigatórios e algoritmo de autenticação.
3. Exemplo real do payload de requisição (`Request Body`).
4. Exemplo real do payload de resposta (`Response Body`) com casos de sucesso e erro.
5. Limites de taxa (`Rate Limits`) conhecidos.
