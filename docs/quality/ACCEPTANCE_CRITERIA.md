# Critérios de Aceite Verificáveis (ACCEPTANCE_CRITERIA)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  

---

## 1. Visão Geral e Estrutura de Aceite

Todos os Requisitos Funcionais (RF-01 a RF-16) possuem critérios de aceite objetivos, verificáveis por testes automatizados (unitários, de integração e e2e) e por inspeção manual.

---

## 2. Critérios de Aceite por Requisito Funcional

### RF-01: Autenticação, Sessões e Recuperação de Senha
- [ ] **AC-RF01-01:** O sistema permite cadastro com nome, email válido e senha (mínimo 8 caracteres, contendo maiúscula, número e símbolo especial).
- [ ] **AC-RF01-02:** Senhas são armazenadas exclusivamente com algoritmo de derivação lenta de chave autenticado (Argon2id ou Bcrypt com salt rounds >= 12).
- [ ] **AC-RF01-03:** Tentativa de cadastro com email já existente retorna HTTP 409 Conflict sem expor detalhes internos.
- [ ] **AC-RF01-04:** Login com credenciais válidas retorna status HTTP 200 com token JWT seguro e claim `tenantId`.
- [ ] **AC-RF01-05:** Login com credenciais inválidas retorna HTTP 401 Unauthorized com mensagem genérica "Credenciais inválidas".
- [ ] **AC-RF01-06:** Rota de logout invalida a sessão do cliente e limpa tokens locais.
- [ ] **AC-RF01-07:** Recuperação de senha emite token temporário de uso único com expiração máxima de 15 minutos.

---

### RF-02: Multi-Tenancy e Isolamento Estrito
- [ ] **AC-RF02-01:** Toda tabela de dados possui coluna `tenant_id` com chave estrangeira indexada.
- [ ] **AC-RF02-02:** O identificador `tenant_id` é extraído exclusivamente do token JWT autenticado no backend; valores enviados no corpo da requisição ou parâmetros pelo frontend para sobrescrever tenant são sumariamente ignorados.
- [ ] **AC-RF02-03:** Consulta por ID de recurso (ex: `/api/automations/:id`) pertencente a outro tenant retorna HTTP 404 Not Found (ou HTTP 403 Forbidden).
- [ ] **AC-RF02-04:** Teste automatizado confirma que o Tenant A não consegue listar, alterar, executar ou excluir automações, credenciais, instâncias ou logs do Tenant B.

---

### RF-03: Gestão de Credenciais Shopee
- [ ] **AC-RF03-01:** O usuário pode cadastrar `AppId` e `AppSecret` fornecidos pelo portal Shopee Open API.
- [ ] **AC-RF03-02:** O backend valida a credencial fazendo chamada oficial autenticada (assinatura HMAC-SHA256) antes de marcar o registro como válido.
- [ ] **AC-RF03-03:** O `AppSecret` é gravado no banco de dados exclusivamente cifrado com AES-256-GCM com vetor de inicialização (IV) e tag de autenticação.
- [ ] **AC-RF03-04:** Qualquer endpoint de leitura retorna o `AppSecret` mascarado (ex: `shopee_app_secret: ************abcd`).
- [ ] **AC-RF03-05:** O usuário pode atualizar as credenciais ou desconectá-las (revogação lógica).

---

### RF-04: Gestão do Servidor Evolution API
- [ ] **AC-RF04-01:** O usuário pode configurar a `URL Base` e a `API Key` do servidor Evolution API.
- [ ] **AC-RF04-02:** O sistema valida a conectividade efetuando um request de ping/healthcheck no servidor Evolution antes de salvar.
- [ ] **AC-RF04-03:** A `API Key` é gravada de forma criptografada em repouso (AES-256-GCM) e nunca exposta em texto claro.
- [ ] **AC-RF04-04:** Caso o servidor Evolution esteja inacessível, o sistema rejeita o salvamento com mensagem informativa e status HTTP 400.

---

### RF-05: Ciclo de Vida de Instâncias WhatsApp
- [ ] **AC-RF05-01:** Criação de nova instância dispara a chamada oficial da Evolution API (`POST /instance/create`).
- [ ] **AC-RF05-02:** Geração de QR Code obtém a imagem Base64 da Evolution API e a renderiza na tela com mecanismo de atualização.
- [ ] **AC-RF05-03:** Quando o usuário lê o QR Code no celular, o status da instância é atualizado para `CONNECTED` no banco de dados.
- [ ] **AC-RF05-04:** O usuário pode solicitar o logout (`POST /instance/logout`) ou a exclusão da instância (`DELETE /instance/delete`), limpando os registros locais correspondentes.

---

### RF-06: Consulta, Sincronização e Seleção de Grupos
- [ ] **AC-RF06-01:** A sincronização de grupos consulta a operação oficial da Evolution API (`fetchAllGroups` / `findGroups`).
- [ ] **AC-RF06-02:** Cada grupo é persistido no banco com seu identificador original oficial retornado pela API (`jid`, ex: `120363xxx@g.us`) associado ao `tenant_id`.
- [ ] **AC-RF06-03:** A interface permite listar, buscar por nome e selecionar 1 ou múltiplos grupos.
- [ ] **AC-RF06-04:** Antes do disparo de uma automação, o worker valida se o grupo continua presente e disponível na instância.

---

