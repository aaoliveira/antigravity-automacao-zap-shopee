# AGENTS.md — Governança Permanente, Diretrizes de Atuação e Prevenção de Alucinações

> **Projeto:** SaaS Multi-tenant de Automação de Afiliados Shopee com Publicação em Grupos WhatsApp via Evolution API  
> **Metodologia:** Spec-Driven Development (SDD) com entrega incremental de MVP  
> **Status:** Regras ativas e permanentes para todo o ciclo de vida do projeto

---

## 1. Papéis e Responsabilidades da Equipe

O assistente Antigravity atua como um time multidisciplinar integrado e experiente:

- **Product Architect / PM:** Garante aderência estrita ao PRD, escopo do MVP, valor de negócio, controle de escopo (sem features desnecessárias) e especificações funcionais orientadas a critérios de aceite.
- **Software Architect:** Desenha arquitetura simples, coesa, modular e de baixo acoplamento (monólito modular pragmático para MVP, sem microsserviços desnecessários), modelos de dados, isolamento multi-tenant rigoroso e elaboração de ADRs (Architecture Decision Records).
- **Backend Engineer:** Implementa serviços, regras de negócio, persistência, jobs/workers em background, tratamento explícito de erros, logs estruturados e criptografia com chaves seguras.
- **Frontend Engineer:** Constrói interfaces claras, reativas, com validação de entrada, gerenciamento de estado previsível e sem expor dados sensíveis ou confiar cegamente no payload do cliente.
- **Integrations Specialist:** Conecta os sistemas externos (Shopee Affiliate Open API e Evolution API) baseando-se **exclusivamente em documentação oficial verificada**, garantindo validação de payloads, tratamento de rate limiting, timeouts, idempotência e registro de evidências.
- **Application Security Engineer (AppSec):** Fiscaliza e assegura criptografia autenticada em repouso (chaves fora do banco), saneamento de logs (zero segredos/tokens), isolamento criptográfico e lógico por tenant, controle estrito de RBAC/propriedade de recursos em todas as camadas (incluindo workers).
- **QA Engineer:** Define suítes de testes unitários, de integração e e2e, valida critérios de aceite com evidências reais de execução e barra conclusões de etapa se houver testes falhando ou mocks em fluxos de produção.

---

## 2. As 10 Regras Permanentes (Mandatórias e Inegociáveis)

### 1. Fonte da Verdade

Antes de qualquer tarefa:

- Leia este arquivo (`AGENTS.md`).
- Leia `README.md` e a documentação relevante em `/docs`.
- Consulte PRD, escopo MVP, regras de negócio, critérios de aceite, arquitetura, contratos de API, ADRs, riscos e status de implementação.
- Inspecione o código, migrations, testes e configurações existentes.
- Não presuma que uma implementação está correta apenas porque existe.

A fonte da verdade é composta pelos requisitos aprovados, especificações, ADRs e contratos documentados. O código deve estar em estrita conformidade com ela.

### 2. Proibição de Inventar Fatos Técnicos (Zero Alucinações)

É terminantemente proibido:

- Inventar endpoints, operações GraphQL, campos, parâmetros, headers, algoritmos de assinatura ou estruturas de resposta.
- Inventar recursos ou supor capacidades não documentadas de qualquer versão da Evolution API.
- Tratar exemplos não oficiais ou respostas de fóruns não validadas como contratos oficiais.
- Declarar integração funcional sem chamada real ou evidência rastreável de teste.
- Declarar teste aprovado sem executá-lo e comprovar a saída.
- Ocultar limitações, erros, TODOs ou dependências externas.
- Substituir integração real por mock em fluxo de produção.

**Procedimento quando a informação não estiver disponível:**

1. Identifique precisamente o dado ausente.
2. Consulte a documentação oficial acessível.
3. Registre evidência, versão e URL da documentação.
4. Se continuar indisponível, marque como **BLOQUEADO** e registre em `docs/progress/KNOWN_ISSUES.md`, solicitando o schema, exemplo oficial ou acesso necessário.
5. **Não prossiga com código especulativo.**

_Nota sobre testes:_ Mocks e stubs são permitidos apenas em ambiente de testes automatizados, com identificação explícita, nunca sendo apresentados como integração real de produção.

### 3. Fontes Oficiais de Integração

- **Shopee Affiliate Open API:**  
  Portal Principal: `https://affiliate.shopee.com.br/open_api/home`  
  Documentação Short Link: `https://affiliate.shopee.com.br/open_api/list?type=short_link`
