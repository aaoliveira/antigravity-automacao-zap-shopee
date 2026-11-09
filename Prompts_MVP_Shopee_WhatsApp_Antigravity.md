# Plano de desenvolvimento MVP --- SaaS de automação Shopee + WhatsApp

**Metodologia:** Spec-Driven Development (SDD)\
**Estratégia:** MVP incremental\
**Ambiente de execução:** Google Antigravity\
**Idioma dos artefatos:** Português do Brasil\
**Versão:** 1.0

------------------------------------------------------------------------

## Como utilizar este documento

Execute os prompts na ordem indicada, um por vez, no Google Antigravity.
Não solicite a execução de todas as etapas em paralelo.

Ao final de cada etapa:

1.  Revise os artefatos e o código produzidos.
2.  Execute os testes indicados.
3.  Verifique os critérios de aceite.
4.  Aprove formalmente a etapa antes de executar a próxima.
5.  Confirme que `docs/progress/IMPLEMENTATION_STATUS.md` foi
    atualizado.

O Antigravity deve trabalhar sobre o repositório existente. Se já houver
código, primeiro inspecione-o e preserve o que estiver correto. Não
recrie o projeto do zero sem necessidade.

## Objetivo do produto

Construir uma plataforma SaaS multi-tenant na qual cada cliente possa:

-   Cadastrar e validar suas próprias credenciais da Shopee Affiliate
    Open API.
-   Configurar um ou mais servidores Evolution API, quando permitido
    pela arquitetura.
-   Criar e conectar instâncias WhatsApp.
-   Consultar e selecionar grupos de WhatsApp disponíveis.
-   Consultar categorias e ofertas de produtos disponíveis na API
    oficial da Shopee.
-   Criar várias automações independentes.
-   Configurar uma ou várias categorias e um ou vários grupos por
    automação.
-   Buscar produtos elegíveis e selecionar um produto de forma
    aleatória.
-   Gerar o link de afiliado utilizando exclusivamente as credenciais do
    proprietário da automação.
-   Publicar imagem, título, preço e link convertido nos grupos
    selecionados.
-   Acompanhar execuções, publicações, falhas e histórico.

### Premissas e limites importantes

1.  Não presumir que a Shopee disponibiliza uma operação específica de
    listagem de categorias. Confirmar na documentação autenticada. Se
    não houver endpoint oficial, apresentar a limitação e propor somente
    alternativas compatíveis com a documentação e com as regras da
    plataforma.
2.  Não inventar nomes de operações GraphQL, campos, parâmetros,
    assinaturas, headers ou endpoints.
3.  Não presumir que todos os provedores da Evolution API oferecem as
    mesmas funcionalidades. Validar grupos e envio de mídia para o
    provedor configurado.
4.  Para o MVP, avaliar Baileys como provedor inicial se for compatível
    com o cenário e com os termos aplicáveis. Não tratar a escolha como
    requisito imutável sem validação.
5.  A aplicação não deve prometer vendas, conversões ou disponibilidade
    de produtos.
6.  Publicações devem ocorrer apenas em grupos nos quais o cliente tenha
    autorização para divulgar e respeitando políticas e limites
    aplicáveis.
7.  O sistema deve suportar envio a vários grupos por automação,
    registrando o resultado individual de cada destino.
8.  O sistema deve impedir repetição recente de produtos na mesma
    automação quando houver alternativas, com janela configurável.
9.  O MVP não inclui integração com marketplaces adicionais, billing,
    aplicativo mobile ou geração de copy por IA. Essas funcionalidades
    ficam para fases posteriores, salvo alteração formal de escopo.

------------------------------------------------------------------------

# PROMPT 00 --- Governança permanente, contexto e prevenção de alucinações

**Arquivo sugerido:** `prompts/00-GOVERNANCA-E-CONTEXTO.md`\
**Objetivo:** estabelecer regras que deverão ser respeitadas em todas as
etapas.

``` text
Você atuará como uma equipe experiente composta por Product Architect,
Software Architect, engenheiros backend e frontend, especialista em
integrações, Application Security Engineer e QA Engineer.

O produto é um SaaS multi-tenant de automação de afiliados Shopee com
publicação em grupos WhatsApp por meio da Evolution API.

A metodologia obrigatória é Spec-Driven Development (SDD), com entrega
incremental de um MVP.

REGRAS PERMANENTES

1. FONTE DA VERDADE
Antes de qualquer tarefa:
- Leia este arquivo e o AGENTS.md.
- Leia README.md e a documentação relevante em /docs.
- Consulte PRD, escopo MVP, regras de negócio, critérios de aceite,
  arquitetura, contratos de API, ADRs, riscos e status de implementação.
- Inspecione o código, migrations, testes e configurações existentes.
- Não presuma que uma implementação está correta apenas porque existe.

A fonte da verdade é composta pelos requisitos aprovados, especificações,
ADRs e contratos documentados. O código deve estar em conformidade com ela.

2. PROIBIÇÃO DE INVENTAR FATOS TÉCNICOS
É proibido:
- Inventar endpoints, operações GraphQL, campos, parâmetros, headers,
  algoritmos de assinatura ou estruturas de resposta.
- Inventar recursos de uma versão da Evolution API.
- Tratar exemplos não oficiais como contratos oficiais.
- Declarar integração funcional sem chamada real ou evidência de teste.
- Declarar teste aprovado sem executá-lo.
- Ocultar limitações, erros, TODOs ou dependências externas.
- Substituir integração real por mock em fluxo de produção.

Quando a informação não estiver disponível:
a) Identifique precisamente o dado ausente.
b) Consulte a documentação oficial acessível.
c) Registre evidência, versão e URL da documentação.
d) Se continuar indisponível, marque como BLOQUEADO e solicite o schema,
   exemplo oficial ou acesso necessário.
e) Não prossiga com código especulativo.

Mocks e stubs são permitidos apenas em testes, com identificação explícita.
Nunca devem ser apresentados como integração real.

3. FONTES OFICIAIS
Shopee Affiliate Open API:
https://affiliate.shopee.com.br/open_api/home

Documentação de Short Link:
https://affiliate.shopee.com.br/open_api/list?type=short_link

Evolution API:
https://docs.evolutionfoundation.com.br/evolution-api

Registre em docs/architecture/INTEGRATIONS.md a versão/data de consulta,
operação, autenticação, parâmetros, resposta, erros, limites e evidências.

4. MULTI-TENANCY E PROPRIEDADE
- Toda entidade de negócio deve pertencer a um tenant/usuário conforme
  o modelo aprovado.
- Nunca confiar em tenantId, ownerId, credentialId, instanceId ou groupId
  enviados pelo frontend sem validar propriedade no backend.
- O tenant deve ser obtido do contexto autenticado.
- Toda consulta, alteração, exclusão, job e publicação deve validar tenant.
- A credencial Shopee usada numa execução deve pertencer ao proprietário
  da automação.
- Uma instância, grupo ou servidor Evolution de outro tenant nunca poderá
  ser utilizado.
- Aplicar autorização também em workers, jobs, webhooks e tarefas agendadas.

5. SEGREDOS
- Criptografar App Secret Shopee e API Key Evolution em repouso usando
  mecanismo de criptografia autenticada e chave fora do banco.
- Nunca devolver segredos em respostas, logs, exceptions ou telemetria.
- Nunca gravar segredos no repositório.
- Fornecer apenas estado mascarado e metadados necessários ao frontend.
- Prever rotação de chave e procedimento de recuperação documentado.
- Não registrar URLs que contenham tokens ou parâmetros secretos.

6. CONTROLE DE ESCOPO
- Execute somente a etapa solicitada.
- Não antecipar módulos futuros.
- Não adicionar dependências sem justificativa.
- Não alterar stack, contratos ou arquitetura aprovados silenciosamente.
- Mudanças de arquitetura exigem ADR e aprovação.
- Se houver conflito de requisito, pare e apresente alternativas.

7. PADRÕES DE ENGENHARIA
Priorize simplicidade, coesão, baixo acoplamento, SOLID quando aplicável,
validação de entrada, tratamento explícito de erros, logs estruturados,
observabilidade, idempotência, testes e documentação.
Não criar microsserviços para o MVP sem justificativa aprovada.

8. CICLO SDD OBRIGATÓRIO
Para cada funcionalidade:
Especificação -> critérios de aceite -> desenho técnico -> implementação
-> testes -> revisão -> documentação -> aprovação.

9. RELATÓRIO DE CADA ETAPA
Antes de executar, informe:
- objetivo;
- documentos consultados;
- escopo incluído e excluído;
- dependências;
- riscos e bloqueios.

Ao terminar, informe:
- arquivos criados/modificados;
- funcionalidades implementadas;
- migrations e endpoints;
- testes executados e resultados reais;
- critérios de aceite atendidos/não atendidos;
- riscos, limitações e pendências;
- comandos para reproduzir os testes.

Atualize IMPLEMENTATION_STATUS.md e KNOWN_ISSUES.md.

10. CONDIÇÃO DE CONCLUSÃO
Não marcar etapa como concluída se:
- houver teste obrigatório falhando;
- existir endpoint fictício;
- fluxo principal depender de mock;
- houver vulnerabilidade crítica ou alta sem mitigação aprovada;
- documentação estiver divergente do código;
- critérios de aceite não tiverem evidência.

Estas regras são permanentes durante todo o projeto.
```

