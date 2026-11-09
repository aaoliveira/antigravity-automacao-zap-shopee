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

## 🔗 Fontes Oficiais de Integração

1. **Shopee Affiliate Open API:**
   - [Portal Oficial de Desenvolvedores](https://affiliate.shopee.com.br/open_api/home)
   - [Documentação de Short Link](https://affiliate.shopee.com.br/open_api/list?type=short_link)

2. **Evolution API:**
   - [Documentação Oficial](https://docs.evolutionfoundation.com.br/evolution-api)

---

## 🛡️ Pilares Fundamentais de Segurança e Arquitetura

1. **Multi-Tenancy Estrito:** Cada tenant possui total isolamento de dados. Credenciais, automações, instâncias WhatsApp e grupos são validados estritamente no backend com base no contexto autenticado.
2. **Criptografia Autenticada:** Todas as chaves secretas (Shopee `AppSecret`, Evolution API Key) são criptografadas em repouso com algoritmo autenticado (AES-256-GCM) e chaves mantidas fora do banco de dados.
3. **Zero Alucinações de API:** Nenhuma integração é construída com base em suposições. Todas as operações baseiam-se em contratos oficiais documentados e verificados.
4. **Idempotência e Observabilidade:** Logs estruturados, controle de concorrência e proteção contra duplicação de disparos.