### RF-07: Consulta de Categorias de Produtos
- [ ] **AC-RF07-01:** O sistema apresenta apenas categorias ou parâmetros de nicho com suporte oficial comprovado na Shopee Affiliate Open API.
- [ ] **AC-RF07-02:** Caso a Shopee não forneça endpoint de listagem de categorias, o sistema documenta a limitação e expõe a alternativa oficial aprovada (ex: listagem de ofertas por palavras-chave ou categorias fixas documentadas), sem criar categorias fictícias.

---

### RF-08: Busca e Curadoria de Produtos
- [ ] **AC-RF08-01:** A busca de produtos é realizada através da operação oficial da Shopee (`productOfferV2` ou equivalente oficial comprovado).
- [ ] **AC-RF08-02:** A consulta suporta paginação e valida os campos essenciais do produto: ID, título, preço, URL da imagem e link original.
- [ ] **AC-RF08-03:** Produtos com dados ausentes ou inválidos (ex: sem imagem ou com preço zero) são descartados da lista de candidatos elegíveis.

---

### RF-09: Gestão de Automações
- [ ] **AC-RF09-01:** Criação de automação permite vincular 1 instância, $N$ grupos e $M$ categorias.
- [x] **AC-RF09-02:** Ações de editar (permitido somente quando `PAUSED`/inativa; bloqueado com `409` quando `ACTIVE`), pausar (`PAUSED`), retomar (`ACTIVE`) e excluir (`DELETED`) funcionam e alteram o estado no banco.
- [ ] **AC-RF09-03:** Uma exclusão de automação requer confirmação explícita na interface.
- [ ] **AC-RF09-04:** Um botão "Executar Agora" permite o disparo manual imediato, que segue rigorosamente o mesmo fluxo de publicação do agendador.

---

### RF-10: Motor de Agendamento e Janelas Horárias
- [ ] **AC-RF10-01:** O agendamento respeita a frequência configurada (ex: a cada 30 min, 1h, 2h).
- [ ] **AC-RF10-02:** O sistema bloqueia publicações fora da janela horária definida (ex: 08:00 às 22:00) e nos dias não selecionados, convertendo os horários com base no fuso horário do tenant.
- [ ] **AC-RF10-03:** Se a execução cair fora da janela, o próximo horário é agendado para o início da janela seguinte.
- [ ] **AC-RF10-04:** Lock de execução garante que uma automação não seja processada simultaneamente por dois workers.

---

### RF-11: Algoritmo de Aleatoriedade e Imparcialidade
- [ ] **AC-RF11-01:** Quando houver múltiplas categorias configuradas, o sorteio da categoria é uniforme e pseudo-aleatório.
- [ ] **AC-RF11-02:** A seleção do produto entre os elegíveis não se limita ao primeiro produto da lista; sorteia um item com distribuição uniforme entre os candidatos retornados.

---

### RF-12: Desduplicação e Janela de Não Repetição
- [ ] **AC-RF12-01:** O sistema bloqueia a seleção de produtos que já foram publicados pela mesma automação dentro da janela configurada (padrão de 7 dias / 168h).
- [ ] **AC-RF12-02:** Se todos os produtos candidatos da categoria sorteada já tiverem sido publicados recentemente, o sistema tenta outra categoria configurada ou finaliza a execução como `SKIPPED_NO_ELIGIBLE_PRODUCT` sem quebrar e sem forçar repetição.

---

### RF-13: Geração de Short Link de Afiliado Proprietário
- [ ] **AC-RF13-01:** O Short Link é gerado através da operação oficial da Shopee (`generateShortLink`) utilizando exclusivamente as credenciais do `tenant_id` proprietário da automação.
- [ ] **AC-RF13-02:** Se a geração do link curto falhar, a publicação no WhatsApp é abortada imediatamente; o sistema nunca publica com link original ou link de outro afiliado.
- [ ] **AC-RF13-03:** O link gerado é registrado no histórico associado à execução.

---

### RF-14: Publicação WhatsApp Multi-Grupo com Jitter
- [ ] **AC-RF14-01:** A mensagem enviada contém a imagem oficial do produto e a legenda formatada com Título, Preço em Reais e Short Link.
- [ ] **AC-RF14-02:** Quando houver mais de um grupo na automação, o sistema aplica um delay (jitter) aleatório configurável (ex: 5 a 20 segundos) entre os disparos.
- [ ] **AC-RF14-03:** Cada grupo possui registro individual de publicação no banco com seu status (`SUCCESS` ou `FAILED`) e ID da mensagem.
- [ ] **AC-RF14-04:** A falha no envio para um grupo não cancela o envio para os grupos subsequentes.

---

### RF-15: Histórico Detalhado e Auditoria
- [ ] **AC-RF15-01:** Cada execução é persistida com timestamp de início/fim, produto selecionado, link gerado, status geral e detalhamento por grupo.
- [ ] **AC-RF15-02:** Logs e respostas de erro de APIs externas são sanitizados antes de gravar no histórico (sem chaves ou tokens).
- [ ] **AC-RF15-03:** A listagem de histórico no painel permite filtros por data, automação e status.

---

### RF-16: Dashboard Operacional em Tempo Real
- [ ] **AC-RF16-01:** O dashboard exibe indicadores agregados calculados exclusivamente a partir dos dados reais do tenant: total de automações ativas, instâncias conectadas, ofertas publicadas no dia e taxa de sucesso.
- [ ] **AC-RF16-02:** O painel lista as próximas 5 execuções agendadas com os respectivos horários previstos.
- [ ] **AC-RF16-03:** O painel exibe alerta visual de atenção caso alguma instância WhatsApp esteja desconectada.