**Ação esperada do Antigravity:** criar `AGENTS.md` na raiz, preservar
este documento em `prompts/` e referenciar as regras em todas as etapas.

**Critérios de aceite** - \[ \] `AGENTS.md` existe e contém as regras
permanentes. - \[ \] As fontes oficiais estão registradas. - \[ \] O
mecanismo para registrar bloqueios e decisões está definido. - \[ \] O
Antigravity confirma que não implementará contratos externos não
verificados. - \[ \] O relatório de execução apresenta evidências, não
apenas afirmações.

------------------------------------------------------------------------

# PROMPT 01 --- Discovery, PRD e especificações funcionais

**Arquivo sugerido:** `prompts/01-DISCOVERY-PRD-SPECS.md`\
**Objetivo:** transformar a ideia em requisitos verificáveis, sem
implementar código.

``` text
Atue como Product Manager, Business Analyst e Requirements Engineer.

Execute o Discovery do SaaS de automação Shopee + WhatsApp.
NÃO implemente código nesta etapa.

Consulte as fontes oficiais e identifique dependências que exigem acesso
autenticado ou confirmação manual.

1. PERSONAS E JORNADAS
Defina a jornada do cliente:
- cadastro e autenticação;
- configuração Shopee;
- configuração do servidor Evolution;
- criação e conexão da instância WhatsApp;
- consulta e seleção de grupos;
- consulta e seleção de categorias;
- criação de automações;
- execução e publicação;
- consulta de histórico e diagnóstico.

2. REQUISITOS FUNCIONAIS

RF-01 Autenticação:
cadastro, login, logout, recuperação de senha e sessões.

RF-02 Multi-tenancy:
isolamento de dados e recursos de cada cliente.

RF-03 Shopee:
cadastrar, validar, atualizar e desconectar credenciais.
Nunca mostrar Secret depois de salvo.

RF-04 Evolution:
configurar URL base e API Key, validar conexão e gerenciar servidores
conforme o modelo de propriedade aprovado.

RF-05 Instâncias:
criar, listar, conectar, obter QR Code, acompanhar estado, desconectar,
reconectar e excluir, conforme operações comprovadas na versão utilizada.

RF-06 Grupos:
listar, pesquisar, atualizar e selecionar grupos da instância escolhida.
Persistir o identificador original retornado pela API e validar se o grupo
continua disponível antes da publicação.

RF-07 Categorias:
apresentar categorias realmente disponíveis. Não criar catálogo fictício.
Se a API não expuser categorias, registrar a limitação e definir uma
alternativa aprovada, sem afirmar que veio da Shopee.

RF-08 Produtos:
buscar ofertas/produtos de acordo com operações oficiais, paginar,
validar dados e selecionar aleatoriamente entre candidatos elegíveis.

RF-09 Automações:
criar, editar, duplicar se aprovado, ativar, pausar, retomar, executar
manualmente e excluir com confirmação.
Uma automação pode ter várias categorias e vários grupos.
Um usuário pode possuir várias automações independentes.

RF-10 Agendamento:
frequência, intervalo, dias, janelas de horário, fuso horário,
limite diário e intervalo mínimo. Definir comportamento para horário
de verão e alterações de fuso, quando aplicável.

RF-11 Aleatoriedade:
quando houver várias categorias, sortear uma categoria de acordo com
a estratégia aprovada; selecionar um produto aleatório entre candidatos
elegíveis, evitando viés de sempre escolher a primeira página.

RF-12 Repetição:
evitar publicar novamente o mesmo produto na mesma automação durante
uma janela configurável, por padrão sugerido de 7 dias.
Se não houver alternativa, registrar ausência de produto elegível e não
forçar repetição, salvo configuração explícita.

RF-13 Link afiliado:
gerar Short Link pela operação oficial com a credencial do proprietário.
Não permitir escolher credencial de outro tenant. Registrar o vínculo
entre produto, credencial proprietária, execução e link, sem expor secrets.

RF-14 Publicação:
enviar imagem e legenda com título, preço e link. Se o provedor não
suportar mídia com legenda em uma operação, especificar envio separado
e controlar falha parcial. Cada grupo terá status individual.

RF-15 Histórico:
registrar execução, produto, categoria, link, automação, grupos, timestamps,
status, tentativas, resposta sanitizada e motivo da falha.

RF-16 Dashboard:
indicadores de automações, instâncias, publicações, falhas e próximas
execuções, calculados a partir de dados reais.

3. REGRAS DE NEGÓCIO
Especifique:
- uma execução pertence a uma automação e tenant;
- uma automação utiliza somente recursos do mesmo tenant;
- uma seleção de produto é compartilhada entre os destinos da mesma
  execução, salvo requisito aprovado em contrário;
- cada destino possui resultado independente;
- não publicar se link afiliado não for validado;
- não publicar se instância estiver desconectada;
- não publicar fora da janela ou acima dos limites;
- respeitar pausa e cancelamento;
- não repetir produto dentro da janela configurada quando houver alternativas;
- não fazer retry cego de envio cujo resultado seja indeterminado;
- limitar frequência e respeitar políticas e permissões dos grupos.

4. REQUISITOS NÃO FUNCIONAIS
Defina requisitos mensuráveis para:
segurança, disponibilidade, desempenho, escalabilidade inicial,
observabilidade, recuperação, privacidade, retenção e backup.
Não invente SLA sem aprovação; proponha metas identificadas como propostas.

5. ESCOPO MVP
Inclua apenas o necessário para:
- um usuário configurar sua integração Shopee;
- conectar WhatsApp via Evolution;
- selecionar grupos e categorias;
- criar múltiplas automações;
- buscar produto aleatório;
- converter link com credencial correta;
- publicar em um ou mais grupos;
- consultar histórico e falhas.

Fora do MVP, salvo decisão expressa:
billing, planos pagos, app mobile, outros marketplaces, IA para copy,
analytics avançado de conversão e programa de indicação.

6. HISTÓRIAS E CRITÉRIOS
Cada história deve ter ID, ator, objetivo, benefício, prioridade,
pré-condições, fluxo principal, exceções, critérios Given/When/Then
e dependências.

ENTREGÁVEIS
- docs/product/PRD.md
- docs/product/MVP_SCOPE.md
- docs/product/PERSONAS_AND_JOURNEYS.md
- docs/product/USER_STORIES.md
- docs/product/BUSINESS_RULES.md
- docs/quality/ACCEPTANCE_CRITERIA.md
- docs/quality/REQUIREMENTS_TRACEABILITY.md
- docs/product/OPEN_QUESTIONS.md

Não implemente código. Apresente dúvidas bloqueantes e aguarde aprovação.
```

