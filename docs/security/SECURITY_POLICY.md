# Política de Segurança da Aplicação (SECURITY_POLICY)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão:** 1.0 (MVP)  
> **Classificação:** Documento Técnico de Engenharia de Segurança (AppSec)  

---

## 1. Princípios Fundamentais de Segurança

Esta política estabelece os controles de segurança obrigatórios para todo o ciclo de vida do software:
1. **Defesa em Profundidade:** Múltiplas camadas independentes de validação (borda, aplicação, ORM e banco).
2. **Menor Privilégio (PoLP):** Usuários, tokens e containers recebem estritamente as permissões mínimas necessárias.
3. **Privacidade e Proteção de Segredos por Padrão:** Segredos nunca trafegam em texto claro em logs, exceptions ou no frontend.

---

## 2. Criptografia Autenticada em Repouso (AES-256-GCM)

### 2.1 Campos Cifrados no Banco de Dados
- `shopee_credentials.appSecretEncrypted` (App Secret da Shopee Affiliate Open API)
- `evolution_servers.apiKeyEncrypted` (Chave de Acesso Global do Servidor Evolution)

### 2.2 Especificação Criptográfica
- **Algoritmo:** AES-256 em modo GCM (Galois/Counter Mode).
- **Tamanho da Chave:** 256 bits (32 bytes).
- **Vetor de Inicialização (IV / Nonce):** 12 bytes gerados criptograficamente a cada operação (`crypto.randomBytes(12)`). O mesmo IV **nunca** é reutilizado.
- **Tag de Autenticação:** 16 bytes (128 bits), garantindo confidencialidade e integridade. Qualquer adulteração do texto cifrado no banco resulta em falha de autenticação imediata (`Authentication tag failed`).
- **Formato Serializado em Banco:**
  ```text
  iv_hex:ciphertext_hex:auth_tag_hex
  ```

### 2.3 Gestão e Proteção da Chave Mestra (`ENCRYPTION_MASTER_KEY`)
- A chave de criptografia de 256 bits reside exclusivamente em variável de ambiente do sistema operacional ou secrets vault (`.env.production`), **nunca no banco de dados relacional e nunca commitada no Git**.
- O sistema falha no startup caso a variável `ENCRYPTION_MASTER_KEY` esteja ausente ou não possua exatamente 32 bytes decodificados em formato hexadecimal (64 caracteres hex).

---

## 3. Sanitização Rigorosa de Logs e Telemetria

### 3.1 Proibição de Vazamento de Segredos
O interceptor global de logging (`LoggingInterceptor`) e os transportes do Winston/Pino aplicam filtros declarativos de sanitização antes de emitir qualquer linha de log:
- **Campos Ofuscados por Regex/Chave:**
  - `password`, `passwordHash`, `token`, `jwt`, `appSecret`, `apiKey`, `authorization`, `cookie`.
- **URLs Limpas:** Parâmetros confidenciais em query strings (ex: `?token=...`, `?key=...`) são substituídos por `[REDACTED]`.

---

## 4. Isolamento Lógico Multi-Tenant

1. **Extração Imutável de Tenant:** O `tenantId` é obtido exclusivamente a partir do payload assinado do token JWT emitido pelo backend (`req.user.tenantId`).
2. **Proibição de Confiança no Cliente:** Qualquer parâmetro `tenantId` enviado no `body`, `query` ou `params` pelo frontend é sumariamente descartado.
3. **Validação Cruzada de Relacionamentos:** Ao associar recursos (ex: vincular `instanceId` e `groupIds` a uma `Automation`), o service backend consulta no banco com a cláusula obrigatória `WHERE id = :id AND tenant_id = :tenantId`. Se qualquer recurso não pertencer ao tenant autenticado, a operação é rejeitada com HTTP 404 (para não confirmar a existência do recurso de outro cliente).

---

## 5. Armazenamento Seguro de Senhas

- As senhas dos usuários são protegidas utilizando o algoritmo **Argon2id** (ou **Bcrypt** com fator de custo 12).
- Senhas em texto plano nunca são persistidas em memória de forma duradoura e são limpas após a verificação do hash.
