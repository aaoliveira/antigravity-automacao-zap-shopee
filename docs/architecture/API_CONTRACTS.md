# Contratos Internos da API REST do SaaS (API_CONTRACTS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão:** 1.0 (MVP)  
> **Formato:** REST / JSON over HTTPS  
> **Autenticação:** Bearer Token JWT (RFC 7519)  

---

## 1. Padrões Globais da API

### 1.1 Headers Padrão
- **Requisições:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>` (obrigatório em rotas protegidas)
  - `X-Request-Id: <UUID>` (rastreabilidade distribuída)
- **Respostas:**
  - `Content-Type: application/json`
  - `X-Request-Id: <UUID>`

### 1.2 Formato Padrão de Resposta de Sucesso
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2026-11-09T10:45:00.000Z"
  }
}
```

### 1.3 Formato Padrão de Resposta de Erro
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Automação não encontrada ou pertencente a outro tenant.",
    "details": []
  },
  "meta": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2026-11-09T10:45:00.000Z"
  }
}
```

---

## 2. Catálogo de Endpoints

### 2.1 Autenticação e Conta (`/api/auth`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/auth/register` | Cadastro de usuário e criação automática de Tenant | Pública | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | Login com email/senha e emissão de JWT com `tenantId` | Pública | `200`, `401` |
| `POST` | `/api/auth/logout` | Invalidação de sessão local | JWT | `200` |
| `GET` | `/api/auth/me` | Dados do usuário logado e metadados do tenant | JWT | `200`, `401` |

---

### 2.2 Credenciais Shopee (`/api/shopee-credentials`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/shopee-credentials` | Lista credenciais cadastradas (AppSecret mascarado) | JWT | `200` |
| `POST` | `/api/shopee-credentials` | Cadastra e testa credencial (validação com Shopee) | JWT | `201`, `400`, `422` |
| `PUT` | `/api/shopee-credentials/:id` | Atualiza label ou substitui segredo com reteste | JWT | `200`, `404` |
| `DELETE` | `/api/shopee-credentials/:id` | Remove credencial (se não vinculada a automações ativas) | JWT | `200`, `400`, `404` |
| `POST` | `/api/shopee-credentials/:id/test` | Revalida conexão e assinatura HMAC com a Shopee | JWT | `200`, `400` |

---

### 2.3 Servidores Evolution (`/api/evolution-servers`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/evolution-servers` | Lista servidores configurados para o tenant | JWT | `200` |
| `POST` | `/api/evolution-servers` | Configura novo servidor (BaseURL + API Key) com ping | JWT | `201`, `400` |
| `PUT` | `/api/evolution-servers/:id` | Atualiza URL ou chave com revalidação de ping | JWT | `200`, `404` |
| `DELETE` | `/api/evolution-servers/:id` | Remove servidor (se sem instâncias vinculadas) | JWT | `200`, `400`, `404` |

---

### 2.4 Instâncias WhatsApp (`/api/whatsapp-instances`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/whatsapp-instances` | Lista instâncias do tenant com status atual | JWT | `200` |
| `POST` | `/api/whatsapp-instances` | Cria instância no servidor Evolution e gera QR Code | JWT | `201`, `400` |
| `GET` | `/api/whatsapp-instances/:id/qrcode` | Obtém QR Code atualizado em Base64 | JWT | `200`, `404` |
| `GET` | `/api/whatsapp-instances/:id/status` | Consulta estado em tempo real (`open`, `close`) | JWT | `200`, `404` |
| `POST` | `/api/whatsapp-instances/:id/logout` | Realiza logout da instância no WhatsApp | JWT | `200`, `400` |
| `DELETE` | `/api/whatsapp-instances/:id` | Exclui instância do servidor e do banco local | JWT | `200`, `404` |

---

### 2.5 Grupos do WhatsApp (`/api/whatsapp-groups`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/whatsapp-groups` | Lista grupos sincronizados com busca por nome | JWT | `200` |
| `POST` | `/api/whatsapp-groups/sync/:instanceId`| Força sincronização de grupos via Evolution API | JWT | `200`, `400` |

---