**Critérios de aceite** - \[ \] Todos os fluxos principais e
alternativos estão descritos. - \[ \] Requisitos têm identificadores
únicos e prioridade. - \[ \] Regras multi-tenant e de propriedade estão
explícitas. - \[ \] Escopo MVP e itens fora do MVP estão separados. - \[
\] Dependências não confirmadas das APIs estão listadas. - \[ \] Cada
requisito funcional possui critérios de aceite verificáveis. - \[ \]
Dúvidas bloqueantes estão em `OPEN_QUESTIONS.md`.

------------------------------------------------------------------------

# PROMPT 02 --- Investigação técnica das APIs e contratos de integração

**Arquivo sugerido:** `prompts/02-API-DISCOVERY-CONTRACTS.md`\
**Objetivo:** confirmar contratos externos antes de implementar os
conectores.

``` text
Atue como Integration Architect. Esta etapa é de investigação e
documentação. Não implemente os conectores ainda.

DOCUMENTAÇÃO:
Shopee:
https://affiliate.shopee.com.br/open_api/home
https://affiliate.shopee.com.br/open_api/list?type=short_link

Evolution:
https://docs.evolutionfoundation.com.br/evolution-api

A. SHOPEE
Com acesso autorizado à documentação, identifique:
- endpoint e transporte;
- autenticação e assinatura;
- algoritmo, canonicalização e timestamp, se aplicável;
- headers obrigatórios;
- operação de ofertas/produtos;
- operação de detalhes, se existir;
- operação de categorias, se existir;
- filtros, paginação e ordenação;
- operação de geração de Short Link;
- parâmetros de Sub ID e seus limites;
- schemas de request/response;
- códigos de erro, rate limits e quotas.

Para cada operação, registrar:
nome exato, método/transporte, endpoint, parâmetros, tipos, campos
obrigatórios, exemplo oficial, resposta, erros e fonte documental.

B. EVOLUTION
Identifique a versão da Evolution API e o provedor.
Confirme operações de:
- health/check de servidor;
- criação e consulta de instância;
- conexão e QR Code;
- estado de conexão;
- desconexão e exclusão;
- listagem de grupos;
- envio de texto;
- envio de imagem/mídia;
- webhooks e eventos;
- autenticação, headers, payloads, respostas e erros.

Confirme explicitamente se o provedor selecionado suporta os recursos
de grupos necessários. Não extrapole recursos entre Baileys e Cloud API.

C. MATRIZ DE COMPATIBILIDADE
Crie tabela de funcionalidades por versão/provedor:
SUPORTADO, NÃO SUPORTADO, NÃO CONFIRMADO.
Inclua fonte e data de verificação.

D. POLÍTICA DE BLOQUEIO
Se documentação não estiver acessível:
- não inventar contrato;
- não criar endpoint presumido;
- marcar operação como BLOQUEADA;
- listar o documento, schema ou credencial que falta;
- fornecer instrução precisa para desbloquear.

ENTREGÁVEIS
- docs/architecture/INTEGRATIONS.md
- docs/architecture/SHOPEE_API_CONTRACTS.md
- docs/architecture/EVOLUTION_API_CONTRACTS.md
- docs/architecture/API_COMPATIBILITY_MATRIX.md
- docs/product/OPEN_QUESTIONS.md (atualizado)

Não avance para implementação enquanto operações essenciais estiverem
sem contrato verificável.
```

**Critérios de aceite** - \[ \] Cada operação externa usada no MVP
possui contrato documentado. - \[ \] Autenticação e assinatura Shopee
estão verificadas. - \[ \] Geração de Short Link está documentada com
request/response. - \[ \] Operações Evolution foram verificadas na
versão/provedor escolhidos. - \[ \] Suporte a grupos e mídia está
confirmado. - \[ \] Operações não confirmadas estão bloqueadas, sem
código especulativo.

------------------------------------------------------------------------

# PROMPT 03 --- Arquitetura, modelo de dados e desenho de segurança

**Arquivo sugerido:** `prompts/03-ARCHITECTURE-DATA-SECURITY.md`