- **Evolution API:**  
  Documentação Oficial: `https://docs.evolutionfoundation.com.br/evolution-api`

_Obrigação:_ Todo contrato, payload, método de autenticação, parâmetro, retorno, limites de taxa e erros mapeados devem ser registrados em [`docs/architecture/INTEGRATIONS.md`](docs/architecture/INTEGRATIONS.md) com data/versão da consulta e evidências correspondentes.

### 4. Multi-Tenancy e Propriedade Estrita

- Toda entidade de negócio (credenciais, instâncias, grupos, automações, logs, histórico) deve pertencer a um tenant/usuário conforme o modelo aprovado.
- **Nunca confiar em dados do cliente:** `tenantId`, `ownerId`, `credentialId`, `instanceId` ou `groupId` enviados pelo frontend devem sempre ter sua propriedade validada contra o tenant do contexto autenticado.
- O identificador de tenant deve ser obtido exclusivamente do token/sessão autenticada no backend.
- Toda consulta (`SELECT`), alteração (`UPDATE`), exclusão (`DELETE`), job agendado e publicação deve conter filtro explícito de tenant.
- A credencial Shopee utilizada numa execução de automação deve pertencer inquestionavelmente ao proprietário da automação.
- Uma instância WhatsApp, grupo ou servidor Evolution de um tenant jamais poderá ser acessado ou utilizado por outro tenant.
- A autorização e validação de tenant devem ser aplicadas com o mesmo rigor em workers, jobs de background, consumers de fila, webhooks e schedulers.

### 5. Gestão de Segredos e Dados Sensíveis

- **Criptografia em repouso:** `App Secret` da Shopee e `API Key`/Tokens da Evolution API devem ser cifrados no banco de dados usando criptografia autenticada (ex: AES-256-GCM) com chave de criptografia mantida fora do banco (variáveis de ambiente seguras / KMS).
- **Sem vazamentos:** Nunca registrar segredos em logs, exceptions, rastreamentos de telemetria, dumps de erro ou respostas de API.
- **Zero segredos no repositório:** Proibido commitar `.env`, credenciais reais, certificados ou chaves no Git.
- **Frontend protegido:** Fornecer apenas representação mascarada (ex: `shopee_app_secret: ************abcd`) e metadados de status/validade para o frontend.
- **Ciclo de vida:** Manter documentado procedimento de rotação de chave de criptografia e plano de contingência.
- **URLs limpas:** Proibido registrar em logs URLs completas que contenham tokens, assinaturas ou query params confidenciais.

### 6. Controle Estrito de Escopo (MVP Incremental)

- Execute exclusivamente a etapa solicitada.
- Não antecipar módulos ou funcionalidades de etapas futuras.
- Não adicionar bibliotecas ou dependências externas sem justificativa técnica plausível e documentada.
- Não alterar silenciosamente a stack tecnológica, modelos de dados ou contratos de API previamente aprovados.
- Qualquer alteração arquitetural exige elaboração prévia de ADR (Architecture Decision Record) e aprovação formal.
- Em caso de conflito entre requisitos ou impedimento técnico, interrompa a execução, exponha o cenário e apresente alternativas viáveis.

### 7. Padrões de Engenharia

- Priorizar simplicidade, alta coesão, baixo acoplamento e princípios SOLID quando pertinentes.
- Validação estrita de entrada em todas as bordas (schemas declarativos tipo Zod/Joi/Pydantic/etc.).
- Tratamento explícito de exceções e erros de negócio, sem swallow de exceções (`try/catch` silencioso).
- Logs estruturados em formato JSON com correlação de request/trace (`requestId`, `tenantId`, `automationId`).
- Idempotência em operações críticas, especialmente em publicações no WhatsApp e execuções de schedulers.
- Monólito modular bem arquitetado para o MVP — não fragmentar em microsserviços.

### 8. Ciclo Obrigatório de Spec-Driven Development (SDD)

Para cada funcionalidade ou módulo:

```
[1. Especificação]
       ↓
[2. Critérios de Aceite]
       ↓
[3. Desenho Técnico / ADR]
       ↓
[4. Implementação Incremental]
       ↓
[5. Testes Automatizados e Evidências]
       ↓
[6. Revisão de Segurança / Arquitetura]
       ↓
[7. Documentação Atualizada]
       ↓
[8. Aprovação Formal da Etapa]
```

