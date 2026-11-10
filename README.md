# SaaS Multi-tenant de Automação de Afiliados Shopee + WhatsApp (Evolution API)

Plataforma SaaS multi-tenant que permite a afiliados da Shopee automatizar a curadoria, geração de links de afiliados e publicação programada de ofertas e produtos em grupos de WhatsApp via Evolution API.

---

## 🎯 Metodologia e Governança

Este projeto adota estritamente a metodologia **Spec-Driven Development (SDD)**, com entregas iterativas e rastreáveis organizadas em prompts sequenciais.

> ⚠️ **IMPORTANTE:** Todas as regras permanentes, papéis da equipe e a **política de tolerância zero com alucinações técnicas** estão descritas formalmente em [**`AGENTS.md`**](AGENTS.md). Toda contribuição de código ou arquitetura deve ler e seguir integralmente este arquivo antes de qualquer ação.

---

## 📚 Documentação do Projeto

- **Governança e Regras Permanentes:** [`AGENTS.md`](AGENTS.md)
- **Status de Implementação por Etapa:** [`docs/progress/IMPLEMENTATION_STATUS.md`](docs/progress/IMPLEMENTATION_STATUS.md)
- **Bloqueios, Riscos e Débitos Técnicos:** [`docs/progress/KNOWN_ISSUES.md`](docs/progress/KNOWN_ISSUES.md)
- **Contratos e Evidências de Integração:** [`docs/architecture/INTEGRATIONS.md`](docs/architecture/INTEGRATIONS.md)
- **Decisões de Arquitetura (ADRs):** [`docs/architecture/decisions/`](docs/architecture/decisions/)
- **Prompts de Execução:** [`prompts/`](prompts/)

---

## 🚀 Como Iniciar o Projeto em Desenvolvimento

### 1. Pré-requisitos
- Node.js 20+ (LTS)
- Docker e Docker Compose instalados

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo para `.env`:
```bash
cp .env.example .env
cp .env.example backend/.env
```

### 3. Subir Infraestrutura de Containers (PostgreSQL, Redis & Evolution API)
Os containers rodam em portas isoladas (`5435` para Postgres, `6382` para Redis e `8080` para Evolution API v2) para evitar conflitos com outros serviços locais:
```bash
docker compose up -d postgres redis evolution-api
# Ou utilize o atalho do monorepo:
npm run docker:up
```

### 4. Executar Migrations do Banco de Dados
```bash
cd backend
npx prisma migrate dev
```

### 5. Executar os Testes Automatizados
```bash
# Testes Unitários (Criptografia AES-256-GCM, regras de negócio)
npm run test --workspace=backend

# Testes de Integração e Segurança Multi-Tenant (e2e com banco e redis reais)
npm run test:e2e --workspace=backend
```

### 6. Iniciar os Serviços em Modo de Desenvolvimento
```bash
# Terminal 1: Iniciar Backend (Porta 3005)
cd backend && npm run start:dev

# Terminal 2: Iniciar Frontend (Porta 5173)
cd frontend && npm run dev
```

Acesse a interface no navegador em: `http://localhost:5173`.

---

## 🛡️ Pilares Fundamentais de Segurança e Arquitetura

1. **Multi-Tenancy Estrito:** Cada tenant possui total isolamento de dados. Credenciais, automações, instâncias WhatsApp e grupos são validados estritamente no backend com base no contexto autenticado.
2. **Criptografia Autenticada:** Todas as chaves secretas (Shopee `AppSecret`, Evolution API Key) são criptografadas em repouso com algoritmo autenticado (AES-256-GCM) e chaves mantidas fora do banco de dados.
3. **Zero Alucinações de API:** Nenhuma integração é construída com base em suposições. Todas as operações baseiam-se em contratos oficiais documentados e verificados.
4. **Idempotência e Observabilidade:** Logs estruturados, controle de concorrência com Redis e proteção contra duplicação de disparos.