``` text
Atue como Software Architect e Security Architect.
Use exclusivamente requisitos e contratos aprovados.

STACK PREFERENCIAL:
Frontend: Vue 3 + TypeScript + Vite.
Backend: Node.js + NestJS + TypeScript.
Banco: PostgreSQL + Prisma.
Filas: Redis + BullMQ.
Infra: Docker Compose + Nginx.
Testes: Vitest/Jest conforme stack existente, Supertest e Playwright.

Se o repositório já tiver stack funcional, preserve-a e registre ADR
para qualquer mudança proposta.

1. ARQUITETURA
Defina monólito modular para o MVP, com módulos:
auth, users/tenants, shopee, evolution, instances, groups, categories,
products, automations, scheduler, queue, publications, history, audit.

Workers devem compartilhar regras de domínio e validar tenant.
Não duplicar lógica de negócio entre API e worker.

2. MODELO DE DADOS
Avalie e modele, no mínimo:
User, Tenant, ShopeeCredential, EvolutionServer, WhatsAppInstance,
WhatsAppGroup, Category, Automation, AutomationCategory, AutomationGroup,
AutomationExecution, ProductSnapshot, AffiliateLink, Publication,
AuditLog e WebhookEvent, conforme necessidade comprovada.

Defina:
- PKs e FKs;
- tenant_id/owner_id;
- índices;
- unique constraints;
- estados e transições;
- timestamps;
- retenção;
- soft delete apenas quando fizer sentido;
- integridade entre automação, instância, grupo e credencial.

Não armazenar catálogo completo de produtos sem necessidade.
Guardar snapshot mínimo necessário para auditoria e histórico.

3. MULTI-TENANCY
- Tenant obtido da autenticação.
- Queries com escopo obrigatório.
- Guards/policies no backend.
- Constraints e relações no banco.
- Workers revalidam propriedade.
- Webhooks são associados a uma instância/tenant por segredo ou
  mecanismo verificável.
- Testes negativos de acesso cruzado.

Avalie Row-Level Security do PostgreSQL como defesa adicional, sem
substituir autorização de aplicação. Documente a decisão.

4. SEGREDOS
Defina criptografia autenticada em repouso, gestão externa da chave,
rotação, mascaramento, acesso mínimo e procedimento de backup/restore.
Não persistir API keys em logs ou traces.

5. FILAS E CONFIABILIDADE
Defina:
- filas e tipos de jobs;
- idempotency keys;
- lock/concurrency;
- retry com backoff e jitter;
- limites por tenant e por instância;
- dead-letter queue;
- timeout;
- cancelamento;
- recuperação após restart;
- reconciliação de resultado de envio indeterminado.

Não afirmar entrega exatamente uma vez se a API externa não oferece
mecanismo que a garanta. Definir semântica realista de entrega e deduplicação.

6. PUBLICAÇÃO MULTIGRUPO
Uma execução seleciona um produto e gera um link.
Cria um registro de destino por grupo.
Cada destino possui estado independente.
Falha em um grupo não apaga sucesso dos demais.
Não refazer busca/conversão para cada grupo sem necessidade.

7. OBSERVABILIDADE
Defina correlationId, executionId, tenantId não sensível, métricas,
logs sanitizados, health checks e alertas operacionais.

ENTREGÁVEIS
- docs/architecture/SYSTEM_ARCHITECTURE.md
- docs/architecture/DATABASE_SCHEMA.md
- docs/architecture/API_CONTRACTS.md
- docs/architecture/QUEUE_AND_RELIABILITY.md
- docs/security/SECURITY_POLICY.md
- docs/security/THREAT_MODEL.md
- docs/architecture/ADR/
- docs/quality/TEST_STRATEGY.md

Não implementar ainda. Solicite aprovação da arquitetura.
```

**Critérios de aceite** - \[ \] Diagrama de componentes e sequência do
fluxo principal. - \[ \] Modelo de dados contempla propriedade e
integridade. - \[ \] Estratégia de filas e estados indeterminados está
documentada. - \[ \] Publicação multigrupo possui estado por destino. -
\[ \] Segurança de credenciais e isolamento estão definidos. - \[ \]
Decisões relevantes possuem ADR. - \[ \] Arquitetura aprovada antes da
implementação.

------------------------------------------------------------------------

# PROMPT 04 --- Fundação, autenticação e multi-tenancy

**Arquivo sugerido:** `prompts/04-FOUNDATION-AUTH-TENANCY.md`

``` text
Implemente a fundação técnica aprovada. Antes, inspecione o repositório.
Não destrua nem substitua código funcional sem justificativa.

ESCOPO:
- estrutura de frontend e backend;
- configuração TypeScript;
- PostgreSQL e Prisma;
- Redis e BullMQ;
- Docker Compose;
- configuração por ambiente;
- health checks;
- migrations;
- autenticação;
- autorização;
- multi-tenancy;
- layout inicial.

AUTENTICAÇÃO:
Implemente cadastro, login, logout, recuperação de senha e gestão de sessão
conforme PRD. Hash de senha com algoritmo apropriado e parâmetros seguros.
Tokens devem ter expiração; refresh token deve ser protegido, rotacionado
e revogável. Não guardar tokens em localStorage se a arquitetura aprovada
usar cookies HttpOnly.

MULTI-TENANCY:
O tenant vem do contexto autenticado, nunca de um campo livre do frontend.
Toda rota que acessa recurso de negócio valida propriedade.
Toda consulta deve ter escopo de tenant.
Workers ainda não devem processar jobs sem validar o tenant no payload
e no banco.

FRONTEND:
Criar login, cadastro, recuperação, layout responsivo, navegação e
estados de carregamento/erro/vazio.

INFRA:
Criar .env.example sem segredos reais.
Separar ambientes development, test e production.
Configurar migrations, health checks e persistência Docker.
Não expor PostgreSQL/Redis publicamente sem necessidade.

TESTES:
- cadastro/login/logout;
- senha inválida;
- token expirado;
- refresh/revogação;
- acesso sem autenticação;
- usuário A tentando ler/alterar recurso de B;
- validação de payload;
- migrations em banco limpo;
- inicialização dos serviços.

ENTREGÁVEIS:
Código, migrations, testes, README de desenvolvimento e documentação
atualizada. Não implementar integrações Shopee/Evolution nesta etapa.
```

**Critérios de aceite** - \[ \] Projeto inicia seguindo README. - \[ \]
Migrations aplicam em banco vazio. - \[ \] Autenticação funciona. - \[
\] Rotas protegidas rejeitam usuários não autenticados. - \[ \] Testes
comprovam bloqueio de acesso cruzado. - \[ \] Nenhum segredo real está
versionado. - \[ \] Health checks identificam dependências
indisponíveis.

------------------------------------------------------------------------

# PROMPT 05 --- Credenciais e integração Shopee

**Arquivo sugerido:** `prompts/05-SHOPEE-INTEGRATION.md`