### 2.6 Automações (`/api/automations`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/automations` | Lista automações do tenant com filtros de status | JWT | `200` |
| `GET` | `/api/automations/:id` | Detalhes da automação (grupos, nichos, horários) | JWT | `200`, `404` |
| `POST` | `/api/automations` | Cria nova automação com validação de propriedade | JWT | `201`, `400` |
| `PUT` | `/api/automations/:id` | Atualiza parâmetros, agendamento ou destinos (somente se pausada/inativa) | JWT | `200`, `400`, `404`, `409` |
| `PATCH` | `/api/automations/:id/pause` | Pausa temporariamente a automação (`PAUSED`) | JWT | `200`, `404`, `409` |
| `PATCH` | `/api/automations/:id/deactivate` | Inativa a automação (`INACTIVE`), liberando exclusão | JWT | `200`, `404`, `409` |
| `PATCH` | `/api/automations/:id/resume`| Reativa a automação (`ACTIVE`) recalculando horários | JWT | `200`, `404`, `409` |
| `POST` | `/api/automations/:id/execute-now` | Disparo manual imediato (bloqueado se `INACTIVE`) | JWT | `202`, `409`, `404` |
| `DELETE` | `/api/automations/:id` | Exclui a automação (somente se `INACTIVE`) | JWT | `200`, `404`, `409` |

---

### 2.7 Histórico e Dashboard (`/api/history` e `/api/dashboard`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/history/executions` | Lista execuções paginadas com status e métricas | JWT | `200` |
| `GET` | `/api/history/executions/:id` | Detalhes completos da execução e publicações por grupo | JWT | `200`, `404` |
| `GET` | `/api/dashboard/summary` | Indicadores em tempo real para os cards do painel | JWT | `200` |
| `GET` | `/api/dashboard/upcoming`| Próximas 5 execuções agendadas | JWT | `200` |

---

### 2.8 Webhooks da Evolution API (`/api/webhooks/evolution`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/webhooks/evolution` | Recebe eventos `CONNECTION_UPDATE` e `QRCODE_UPDATED` | Header Secreto | `200`, `401` |

---

### 2.9 Cupons por Plataforma de Afiliados (`/api/coupons`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/coupons/platforms` | Lista plataformas de afiliados integradas no sistema (`SHOPEE`, `MERCADO_LIVRE`) | JWT | `200` |
| `GET` | `/api/coupons` | Lista cupons do tenant com busca e filtros (`platform`, `isActive`) | JWT | `200` |
| `POST` | `/api/coupons` | Cadastra novo cupom com regras de uso e limite de 50/tenant | JWT | `201`, `400` |
| `GET` | `/api/coupons/:id` | Detalhes de cupom isolado ao tenant | JWT | `200`, `404` |
| `PUT` | `/api/coupons/:id` | Atualiza benefícios, regras ou restrições do cupom | JWT | `200`, `400`, `404` |
| `PATCH` | `/api/coupons/:id/toggle` | Alterna ativação/inativação do cupom | JWT | `200`, `404` |
| `DELETE` | `/api/coupons/:id` | Exclui cupom pertencente ao tenant | JWT | `200`, `404` |

---

### 2.10 Feature Flags por Tenant (`/api/feature-flags`)