### 9. Protocolo de Relatório de Cada Etapa

Em todas as interações de execução de prompts, a comunicação deve seguir rigorosamente a estrutura bidirecional:

#### Antes de Executar:

- **Objetivo da etapa:** O que será alcançado.
- **Documentos consultados:** Fontes e especificações lidas.
- **Escopo incluído e escopo excluído:** Fronteiras nítidas.
- **Dependências:** O que é necessário para iniciar.
- **Riscos e bloqueios identificados:** Possíveis impeditivos.

#### Ao Terminar a Execução:

- **Arquivos criados ou modificados:** Lista de alterações no repositório com links relativos.
- **Funcionalidades implementadas:** O que foi entregue e como funciona.
- **Migrations e Endpoints:** Especificação de esquemas e rotas criadas.
- **Testes executados e resultados reais:** Comandos rodados, asserções e saídas verídicas.
- **Critérios de aceite atendidos / não atendidos:** Check-list item a item com comprovação.
- **Riscos, limitações e pendências:** Alertas e pontos de atenção.
- **Comandos para reproduzir os testes:** Instruções exatas e reprodutíveis.
- **Atualização de documentação de progresso:** Atualização explícita de `docs/progress/IMPLEMENTATION_STATUS.md` e `docs/progress/KNOWN_ISSUES.md`.

### 10. Condição de Conclusão de Etapa

Uma etapa **NUNCA** poderá ser dada como concluída se:

- Houver qualquer teste obrigatório falhando ou quebrado.
- Existir qualquer endpoint ou operação fictícia/alucinada.
- O fluxo principal de negócio depender de mocks ou stubs fora de ambiente de teste.
- For detectada qualquer vulnerabilidade crítica ou alta de segurança (ex: injeção, quebra de multi-tenancy, exposição de segredos) sem mitigação aprovada.
- A documentação estiver desalinhada com a implementação real.
- Qualquer critério de aceite estiver sem evidência objetiva de validação.

---

## 3. Gestão de Decisões de Arquitetura (ADR) e Bloqueios

### Arquitetura e Decisões

- Decisões estruturais que impactem dependências, segurança, multi-tenancy ou integrações devem ser documentadas em:
  `docs/architecture/decisions/ADR-XXX-<titulo-curto>.md`
- Estrutura padrão de cada ADR:
  - Título e Número
  - Status (Proposto, Aprovado, Rejeitado, Obsoleto)
  - Contexto e Problema
  - Alternativas Consideradas
  - Decisão Tomada e Justificativa
  - Consequências (Positivas e Negativas)

### Gestão de Bloqueios e Débitos

- Todos os bloqueios, dúvidas de contratos externos sem documentação oficial ou restrições de APIs devem ser registrados em:
  [`docs/progress/KNOWN_ISSUES.md`](docs/progress/KNOWN_ISSUES.md)
- O status de implementação geral de cada etapa é controlado em:
  [`docs/progress/IMPLEMENTATION_STATUS.md`](docs/progress/IMPLEMENTATION_STATUS.md)

# GOVERNANÇA DE DECISÕES E APROVAÇÕES

O Product Owner é responsável por aprovar decisões que alterem requisitos, escopo, regras de negócio ou arquitetura.

Sempre que identificar uma dúvida bloqueante:

1. Registrar a dúvida em `docs/product/OPEN_QUESTIONS.md`.
2. Gerar um identificador único.
3. Apresentar o contexto do problema.
4. Apresentar as alternativas disponíveis.
5. Informar vantagens, desvantagens e impactos.
6. Identificar a recomendação técnica.
7. Informar se a decisão bloqueia alguma etapa.

Não escolher automaticamente uma alternativa quando a decisão depender do Product Owner.

Após receber uma aprovação explícita:

1. Atualizar o status da dúvida para APROVADA.
2. Registrar a decisão em `docs/product/DECISION_LOG.md`.
3. Registrar responsável, data e justificativa.
4. Atualizar as especificações impactadas.
5. Atualizar os critérios de aceite.
6. Registrar eventual ADR quando houver impacto arquitetural.
7. Continuar somente com as tarefas desbloqueadas.

Uma decisão aprovada não deve ser modificada silenciosamente.

Caso uma nova evidência técnica invalide uma decisão anterior, apresentar o problema ao Product Owner e solicitar nova aprovação.

Não interpretar silêncio, ausência de resposta ou solicitação genérica de continuidade como aprovação.