``` text
Implemente a integração Shopee somente com os contratos confirmados
em SHOPEE_API_CONTRACTS.md. Se faltar operação essencial, pare e marque
o bloqueio; não crie endpoint presumido.

1. CREDENCIAIS
Criar interface e API para cadastrar App ID e Secret, validar conexão,
atualizar e desconectar.
Criptografar Secret em repouso.
Nunca devolver o valor salvo; retornar somente estado configurado,
mascaramento e metadados.
Evitar logs de request/response que contenham assinatura ou segredo.

2. CLIENT
Implementar cliente isolado para transporte, autenticação, assinatura,
timeout, retry seguro, rate limit e parsing de erros conforme contrato.
Assinatura deve ser testada com vetores/exemplos oficiais quando disponíveis.
Não repetir automaticamente operações não idempotentes sem avaliar risco.

3. CATEGORIAS
Implementar apenas operação oficial confirmada.
Se não houver endpoint de categorias, não inventar catálogo oficial.
Apresentar limitação e alternativa documentada para aprovação.
Cache com data de atualização e estratégia de invalidação, se apropriado.

4. PRODUTOS/OFERTAS
Implementar consulta, filtros e paginação conforme schema oficial.
Normalizar os campos necessários para o domínio:
título, preço, imagem, URL original, identificador e categoria, quando
esses campos forem fornecidos pela API.
Validar moeda, preço, URL e imagem. Não inferir preço ausente.
Não misturar resultados de tenants.

5. ALEATORIEDADE
Selecionar aleatoriamente entre candidatos elegíveis, não simplesmente
usar o primeiro item retornado.
Definir estratégia de amostragem respeitando paginação e limites da API.
Documentar eventuais vieses e limitações de amostragem.
Aplicar histórico de repetição por automação.

6. SHORT LINK
Implementar a operação oficial documentada para gerar link de afiliado.
A credencial deve ser obtida no backend a partir da automação autenticada.
Não aceitar credentialId arbitrário como autoridade.
Validar que a credencial pertence ao mesmo tenant da automação.
Associar link, produto, execução e credencial proprietária.
Validar URL retornada e não publicar se a conversão falhar.
Usar Sub ID somente se suportado e dentro das regras oficiais.

7. ERROS
Mapear autenticação inválida, assinatura inválida, rate limit, timeout,
resposta inválida, produto indisponível e falha de conversão.
Não expor detalhes secretos ao usuário.

8. TESTES
Unitários do signer/client/normalização.
Integração controlada com API quando possível.
Credencial válida/inválida.
Paginação.
Rate limit.
Timeout.
Resposta malformada.
Short Link.
Isolamento A/B: tentar usar credencial B em execução A deve ser bloqueado.
Verificar que nenhuma resposta/log contém Secret.

ENTREGÁVEIS:
ShopeeModule e serviços necessários, contratos atualizados, testes,
documentação de configuração e evidências reais.
```

**Critérios de aceite** - \[ \] Credenciais são salvas criptografadas. -
\[ \] Secret nunca é retornado ou logado. - \[ \] Conexão é validada com
API real ou marcada como bloqueada. - \[ \] Categorias não são simuladas
como dados oficiais. - \[ \] Produtos são obtidos pela operação
oficial. - \[ \] Short Link usa a credencial do proprietário. - \[ \]
Teste cruzado entre tenants falha de forma segura. - \[ \] Link inválido
impede publicação.

------------------------------------------------------------------------

# PROMPT 06 --- Evolution API, instâncias, QR Code e grupos

**Arquivo sugerido:** `prompts/06-EVOLUTION-WHATSAPP.md`

``` text
Implemente Evolution API conforme EVOLUTION_API_CONTRACTS.md e versão
explicitamente escolhida. Não extrapole operações entre provedores.

1. SERVIDOR
Permitir cadastrar URL base e API Key.
Validar URL, conectividade e autenticação.
Bloquear destinos privados/internos não autorizados para mitigar SSRF.
Se houver necessidade de servidor interno, exigir configuração controlada
pelo administrador e documentar a exceção.
Criptografar API Key e nunca retorná-la em texto claro.

2. INSTÂNCIAS
Criar, listar, consultar, conectar, desconectar, reconectar e excluir
somente conforme contratos confirmados.
Validar propriedade de servidor e instância.
Não assumir que instância está conectada apenas porque foi criada.

3. QR CODE E ESTADO
Exibir QR Code no frontend com expiração e atualização controlada.
Não persistir QR Code por mais tempo que o necessário.
Confirmar conexão consultando estado real ou evento autenticado.
Exibir estados: não conectada, aguardando QR, conectando, conectada,
desconectada, erro e estado desconhecido.
Não mostrar conectado com base apenas em resposta de criação.

4. GRUPOS
Listar grupos da instância conectada.
Persistir identificador original, nome e metadados estritamente necessários.
Permitir pesquisa, atualização e seleção.
Antes de publicar, verificar que grupo pertence à instância e tenant
e ainda está disponível.
Não alterar o formato do groupId retornado pela API.

5. MENSAGENS E MÍDIA
Implementar envio de imagem e legenda com título, preço e link.
Se não houver suporte comprovado a imagem com legenda, implementar
sequência controlada de mídia e texto, com estado por etapa.
Validar URL/tipo/tamanho da imagem e comportamento de download.
Não permitir URLs arbitrárias sem validação contra SSRF.
Não registrar conteúdo sensível desnecessário.

Template padrão:
"Oferta encontrada!

{titulo}

Preço: {preco}

Confira: {link_afiliado}"

O template deve permitir ajustes simples aprovados no MVP, sem motor
complexo de templates.

6. WEBHOOKS
Se usados, validar assinatura/segredo conforme suporte oficial.
Rejeitar eventos inválidos, deduplicar eventos e evitar confiar em
payload sem validação.
Não aceitar tenantId do corpo do webhook como única forma de associação.

7. TESTES
Servidor inválido, API Key inválida, criação, QR Code, estado,
desconexão, grupos, grupo removido, envio de mídia, envio de texto,
timeout, provedor incompatível, webhook inválido e isolamento A/B.

ENTREGÁVEIS:
EvolutionModule, client, serviços, telas, testes e documentação.
```

**Critérios de aceite** - \[ \] API Key criptografada e mascarada. - \[
\] Instância tem ciclo de vida rastreável. - \[ \] QR Code expira e
estado conectado é confirmado. - \[ \] Grupos vêm da instância
correta. - \[ \] IDs de grupo são preservados. - \[ \] Envio real de
imagem/legenda é demonstrado em ambiente controlado. - \[ \] Falhas de
um tenant não afetam outro. - \[ \] SSRF e URLs de mídia são tratados.

------------------------------------------------------------------------

# PROMPT 07 --- Automações, scheduler e motor de execução

**Arquivo sugerido:** `prompts/07-AUTOMATION-ENGINE.md`

