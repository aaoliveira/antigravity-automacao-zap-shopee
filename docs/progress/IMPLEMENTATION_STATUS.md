# Status de Implementação do Projeto (IMPLEMENTATION_STATUS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Última Atualização:** 2026-11-09  

---

## 1. Visão Geral das Etapas

| Etapa | Descrição | Status | Data de Conclusão | Critérios Atendidos | Evidências / Notas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Prompt 00** | Governança permanente, contexto e prevenção de alucinações | **CONCLUÍDO** | 2026-11-09 | 5 / 5 | `AGENTS.md`, `README.md`, `prompts/00-...` criados com regras inegociáveis. |
| **Prompt 01** | Discovery, PRD e especificações funcionais | **PENDENTE** | - | 0 / 7 | Aguardando execução do Prompt 01. |
| **Prompt 02** | Investigação técnica das APIs e contratos de integração | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 02. |
| **Prompt 03** | Arquitetura, modelo de dados e desenho de segurança | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 03. |
| **Prompt 04** | Fundação, autenticação e multi-tenancy | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 04. |
| **Prompt 05** | Credenciais e integração Shopee | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 05. |
| **Prompt 06** | Evolution API, instâncias, QR Code e grupos | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 06. |
| **Prompt 07** | Automações, scheduler e motor de execução | **PENDENTE** | - | 0 / 7 | Aguardando execução do Prompt 07. |
| **Prompt 08** | Frontend, dashboard e experiência do usuário | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 08. |
| **Prompt 09** | Qualidade, segurança e readiness para produção | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 09. |
| **Prompt 10** | Validação End-to-End do fluxo de publicação | **PENDENTE** | - | 0 / 6 | Aguardando execução do Prompt 10. |

---

## 2. Detalhes da Etapa Atual: PROMPT 00

- **Objetivo:** Estabelecer a governança permanente, os papéis do time, o compromisso inegociável de combate a alucinações técnicas e os processos de SDD.
- **Artefatos Entregues:**
  - [`AGENTS.md`](../../AGENTS.md): Regras permanentes, papéis, segurança, multi-tenancy e fluxo de ADRs.
  - [`prompts/00-GOVERNANCA-E-CONTEXTO.md`](../../prompts/00-GOVERNANCA-E-CONTEXTO.md): Registro fiel do Prompt 00.
  - [`README.md`](../../README.md): Documento de entrada e índice do projeto.
  - [`docs/progress/IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md): Matriz de acompanhamento de status.
  - [`docs/progress/KNOWN_ISSUES.md`](KNOWN_ISSUES.md): Registro inicial de riscos e dependências.
  - [`docs/architecture/INTEGRATIONS.md`](../architecture/INTEGRATIONS.md): Estrutura para contratos oficiais das APIs Shopee e Evolution.
- **Critérios de Aceite Validados:**
  - [x] `AGENTS.md` existe na raiz e contém integralmente as 10 regras permanentes.
  - [x] As fontes oficiais estão registradas formalmente.
  - [x] O mecanismo para registrar bloqueios (`KNOWN_ISSUES.md`) e decisões (`docs/architecture/decisions/`) está estabelecido.
  - [x] Confirmação formal registrada de que contratos externos não verificados nunca serão implementados por suposição ou alucinação.
  - [x] Relatório da etapa emitido com evidências verificáveis.

---

## 3. Próximo Passo
Aguardar aprovação formal do usuário da etapa **PROMPT 00** e o envio da solicitação para o **PROMPT 01 (Discovery, PRD e especificações funcionais)**.