| Método | Rota | Descrição | Auth | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/feature-flags` | Retorna estado das flags do tenant (`ml_alternative_b_enabled=true`, `ml_alternative_a_enabled=false` por padrão) | JWT | `200` |
| `PATCH` | `/api/feature-flags` | Habilita ou desabilita alternativamente `ml_alternative_b_enabled` e `ml_alternative_a_enabled` com trilha de auditoria | JWT | `200`, `400` |

---

### 2.11 Mercado Livre Afiliados Híbrido (`/api/mercadolivre`)

| Método | Rota | Descrição | Auth / Flag | Códigos HTTP |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/mercadolivre/status` | Retorna feature flags ativas e resumo mascarado das contas ML do tenant | JWT | `200` |
| `POST` | `/api/mercadolivre/prototype/config` | Salva tag, cookies cifrados (TTL 14 dias) e Gateway Homologado (com proteção anti-SSRF) | JWT + `Alt B` | `201`, `400`, `403` |
| `DELETE` | `/api/mercadolivre/prototype/config` | Remove cookies e tag da Alternativa B pertencentes ao tenant | JWT + `Alt B` | `200`, `403` |
| `POST` | `/api/mercadolivre/prototype/pairing-token` | Gera token temporário assinado HMAC-SHA256 (15 min) para pareamento no navegador | JWT + `Alt B` | `201`, `403` |
| `POST` | `/api/mercadolivre/prototype/test-conversion` | Valida URL ML e aciona Gateway Homologado ou informa `OFFICIAL_CONTRACT_REQUIRED` | JWT + `Alt B` | `200`, `400`, `403` |
| `POST` | `/api/mercadolivre/extension/sync` | Recebe sincronização do conector/extensão do usuário validada via HMAC pairing token ou `X-Extension-Token` | HMAC / Ext Token + `Alt B` | `200`, `400`, `401`, `403`, `404` |
| `GET` | `/api/mercadolivre/extension/package` | Retorna versão e metadados dinâmicos do pacote independente da extensão Chrome | JWT | `200` |
| `GET` | `/api/mercadolivre/extension/download` | Gera e faz download do pacote `.zip` pronto da extensão Chrome (`manifest.json` + scripts) | JWT + `Alt B` | `200`, `403` |
| `POST` | `/api/mercadolivre/extension/token` | Gera ou rotaciona o token contínuo revogável da extensão (cifrado com AES-256-GCM) | JWT + `Alt B` | `201`, `403` |
| `DELETE` | `/api/mercadolivre/extension/token` | Revoga imediatamente o token contínuo da extensão pertencente ao tenant | JWT + `Alt B` | `200`, `403` |
| `GET` | `/api/mercadolivre/extension/status` | Retorna status mascarado da conta e versão da extensão na plataforma | `X-Extension-Token` + `Alt B` | `200`, `401`, `403` |
| `POST` | `/api/mercadolivre/extension/test-conversion` | Testa conversão de URL ML na extensão via Gateway Parceiro Homologado configurado | `X-Extension-Token` + `Alt B` | `200`, `400`, `401`, `403` |
| `POST` | `/api/mercadolivre/extension/gateway` | Salva Tag e Gateway Homologado (anti-SSRF) diretamente pelo popup da extensão | `X-Extension-Token` + `Alt B` | `200`, `400`, `401`, `403` |
| `DELETE` | `/api/mercadolivre/extension/session` | Limpa tag e cookies de sessão no servidor mantendo pareamento seguro | `X-Extension-Token` + `Alt B` | `200`, `401`, `403` |
| `POST` | `/api/mercadolivre/oauth/credentials` | Salva App ID, Client Secret cifrado e Redirect URI oficial Mercado Livre Developers | JWT + `Alt A` | `201`, `400`, `403` |
| `GET` | `/api/mercadolivre/oauth/authorize-url` | Gera URL oficial `auth.mercadolivre.com.br/authorization` com `state` HMAC | JWT + `Alt A` | `200`, `400`, `403` |
| `POST` | `/api/mercadolivre/oauth/exchange` | Valida `state`, troca `code` em `/oauth/token` e consulta `/users/me` | JWT + `Alt A` | `200`, `400`, `403` |
| `DELETE` | `/api/mercadolivre/oauth/disconnect` | Remove tokens OAuth da conta Mercado Livre do tenant | JWT + `Alt A` | `200`, `403`, `404` |
| `GET` | `/api/mercadolivre/search` | Consulta catálogo oficial Mercado Livre (`/sites/MLB/search`) com vendedor/nickname | JWT + `Alt A` | `200`, `403`, `502` |
| `GET` | `/api/mercadolivre/offers` | Lista fila de ofertas oficiais importadas (`meli.la`) do tenant | JWT + `Alt A` | `200`, `403` |
| `POST` | `/api/mercadolivre/offers` | Importa oferta validando domínio oficial (`mercadolivre.com.br` / `meli.la`) | JWT + `Alt A` | `201`, `400`, `403` |
| `PATCH` | `/api/mercadolivre/offers/:id` | Atualiza ou pausa/ativa oferta na fila | JWT + `Alt A` | `200`, `400`, `403`, `404` |
| `DELETE` | `/api/mercadolivre/offers/:id` | Exclui oferta pertencente ao tenant | JWT + `Alt A` | `200`, `403`, `404` |