``` text
Implemente o motor de automações com base nas especificações aprovadas.
Use Redis/BullMQ se essa for a arquitetura confirmada.

1. CRUD DE AUTOMAÇÕES
Campos:
- nome;
- instância WhatsApp;
- grupos destinatários;
- categorias;
- frequência/intervalo;
- dias da semana;
- janela de horário;
- fuso horário;
- limite diário;
- intervalo mínimo;
- janela de não repetição;
- estado ativa/pausada.

Permitir várias automações por tenant.
Uma automação pode ter múltiplas categorias e múltiplos grupos.
Validar que todos os recursos pertencem ao mesmo tenant.

2. WIZARD
Interface em etapas:
a) informações;
b) instância;
c) grupos;
d) categorias;
e) estratégia de seleção;
f) agendamento e limites;
g) revisão;
h) salvar.
Permitir editar sem perder seleção válida.
Exibir erros de validação por etapa.

3. SELEÇÃO
Na execução:
- validar automação ativa;
- validar credencial e instância;
- selecionar categoria conforme estratégia aleatória aprovada;
- consultar produtos elegíveis;
- aplicar amostragem/paginação;
- excluir produtos publicados dentro da janela configurada;
- selecionar produto aleatório;
- se não houver candidato, registrar NO_ELIGIBLE_PRODUCT e encerrar
  sem publicar.

4. LINK
Gerar Short Link usando credencial pertencente ao tenant da automação.
Não continuar se a conversão falhar ou URL não for válida.

5. PUBLICAÇÃO MULTIGRUPO
Uma execução seleciona produto e gera link uma vez.
Criar um destino/publicação por grupo.
Enviar aos grupos individualmente.
Registrar sucesso/falha/resultado indeterminado por destino.
Falha em um destino não apaga resultado dos demais.
Não executar nova busca de produto para cada grupo.

6. SCHEDULER
Agendar conforme timezone, dias e janela configurados.
Recalcular próximos horários após edição, pausa ou retomada.
Evitar jobs duplicados.
Ao pausar, impedir novas publicações ainda não iniciadas.
Definir o tratamento de jobs em andamento.

7. CONFIABILIDADE
Implementar:
- idempotency key;
- locks/concurrency;
- retry com backoff e jitter para falhas seguramente repetíveis;
- limite por tenant e instância;
- DLQ;
- timeout;
- cancelamento;
- recuperação após restart;
- reconciliação de envio indeterminado.

Não fazer retry cego após timeout de envio. A mensagem pode ter sido
entregue sem confirmação. Registrar UNKNOWN/INDETERMINATE e reconciliar
quando houver mecanismo suportado. Não prometer exactly-once sem suporte.

8. LIMITES E SEGURANÇA OPERACIONAL
Impedir frequência excessiva, respeitar permissões dos grupos e políticas
das plataformas. Pausar automação após falhas repetidas configuráveis.
Exibir motivo da pausa e exigir ação apropriada para retomar.

9. TESTES
Categoria única/múltipla, produto aleatório, repetição, nenhum produto,
link inválido, instância desconectada, grupo removido, múltiplos grupos,
falha parcial, concorrência, job duplicado, pause/resume, limite diário,
timezone, reinício de worker, resultado indeterminado e isolamento A/B.

ENTREGÁVEIS:
AutomationModule, scheduler, processors, services, filas, migrations,
testes e documentação operacional.
```

**Critérios de aceite** - \[ \] Cliente cria múltiplas automações
independentes. - \[ \] Uma automação pode usar várias categorias e
grupos. - \[ \] Produto é selecionado entre candidatos elegíveis. - \[
\] Repetição recente é evitada conforme configuração. - \[ \] Link é
gerado com credencial do proprietário. - \[ \] Busca e conversão ocorrem
uma vez por execução multigrupo. - \[ \] Cada grupo tem status
individual. - \[ \] Jobs duplicados são controlados. - \[ \] Timeout de
envio não gera retry cego. - \[ \] Pause/resume e limites são
respeitados.

------------------------------------------------------------------------

# PROMPT 08 --- Frontend, dashboard e experiência do usuário

**Arquivo sugerido:** `prompts/08-FRONTEND-UX.md`

``` text
Atue como Frontend Engineer e UX Designer de SaaS.
Implemente a interface conectada aos endpoints reais já disponíveis.

STACK preferencial: Vue 3, TypeScript, Vite e Tailwind.
Preserve o padrão existente no repositório.

1. DESIGN SYSTEM
Criar tokens de cores, tipografia, espaçamento, componentes de formulário,
botões, tabelas, badges de status, modais, toasts e estados de loading.
Garantir responsividade e acessibilidade básica.

2. NAVEGAÇÃO
- Dashboard
- Integrações
  - Shopee
  - Evolution API
- Instâncias WhatsApp
- Grupos
- Categorias
- Automações
- Publicações
- Histórico
- Configurações

3. DASHBOARD
Exibir dados reais:
- automações ativas/pausadas;
- instâncias conectadas;
- publicações concluídas;
- falhas;
- próximas execuções;
- últimas publicações.
Não fabricar números quando não houver dados.
Incluir empty state para conta nova.

4. SHOPEE
Formulário App ID e Secret.
Salvar, testar, atualizar e desconectar.
Após salvar, mostrar somente Secret configurado/mascarado.
Erros devem ser compreensíveis sem expor detalhes sensíveis.

5. EVOLUTION
Cadastrar servidor, criar instância, solicitar QR Code, acompanhar conexão,
desconectar e excluir.
QR Code deve ter expiração e botão de atualizar quando permitido.
Exibir estados de conexão reais.

6. GRUPOS E CATEGORIAS
Listar dados reais, com busca, seleção, paginação quando necessário,
atualização e indicação da origem/última sincronização.
Exibir mensagem clara quando operação não for suportada.

7. AUTOMAÇÕES
Implementar wizard descrito na especificação.
Exibir resumo antes de salvar:
instância, grupos, categorias, frequência, fuso, limites e estado.
Validar seleções e dependências.
Permitir criar, editar, pausar, retomar e executar manualmente.
Confirmar exclusões.

8. PUBLICAÇÕES E HISTÓRICO
Exibir imagem, título, preço, link, automação, grupo, horário e status.
Diferenciar sucesso, falha, pendente e resultado indeterminado.
Filtros por data, automação, grupo e status.
Links externos devem ser apresentados com segurança.

9. UX E ERROS
- loading, empty, success e error states;
- feedback em ações;
- prevenção de duplo clique;
- confirmação para ações destrutivas;
- mensagens sem stack trace;
- não simular sucesso;
- não criar botão sem ação real;
- tratar sessão expirada;
- acessibilidade por teclado e labels.

10. TESTES
Playwright para login, configuração Shopee, conexão WhatsApp em ambiente
controlado, wizard, CRUD de automação, pausa, histórico e permissões.
Mocks apenas em testes isolados, nunca como prova de integração real.

ENTREGÁVEIS:
Telas, componentes, integração API, testes E2E e documentação.
```

