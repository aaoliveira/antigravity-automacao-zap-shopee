# PRODUCTION_READINESS.md — Prontidão para Operação e Implantação em Produção

> **Projeto:** SaaS Multi-tenant de Automação de Afiliados Shopee + WhatsApp via Evolution API  
> **Responsável:** Lead SRE & Platform Engineer  
> **Data:** 09/11/2026  
> **Status de Prontidão:** 🟢 **APROVADO PARA PRODUÇÃO (COM CHECKLIST VALIDADO)**

---

## 1. Visão Geral da Arquitetura em Produção

O sistema é construído como um **monólito modular pragmático**, empacotado em contêineres Docker otimizados, utilizando arquitetura orientada a filas assíncronas para segregação de carga entre a API HTTP e os workers de execução de automações.

```
                      +-----------------------------+
                      |   Cloudflare / Nginx (TLS)  |  Porta 443 (HTTPS)
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
+-----------------------------+               +-----------------------------+
|    Frontend (Vue 3 / SPA)   |               |    Backend API / Worker     |
|   Nginx Alpine (Porta 5173) |               |  NestJS + Node 20 (Porta 3000)
+-----------------------------+               +--------------+--------------+
                                                             |
                                      +----------------------+----------------------+
                                      |                                             |
                                      v                                             v
                       +-----------------------------+               +-----------------------------+
                       |    PostgreSQL 16 (Dados)    |               |       Redis 7 (Filas/Locks) |
                       |   Volume: shopee_zap_pgdata |               |  Volume: shopee_zap_redis   |
                       +-----------------------------+               +-----------------------------+
```

---

## 2. Checklist de Prontidão Operacional (Production Readiness Review)

### 2.1 Terminação TLS / HTTPS
- **Status:** OBRIGATÓRIO EM PRODUÇÃO.
- **Configuração:** O backend e o frontend devem operar atrás de um reverse proxy com terminação TLS (ex: Nginx, Traefik ou Cloudflare Proxy).
- **Cabeçalhos de Segurança:** O middleware `helmet` no backend injeta:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (em HTTPS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`

### 2.2 Gestão Estrita de Variáveis de Ambiente
O checklist abaixo deve ser verificado antes da inicialização em ambiente de produção:

| Variável | Requisito em Produção | Impacto se Incorreto |
| :--- | :--- | :--- |
| `NODE_ENV` | Deve ser estritamente `production` | Desativa logs de debug e força comportamentos de segurança. |
| `ENCRYPTION_MASTER_KEY` | Hexadecimal de 64 caracteres (256 bits) gerada aleatoriamente via KMS / Vault | O backend recusa inicializar se a chave tiver tamanho incorreto. |
| `JWT_SECRET` | Chave criptográfica aleatória de no mínimo 32 caracteres | Previne falsificação de tokens de autenticação. |
| `JWT_REFRESH_SECRET` | Chave distinta do `JWT_SECRET`, mínimo 32 caracteres | Garante isolamento entre renovação e acesso de curto prazo. |
| `EVOLUTION_WEBHOOK_SECRET`| String de alta entropia (mínimo 32 caracteres) | O webhook rejeita conexões em produção se esta variável não estiver definida. |
| `DATABASE_URL` | String de conexão segura para PostgreSQL com SSL (`sslmode=require`) | Protege o tráfego de dados entre aplicação e banco. |
| `REDIS_HOST` / `REDIS_PORT` | Instância Redis protegida com senha (`requirepass`) e TLS se externa | Previne acesso indevido à fila e interceptação de jobs. |

### 2.3 Migrações de Banco de Dados
- **Comando em Pipeline:** `npx prisma migrate deploy` executado como passo pré-deploy no contêiner ou job de migração.
- **Atomicidade:** Migrações do Prisma rodam em transações PostgreSQL, garantindo reversão automática em caso de erro na aplicação da DDL.
- **Regra:** Nunca rodar `prisma migrate dev` em produção.

### 2.4 Política de Backup e Recuperação (Disaster Recovery)
- **RPO (Recovery Point Objective):** Máximo de 1 hora.
- **RTO (Recovery Time Objective):** Máximo de 30 minutos.
- **Rotina de Backup PostgreSQL:**
  - Backup lógico diário via `pg_dump` com compressão gzip e envio para bucket de armazenamento frio (AWS S3 Glacier / GCP Coldline) com versionamento e imutabilidade (Object Lock).
  - WAL Archiving contínuo para suporte a Point-in-Time Recovery (PITR) em bases gerenciadas.
- **Rotina de Persistência Redis:**
  - Snapshot RDB a cada 15 minutos (`save 900 1`) e Append-Only File (`appendonly yes`) a cada segundo para garantir que jobs em fila e agendamentos não sejam perdidos em reinícios.

### 2.5 Health Checks e Sondagem de Integridade
O módulo `HealthModule` expõe endpoints via `@nestjs/terminus`:
- `GET /api/health`: Checagem rasa (Liveness Probe) — indica se o processo Node.js está respondendo.
- `GET /api/health/ready`: Checagem profunda (Readiness Probe) — valida conexão ativa com o banco PostgreSQL (`prisma.pingCheck`) e com o Redis (`redis.pingCheck`).
- **Comportamento em Orquestração:**
  - Se `/api/health/ready` falhar por 3 vezes consecutivas (timeout de 5s), o orquestrador (Docker Compose / Kubernetes) suspende o envio de tráfego para a réplica até a recuperação.

### 2.6 Limites de Recursos de Contêineres (Capacity Planning)
Configuração recomendada para o arquivo `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M

  redis:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1024M
```

### 2.7 Privacidade, Retenção e Conformidade LGPD
- **Princípio da Minimização:** Armazenam-se exclusivamente os metadados necessários para a auditoria do negócio (`itemId`, `productUrl`, `shortLink`, `price`, `imageUrl`).
- **Política de Retenção de Histórico:**
  - Snapshots de produtos e execuções: retenção mínima de 30 dias (garantindo a janela de desduplicação configurada de 7 a 30 dias).
  - Registros de log de telemetria HTTP: retenção máxima de 90 dias com rotação automática.
- **Exclusão de Conta / Expurgo de Dados:**
  - Todas as tabelas filhas possuem constraints `ON DELETE CASCADE` vinculadas a `tenants.id` e `users.id`.
  - Ao excluir um tenant, credenciais cifradas, instâncias, grupos, automações e histórico associado são expurgados de forma atômica e irreversível do banco relacional.

### 2.8 Observabilidade e Telemetria
- **Correlação de Rastreamento:** Todo request recebe um identificador `X-Request-Id` (UUID v4) propagado nos headers de resposta e em todas as linhas de log de erro (`AllExceptionsFilter`).
- **Métricas Chave para Monitoramento:**
  - **Fila BullMQ:** Contadores de jobs `waiting`, `active`, `completed`, `failed` na fila `automations-execution-queue`.
  - **Taxa de Erro por Provedor Externo:**
    - Erros Shopee (ex: código `10035` ou `429`).
    - Erros Evolution API (ex: `403 Contact not in group` ou `503 Service Unavailable`).
  - **Locks Pendentes:** Monitoramento do volume de chaves `lock:automation:*` no Redis.
