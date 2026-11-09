# Modelo de Ameaças e Mitigações Técnicas (THREAT_MODEL)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Metodologia:** STRIDE (Microsoft Threat Modeling)  
> **Versão:** 1.0 (MVP)  

---

## 1. Mapeamento de Ameaças pelo Modelo STRIDE

| Categoria STRIDE | Ameaça Identificada | Impacto | Nível de Risco | Mitigação Arquitetural Implementada |
| :--- | :--- | :--- | :---: | :--- |
| **Spoofing** (Falsificação de Identidade) | Usuário malicioso tenta forjar chamadas de API passando o `tenantId` de outro cliente. | Acesso indevido a automações e dados confidenciais de terceiros. | **Crítico** | O `tenantId` é extraído exclusivamente da assinatura criptográfica do JWT autenticado no backend. Parâmetros enviados pelo cliente são ignorados. |
| **Spoofing** | Requisições falsas fingindo ser webhooks da Evolution API. | Alteração arbitrária de status de instâncias. | **Alto** | Webhooks utilizam token secreto no header `x-webhook-secret` validado pelo guard da aplicação. |
| **Tampering** (Adulteração de Dados) | Tentativa de alterar o `AppSecret` criptografado diretamente no banco de dados. | Corrupção de credenciais ou injeção de payload. | **Crítico** | Criptografia autenticada AES-256-GCM com tag de autenticação de 128 bits. Qualquer adulteração é detectada e a decifragem falha imediatamente. |
| **Repudiation** (Não Repúdio) | Afiliado alega que disparos indevidos foram feitos sem seu consentimento. | Disputas operacionais e responsabilização por spam. | **Médio** | Registro imutável de `AuditLog` com `userId`, timestamp UTC, IP de origem e ação executada. |
| **Information Disclosure** (Vazamento de Informação) | Vazamento do `AppSecret` da Shopee ou da API Key da Evolution API em logs ou respostas da API. | Roubo de credenciais e prejuízo financeiro com afiliação. | **Crítico** | Criptografia em repouso, segredos nunca retornados na íntegra na API (apenas mascarados `****1234`) e filtro de sanitização em logs. |
| **Denial of Service** (Negação de Serviço) | Criação de centenas de automações com frequência de 1 minuto sobrecarregando a fila e banindo instâncias. | Esgotamento de workers Redis e bloqueio de chips de WhatsApp. | **Alto** | Validação estrita de limites: frequência mínima de 15 minutos, máximo diário configurável e locks distribuídos por automação. |
| **Elevation of Privilege** (Elevação de Privilégio) | Membro de um tenant tenta alterar configurações administrativas ou acessar outro tenant. | Quebra do modelo de controle de acesso (RBAC). | **Alto** | RBAC nativo com roles (`OWNER`, `ADMIN`, `MEMBER`) e validação de tenant em 100% dos services e queries Prisma. |

---

## 2. Superfície de Ataque e Controles de Borda

1. **Rate Limiting na Camada HTTP (Nginx / NestJS Throttler):**
   - Limite de 60 requisições por minuto por IP para rotas públicas (`/api/auth/*`).
   - Limite de 300 requisições por minuto por IP para rotas autenticadas da aplicação.
2. **Prevenção de Injeção SQL / NoSQL:**
   - O uso estrito do Prisma ORM com queries tipadas e parametrizadas elimina riscos de injeção SQL nativa.
3. **CORS e Cabeçalhos de Segurança (Helmet):**
   - Configuração de `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` e `Strict-Transport-Security`.