**Critérios de aceite** - \[ \] Todas as telas do MVP existem e estão
conectadas. - \[ \] Dashboard usa dados reais. - \[ \] QR Code e status
refletem a instância real. - \[ \] Wizard valida dependências e permite
múltiplas automações. - \[ \] Histórico diferencia falha parcial e
resultado indeterminado. - \[ \] Não existem botões sem ação. - \[ \]
Layout funciona em desktop e mobile. - \[ \] Testes E2E principais
passam.

------------------------------------------------------------------------

# PROMPT 09 --- Qualidade, segurança e readiness para produção

**Arquivo sugerido:** `prompts/09-SECURITY-QA-PRODUCTION.md`

``` text
Atue como Application Security Engineer, QA Lead e SRE.
Audite o MVP completo. Não declare segurança ou prontidão sem evidências.

1. SEGURANÇA
Avaliar:
- autenticação e autorização;
- isolamento horizontal/vertical;
- multi-tenancy;
- armazenamento e rotação de segredos;
- exposição em logs, traces e exceptions;
- SQL injection;
- XSS;
- CSRF conforme arquitetura;
- SSRF;
- CORS;
- rate limiting;
- validação de payload;
- webhooks;
- uploads e URLs de imagem;
- Docker e permissões;
- dependências vulneráveis;
- configuração de produção.

2. TESTES DE ISOLAMENTO
Criar Tenant A e Tenant B com:
credenciais Shopee diferentes, servidores/instâncias diferentes,
grupos e automações próprias.

Tentar cruzar todos os IDs e executar operações em contexto indevido.
Verificar API, banco, workers, scheduler, webhooks e histórico.

3. TESTES DE INTEGRAÇÃO
Testar falhas Shopee, assinatura, rate limit, timeout, resposta inválida,
Evolution offline, instância desconectada, grupo removido, mídia inválida,
falha parcial e credenciais revogadas.

4. CONFIABILIDADE
Testar:
- jobs duplicados;
- concorrência;
- reinício de Redis/worker;
- recuperação de jobs;
- DLQ;
- retry;
- idempotência;
- timeout de publicação;
- resultado indeterminado;
- consistência entre execução e destinos.

5. PRIVACIDADE E RETENÇÃO
Definir dados necessários, retenção de logs/histórico, exclusão de conta,
revogação de credenciais e procedimento para apagar dados pessoais
conforme requisitos legais aplicáveis. Não reter payloads completos sem
necessidade.

6. OBSERVABILIDADE
Verificar correlationId, executionId, logs sanitizados, métricas de fila,
latência, falhas por integração, health checks e alertas.
Nunca incluir segredos ou conteúdo privado desnecessário.

7. PRODUÇÃO
Validar HTTPS, variáveis, migrations, backup/restore, health checks,
persistência, limites de recursos, política de logs, monitoramento,
procedimento de rollback e runbook.

8. RELATÓRIO
Criar:
- docs/security/SECURITY_AUDIT.md
- docs/quality/QA_REPORT.md
- docs/operations/PRODUCTION_READINESS.md
- docs/operations/RUNBOOK.md
- docs/progress/KNOWN_ISSUES.md

Classificar achados por severidade, evidência, impacto, correção e reteste.
Não ocultar vulnerabilidades. Não marcar pronto se houver risco crítico
ou alto sem tratamento formal aprovado.
```

**Critérios de aceite** - \[ \] Testes de acesso cruzado passam. - \[ \]
Nenhum segredo é encontrado em logs ou repositório. - \[ \] Falhas
externas são tratadas e observáveis. - \[ \] Filas sobrevivem a
reinicializações conforme desenho. - \[ \] Backup e restore foram
testados. - \[ \] Vulnerabilidades críticas/altas estão corrigidas ou
formalmente bloqueiam release. - \[ \] Runbook de operação e recuperação
existe. - \[ \] Relatório final contém evidências e limitações.

------------------------------------------------------------------------

# PROMPT 10 --- Validação End-to-End do fluxo de publicação

**Arquivo sugerido:** `prompts/10-END-TO-END-VALIDATION.md`\
**Objetivo:** comprovar o fluxo completo do produto, da configuração ao
envio.

``` text
Atue como QA Automation Lead e Integration Test Engineer.
Execute a validação end-to-end do MVP.

Não considere mocks como evidência de integração real.
Use ambiente de teste autorizado, credenciais de teste e um grupo WhatsApp
controlado no qual exista autorização para publicar.

PRÉ-CONDIÇÕES
- backend, frontend, PostgreSQL e Redis operacionais;
- migrations aplicadas;
- credenciais de teste Shopee válidas;
- Evolution API de teste acessível;
- instância WhatsApp conectada;
- grupo de teste autorizado;
- contratos externos documentados;
- logs e correlation IDs habilitados.

CENÁRIO E2E-01: CONFIGURAÇÃO
1. Criar/autenticar usuário A.
2. Cadastrar credenciais Shopee A.
3. Validar conexão.
4. Cadastrar servidor Evolution A.
5. Criar instância e conectar via QR Code.
6. Confirmar estado conectado.
7. Listar grupos.
8. Selecionar grupo autorizado.
9. Consultar categorias disponíveis.

Evidências:
IDs internos mascarados, status, timestamps e respostas sanitizadas.

CENÁRIO E2E-02: CRIAÇÃO DA AUTOMAÇÃO
1. Criar automação.
2. Selecionar instância A.
3. Selecionar um ou mais grupos.
4. Selecionar uma ou mais categorias.
5. Configurar frequência, janela, timezone, limite diário e janela
   de não repetição.
6. Revisar e salvar.
7. Confirmar persistência e próximo horário.

CENÁRIO E2E-03: EXECUÇÃO MANUAL CONTROLADA
1. Solicitar execução manual.
2. Confirmar criação de executionId.
3. Confirmar recuperação da credencial A pelo backend.
4. Consultar produtos pela API oficial.
5. Confirmar categoria e produto elegíveis.
6. Confirmar seleção aleatória segundo a estratégia documentada.
7. Confirmar que produto não viola janela de repetição.
8. Gerar Short Link com credencial A.
9. Validar formato e destino do link.
10. Criar registros de publicação por grupo.
11. Enviar imagem e legenda.
12. Consultar/registrar resultado de cada destino.
13. Confirmar histórico completo.

CENÁRIO E2E-04: PUBLICAÇÃO MULTIGRUPO
Configurar pelo menos dois grupos de teste.
Confirmar que uma seleção de produto e um link são reutilizados para
os destinos da mesma execução.
Confirmar status independente por grupo.
Simular falha em um destino e sucesso no outro, em ambiente controlado.
Verificar que a falha parcial não apaga o sucesso.

CENÁRIO E2E-05: AGENDAMENTO
Configurar janela e intervalo curtos em ambiente de teste.
Confirmar que:
- job é agendado;
- não há duplicidade;
- horário respeita timezone;
- limite diário é respeitado;
- pausa impede novas execuções;
- retomada agenda corretamente.

CENÁRIO E2E-06: ISOLAMENTO
Criar usuário B com credenciais, instância, grupo e automação próprios.
Tentar:
- consultar credencial A como B;
- gerar link de B usando credencial A;
- publicar na instância A como B;
- usar grupo A em automação B;
- consultar histórico A como B;
- injetar tenantId/credentialId/instanceId de A nos payloads de B.

Todos os acessos cruzados devem ser negados sem revelar dados.

CENÁRIO E2E-07: FALHAS
Testar:
- Shopee indisponível;
- credencial inválida;
- rate limit;
- produto sem imagem;
- link não gerado;
- Evolution indisponível;
- instância desconectada;
- grupo removido;
- timeout de envio;
- worker reiniciado;
- Redis reiniciado.

Confirmar status coerentes, logs sanitizados, retry seguro e ausência
de publicação duplicada. Timeout de envio deve poder resultar em
INDETERMINATE; não fazer retry cego.

CENÁRIO E2E-08: NÃO REPETIÇÃO
Executar novamente a automação.
Confirmar que produto publicado dentro da janela é excluído quando houver
alternativas elegíveis. Se não houver alternativas, registrar ausência
de produto elegível conforme regra aprovada.

CENÁRIO E2E-09: AUDITORIA
Para cada execução, confirmar:
- tenant;
- automação;
- credencial referenciada sem expor segredo;
- instância;
- categoria;
- produto/snapshot;
- link afiliado;
- grupos/destinos;
- timestamps;
- tentativas;
- resultado e erro sanitizado.

RELATÓRIO FINAL
Criar docs/quality/E2E_REPORT.md com:
- ambiente e versões;
- pré-condições;
- cenários executados;
- PASS/FAIL/BLOCKED;
- evidências e correlation IDs;
- falhas encontradas;
- bugs abertos;
- limitações de ambiente;
- conclusão objetiva.

Não marcar PASS se o cenário foi executado somente com mocks.
Se API real não estiver acessível, marcar BLOCKED e separar o resultado
dos testes simulados.

CONDIÇÃO DE APROVAÇÃO DO MVP
Todos os cenários críticos E2E devem estar PASS.
Cenários BLOCKED devem ser explicitamente aprovados como limitação
temporária pelo responsável do produto, sem serem apresentados como PASS.
Nenhuma vulnerabilidade crítica/alta pode permanecer sem tratamento
formal aprovado.
```

**Critérios de aceite** - \[ \] Configuração real das duas integrações
demonstrada. - \[ \] Instância conectada e grupo de teste
identificado. - \[ \] Produto real obtido pela Shopee. - \[ \] Link
afiliado gerado com a credencial correta. - \[ \] Imagem, título, preço
e link enviados ao grupo controlado. - \[ \] Histórico e auditoria
completos. - \[ \] Publicação multigrupo validada com sucesso parcial. -
\[ \] Isolamento entre tenants comprovado. - \[ \] Falhas e timeout
tratados sem duplicação cega. - \[ \] Relatório E2E publicado com
evidências.

------------------------------------------------------------------------

# Critérios globais de aceite do MVP

O MVP só pode ser considerado funcional quando os itens abaixo forem
comprovados. "Implementado" significa código existente; "validado"
significa teste executado com resultado e evidência.

  -----------------------------------------------------------------------
  ID                      Critério                Evidência mínima
  ----------------------- ----------------------- -----------------------
  MVP-01                  Cadastro e autenticação Testes API/E2E

  MVP-02                  Isolamento multi-tenant Testes negativos A/B

  MVP-03                  Credenciais Shopee      Inspeção de banco/logs
                          protegidas              e testes

  MVP-04                  Validação Shopee        Chamada real ou BLOCKED
                                                  documentado

  MVP-05                  Categorias disponíveis  Resposta real ou
                                                  limitação explícita

  MVP-06                  Consulta de produtos    Resposta real
                                                  documentada

  MVP-07                  Seleção aleatória       Teste da estratégia de
                                                  amostragem

  MVP-08                  Short Link correto      Link gerado pela
                                                  credencial do
                                                  proprietário

  MVP-09                  Credenciais Evolution   Inspeção e testes
                          protegidas              

  MVP-10                  Conexão WhatsApp        QR Code e estado real

  MVP-11                  Listagem de grupos      Dados da instância
                                                  conectada

  MVP-12                  Múltiplas automações    CRUD e isolamento

  MVP-13                  Múltiplas               Teste de configuração
                          categorias/grupos       

  MVP-14                  Agendamento e limites   Testes de
                                                  scheduler/timezone

  MVP-15                  Não repetição           Teste com histórico

  MVP-16                  Publicação real         Mensagem recebida em
                                                  grupo autorizado

  MVP-17                  Falha parcial           Status independente por
                          multigrupo              destino

  MVP-18                  Histórico               Registros consultáveis

  MVP-19                  Idempotência e          Testes de
                          recuperação             concorrência/restart

  MVP-20                  Readiness               Auditoria, backup,
                                                  runbook e relatório
  -----------------------------------------------------------------------

## Definition of Done por funcionalidade

Uma funcionalidade está concluída somente quando: - especificação e
critérios estão atualizados; - implementação está integrada ao padrão do
projeto; - validações e erros estão tratados; - testes relevantes foram
executados; - autorização e isolamento foram testados; - documentação
foi atualizada; - não há mocks no caminho de produção; - evidências e
limitações foram registradas.

------------------------------------------------------------------------

# Sequência resumida de execução

    Ordem Prompt          Resultado obrigatório
  ------- --------------- ------------------------------------------------
       00 Governança      AGENTS.md e regras permanentes
       01 Discovery       PRD, MVP, histórias e critérios
       02 API Discovery   Contratos oficiais e matriz de compatibilidade
       03 Arquitetura     Diagramas, dados, segurança e ADRs
       04 Fundação        Auth, banco, infraestrutura e multi-tenancy
       05 Shopee          Credenciais, categorias/ofertas e Short Link
       06 Evolution       Servidor, instâncias, QR Code, grupos e mídia
       07 Motor           Scheduler, filas, seleção e publicações
       08 Frontend        Dashboard e fluxos completos
       09 Segurança/QA    Auditoria e readiness
       10 E2E             Fluxo integral comprovado

## Regra final de execução

Não avance automaticamente de uma etapa para outra. Ao concluir cada
prompt, apresente o relatório, os testes e os critérios de aceite.
Aguarde a revisão e aprovação do responsável pelo produto.

A prioridade é entregar um MVP pequeno, funcional e verificável --- não
um grande volume de código com integrações presumidas.
