# Histórias de Usuário (USER_STORIES)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  

---

## Índice de Histórias de Usuário

| ID | Título | Módulo / RF | Prioridade |
| :--- | :--- | :--- | :---: |
| **US-01** | Cadastro e Criação de Tenant Isolado | Auth / Multi-tenancy (RF-01, RF-02) | Must-have |
| **US-02** | Autenticação Segura e Gestão de Sessões | Auth (RF-01) | Must-have |
| **US-03** | Configuração Segura de Credenciais Shopee | Shopee / Criptografia (RF-03, RF-02) | Must-have |
| **US-04** | Configuração do Servidor Evolution API | WhatsApp Core (RF-04) | Must-have |
| **US-05** | Criação de Instância e Conexão via QR Code | WhatsApp Instâncias (RF-05) | Must-have |
| **US-06** | Sincronização e Seleção de Grupos de WhatsApp | WhatsApp Grupos (RF-06) | Must-have |
| **US-07** | Consulta e Seleção de Categorias Oficiais | Produtos Shopee (RF-07) | Must-have |
| **US-08** | Criação e Parametrização de Automação | Motor de Automação (RF-09, RF-10) | Must-have |
| **US-09** | Algoritmo de Sorteio Randômico e Desduplicação | Motor de Automação (RF-11, RF-12) | Must-have |
| **US-10** | Conversão de Link Curto de Afiliado Proprietário | Integração Shopee (RF-13, RF-02) | Must-have |
| **US-11** | Publicação Multi-Grupo com Jitter de Proteção | Disparo WhatsApp (RF-14) | Must-have |
| **US-12** | Disparo Manual Imediato de Automação | Motor de Automação (RF-09) | Must-have |
| **US-13** | Histórico Detalhado e Auditoria de Execuções | Observabilidade (RF-15) | Must-have |
| **US-14** | Dashboard Operacional com Métricas Reais | Painel / Métricas (RF-16) | Must-have |

---

### US-01: Cadastro e Criação de Tenant Isolado
- **ID:** US-01
- **Ator:** Novo usuário / Afiliado
- **Objetivo:** Criar uma conta no sistema informando nome, email e senha.
- **Benefício:** Acessar a plataforma com garantia de isolamento total de seus dados e credenciais em relação a outros clientes.
- **Prioridade:** Must-have
- **Pré-condições:** O email informado não deve estar cadastrado.
- **Fluxo Principal:**
  1. O usuário preenche o formulário de cadastro com nome, email válido e senha forte.
  2. O sistema valida os campos, gera o hash criptográfico da senha (Argon2id/Bcrypt).
  3. O sistema cria o registro de `Tenant` e associa o `User` como proprietário desse tenant.
  4. O sistema autentica o usuário e redireciona para o onboarding.
- **Exceções:**
  - *Email duplicado:* O sistema rejeita o cadastro e exibe mensagem de erro apropriada.
  - *Senha insegura:* Validador bloqueia e indica requisitos mínimos (8 caracteres, maiúscula, número e símbolo).
- **Critérios de Aceite (Given/When/Then):**
  - **Cenário 1:** Cadastro bem-sucedido
    - **Given** que o usuário informa um email não cadastrado e uma senha válida
    - **When** ele submete o formulário de registro
    - **Then** um novo registro de usuário e um novo `tenant_id` exclusivo devem ser persistidos no banco
    - **And** uma sessão autenticada deve ser iniciada com JWT contendo o `tenant_id`.
  - **Cenário 2:** Tentativa de cadastro com email existente
    - **Given** que já existe um usuário com o email "afiliado@teste.com"
    - **When** outro usuário tenta se registrar com esse mesmo email
    - **Then** o sistema deve retornar erro HTTP 409 e nenhuma duplicação de dados deve ocorrer.
- **Dependências:** Nenhuma.

---

### US-02: Autenticação Segura e Gestão de Sessões
- **ID:** US-02
- **Ator:** Usuário cadastrado
- **Objetivo:** Fazer login utilizando email e senha e encerrar a sessão quando desejar.
- **Benefício:** Garantir que apenas o titular da conta acerte suas automações e credenciais.
- **Prioridade:** Must-have
- **Pré-condições:** Conta de usuário ativa.
- **Fluxo Principal:**
  1. O usuário informa email e senha.
  2. O backend valida o hash da senha contra o banco.
  3. O backend emite token JWT assinado contendo identificador do usuário e do seu tenant.
  4. O frontend armazena o token e redireciona para o Dashboard.
- **Exceções:**
  - *Credenciais incorretas:* Mensagem genérica "Credenciais inválidas" retornada (HTTP 401).
- **Critérios de Aceite (Given/When/Then):**
  - **Given** um usuário cadastrado com email e senha válidos
  - **When** o usuário submete o formulário de login
  - **Then** o sistema deve retornar status HTTP 200 com token JWT
  - **And** o token deve conter explicitamente a claim `tenantId` correspondente.
- **Dependências:** US-01.

---

### US-03: Configuração Segura de Credenciais Shopee
- **ID:** US-03
- **Ator:** Afiliado autenticado
- **Objetivo:** Inserir e salvar suas credenciais oficiais de desenvolvedor Shopee (`AppId` e `AppSecret`).
- **Benefício:** Permitir que o sistema realize consultas e gere links em seu nome com segurança máxima.
- **Prioridade:** Must-have
- **Pré-condições:** Usuário autenticado em seu tenant.
- **Fluxo Principal:**
  1. O usuário insere `AppId` e `AppSecret`.
  2. O backend faz um teste de validação contra a API oficial da Shopee com a assinatura HMAC correta.
  3. Se a API Shopee aceitar, o backend criptografa o `AppSecret` usando AES-256-GCM.
  4. O registro é salvo vinculado ao `tenant_id` do usuário.
  5. A resposta devolve apenas o status e o segredo mascarado.
- **Exceções:**
  - *Assinatura rejeitada pela Shopee:* O backend não salva a credencial como ativa e retorna a mensagem de erro da Shopee sanitizada.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** um afiliado informando um `AppId` e `AppSecret` válidos
  - **When** o usuário solicita o salvamento
  - **Then** a credencial é validada contra o endpoint oficial da Shopee
  - **And** o `AppSecret` é persistido cifrado no banco de dados
  - **And** em nenhuma resposta de API ou log o `AppSecret` original em texto claro é retornado.
- **Dependências:** US-01, US-02.

---

### US-04: Configuração do Servidor Evolution API
- **ID:** US-04
- **Ator:** Afiliado autenticado
- **Objetivo:** Informar a URL base e a API Key do seu servidor Evolution API.
- **Benefício:** Habilitar a ponte de comunicação com o WhatsApp.
- **Prioridade:** Must-have
- **Pré-condições:** Usuário autenticado.
- **Fluxo Principal:**
  1. O usuário informa `Base URL` e `API Key`.
  2. O backend executa requisição de teste para verificar a conectividade do servidor.
  3. O backend criptografa a `API Key` em repouso e salva as configurações vinculadas ao `tenant_id`.
- **Exceções:**
  - *Servidor inacessível:* Backend devolve erro HTTP 400 informando falha ao conectar ao servidor Evolution.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma URL de servidor Evolution e uma API Key válidas
  - **When** o usuário submete a configuração
  - **Then** o sistema valida o endpoint e persiste a API Key cifrada
  - **And** a chave nunca é exibida desmascarada na interface após o salvamento.
- **Dependências:** US-01, US-02.

---

### US-05: Criação de Instância e Conexão via QR Code
- **ID:** US-05
- **Ator:** Afiliado autenticado
- **Objetivo:** Criar uma nova instância WhatsApp e conectá-la através da leitura de QR Code.
- **Benefício:** Vincular o número de WhatsApp da sua operação para disparos automáticos.
- **Prioridade:** Must-have
- **Pré-condições:** Servidor Evolution configurado (US-04).
- **Fluxo Principal:**
  1. O usuário clica em "Criar Instância" e dá um nome amigável.
  2. O backend solicita a criação da instância na Evolution API.
  3. O backend requisita o QR Code em Base64 e envia ao frontend.
  4. O usuário escaneia o código no WhatsApp.
  5. O estado da instância transiciona para `open` (conectado).
- **Exceções:**
  - *Tempo limite de leitura:* QR Code expira em 60s; o usuário pode clicar em "Atualizar QR Code".
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma instância recém-criada
  - **When** o usuário solicita o QR Code
  - **Then** a imagem Base64 do QR Code é renderizada
  - **And** quando o scan for concluído no celular, o status da instância deve mudar para "Conectado" no sistema.
- **Dependências:** US-04.

---

### US-06: Sincronização e Seleção de Grupos de WhatsApp
- **ID:** US-06
- **Ator:** Afiliado autenticado
- **Objetivo:** Listar e selecionar os grupos de WhatsApp disponíveis na instância conectada.
- **Benefício:** Escolher com precisão para quais grupos cada automação deve enviar ofertas.
- **Prioridade:** Must-have
- **Pré-condições:** Instância WhatsApp conectada (US-05).
- **Fluxo Principal:**
  1. O usuário clica em "Sincronizar Grupos".
  2. O backend consulta a Evolution API pelos grupos daquela instância.
  3. O sistema salva os grupos no banco com seu identificador original oficial (`jid`, ex: `120363xxx@g.us`) associados ao tenant.
  4. O usuário visualiza a lista e pode filtrar por nome.
- **Exceções:**
  - *Instância offline:* Sistema impede sincronização e notifica que o aparelho está desconectado.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma instância conectada
  - **When** o usuário aciona a sincronização de grupos
  - **Then** todos os grupos retornados pela Evolution API são persistidos com o JID original sob o `tenant_id`
  - **And** ficam disponíveis para seleção em automações.
- **Dependências:** US-05.

---

### US-07: Consulta e Seleção de Categorias Oficiais
- **ID:** US-07
- **Ator:** Afiliado autenticado
- **Objetivo:** Visualizar as categorias de produtos suportadas oficialmente pela Shopee para parametrizar suas automações.
- **Benefício:** Garantir que os produtos buscados correspondam ao nicho desejado pelo afiliado.
- **Prioridade:** Must-have
- **Pré-condições:** Credenciais Shopee configuradas (US-03).
- **Fluxo Principal:**
  1. O usuário abre o seletor de categorias na tela de automação.
  2. O sistema apresenta as categorias comprovadamente existentes na API da Shopee.
  3. Se a API não possuir catálogo formal de categorias, o sistema exibe os nichos/filtros oficialmente mapeados no Prompt 02.
- **Exceções:**
  - *API Shopee indisponível:* Mensagem de erro temporária.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** que o usuário está criando uma automação
  - **When** ele abre a lista de categorias
  - **Then** apenas opções verificadas e homologadas na documentação oficial da Shopee são exibidas
  - **And** nenhuma categoria fictícia é injetada.
- **Dependências:** US-03.

---

### US-08: Criação e Parametrização de Automação
- **ID:** US-08
- **Ator:** Afiliado autenticado
- **Objetivo:** Criar e configurar uma automação com nome, instância, grupos, categorias e regras de agendamento.
- **Benefício:** Deixar a publicação de produtos 100% automatizada segundo os horários desejados.
- **Prioridade:** Must-have
- **Pré-condições:** Instância conectada, grupos sincronizados e credencial Shopee válida.
- **Fluxo Principal:**
  1. O usuário seleciona a instância, 1 ou mais grupos e 1 ou mais categorias.
  2. Define a frequência (ex: a cada 60 minutos), a janela de horário (ex: 08:00 às 22:00) e os dias da semana.
  3. O backend valida que todos os recursos pertencem ao tenant do usuário autenticado.
  4. A automação é salva com status `ACTIVE` e entra na fila de agendamento.
- **Exceções:**
  - *Tentativa de associar recurso de outro tenant:* O backend bloqueia com HTTP 403 / 404 e registra log de segurança.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** recursos válidos e pertencentes exclusivamente ao tenant do usuário
  - **When** o usuário submete a criação da automação
  - **Then** o registro da automação é criado no banco com os horários e vínculos corretos
  - **And** a próxima execução é calculada com base no fuso horário configurado.
- **Dependências:** US-03, US-05, US-06, US-07.

---

### US-09: Algoritmo de Sorteio Randômico e Desduplicação
- **ID:** US-09
- **Ator:** Motor de execução (Worker)
- **Objetivo:** Selecionar aleatoriamente uma categoria e um produto elegível que não tenha sido publicado recentemente pela mesma automação.
- **Benefício:** Evitar repetição maçante de produtos nos grupos e garantir variedade de ofertas.
- **Prioridade:** Must-have
- **Pré-condições:** Execução de automação disparada pelo scheduler ou manualmente.
- **Fluxo Principal:**
  1. O worker sorteia aleatoriamente uma das categorias configuradas na automação.
  2. Consulta a API da Shopee paginada para obter uma lista de produtos candidatos.
  3. Compara os IDs de produtos retornados contra os produtos publicados pela mesma automação nos últimos 7 dias (ou janela configurada).
  4. Sorteia aleatoriamente um produto entre os itens elegíveis não repetidos.
- **Exceções:**
  - *Todos os produtos candidatos já foram postados recentemente:* O worker não força repetição; registra execução como `SKIPPED_NO_ELIGIBLE_PRODUCT` e aguarda o próximo ciclo.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma lista de 20 produtos da Shopee onde 5 já foram postados na janela de 7 dias
  - **When** o algoritmo seleciona o produto
  - **Then** o produto escolhido deve pertencer estritamente ao subconjunto dos 15 produtos não publicados
  - **And** a escolha não deve ser restrita apenas ao primeiro item da lista.
- **Dependências:** US-07, US-08.

---

### US-10: Conversão de Link Curto de Afiliado Proprietário
- **ID:** US-10
- **Ator:** Motor de execução (Worker)
- **Objetivo:** Gerar o Short Link de afiliado oficial utilizando a credencial Shopee do dono da automação.
- **Benefício:** Garantir que toda comissão de compra vá inequivocamente para o afiliado proprietário da automação.
- **Prioridade:** Must-have
- **Pré-condições:** Produto selecionado e credencial Shopee do tenant ativa.
- **Fluxo Principal:**
  1. O worker recupera a credencial Shopee vinculada ao `tenant_id` da automação.
  2. Descriptografa o `AppSecret` na memória de execução usando a chave mestra fora do banco.
  3. Monta a chamada para a operação oficial da Shopee (`generateShortLink`).
  4. Recebe a URL curta gerada e valida que ela possui formato válido.
- **Exceções:**
  - *Falha na Shopee ao converter link:* O worker aborta o envio, registra erro e **nunca** publica o link original sem afiliado ou link de outro tenant.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** um produto válido e o `AppId`/`AppSecret` do tenant
  - **When** o worker solicita a geração do Short Link
  - **Then** a chamada à Shopee é autenticada com as chaves deste tenant específico
  - **And** em caso de erro, a publicação no WhatsApp é cancelada para evitar divulgação de link sem comissão.
- **Dependências:** US-03, US-09.

---

### US-11: Publicação Multi-Grupo com Jitter de Proteção
- **ID:** US-11
- **Ator:** Motor de execução (Worker)
- **Objetivo:** Disparar a mensagem com imagem e legenda contendo link de afiliado para cada grupo selecionado, aplicando jitter temporal.
- **Benefício:** Divulgar a oferta de forma atrativa e proteger o número do WhatsApp contra detecção de spam.
- **Prioridade:** Must-have
- **Pré-condições:** Produto sorteado, link curto gerado e instância WhatsApp conectada.
- **Fluxo Principal:**
  1. O worker prepara a mensagem formatada: imagem do produto + legenda (Título, Preço e Short Link).
  2. Para o Grupo 1: envia a mensagem via Evolution API e armazena o status `SUCCESS` com timestamp.
  3. Aguarda o intervalo de jitter configurado (ex: 10 segundos).
  4. Para o Grupo 2: repete o envio e registra o status independente.
  5. Conclui a execução quando todos os grupos tiverem sido processados.
- **Exceções:**
  - *Erro no envio para o Grupo 1 (ex: bot removido do grupo):* Registra `FAILED` para o Grupo 1 com o erro sanitizado, mas prossegue para o Grupo 2.
  - *Instância desconectou no meio da fila:* Interrompe os envios restantes e registra motivo `INSTANCE_DISCONNECTED`.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma automação configurada com 3 grupos de destino
  - **When** a execução é processada
  - **Then** 3 publicações individuais são registradas no banco
  - **And** cada grupo possui seu próprio status e identificador de mensagem da Evolution API.
- **Dependências:** US-05, US-06, US-10.

---

### US-12: Disparo Manual Imediato de Automação
- **ID:** US-12
- **Ator:** Afiliado autenticado
- **Objetivo:** Acionar manualmente a execução imediata de uma automação ("Executar Agora").
- **Benefício:** Testar a publicação em tempo real sem precisar esperar o próximo horário agendado.
- **Prioridade:** Must-have
- **Pré-condições:** Automação criada e ativa.
- **Fluxo Principal:**
  1. O usuário clica no botão "Executar Agora" no card ou tabela da automação.
  2. O backend enfileira um job imediato de execução.
  3. O backend retorna status HTTP 202 (Accepted) com o ID da execução.
  4. A interface exibe aviso de que a execução foi iniciada e atualiza o histórico.
- **Exceções:**
  - *Já existe uma execução em andamento para aquela automação:* O sistema bloqueia a segunda execução e exibe aviso de conflito de concorrência.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** uma automação válida sem job em execução
  - **When** o usuário aciona o disparo manual
  - **Then** um job de execução é inserido na fila prioritária
  - **And** a mensagem é enviada para os grupos configurados seguindo todas as regras de negócio de publicação.
- **Dependências:** US-08, US-11.

---

### US-13: Histórico Detalhado e Auditoria de Execuções
- **ID:** US-13
- **Ator:** Afiliado autenticado
- **Objetivo:** Consultar a lista cronológica de todas as execuções, seus status, produtos enviados e diagnósticos de erros.
- **Benefício:** Ter visibilidade total sobre o funcionamento das automações e identificar rapidamente falhas de envio.
- **Prioridade:** Must-have
- **Pré-condições:** Usuário autenticado.
- **Fluxo Principal:**
  1. O usuário acessa a página "Histórico".
  2. O sistema exibe tabela paginada com Data/Hora, Automação, Imagem/Produto, Link curto, Destinos e Status geral.
  3. O usuário clica em "Ver Detalhes" para inspecionar os logs de cada grupo individualmente.
- **Exceções:**
  - *Nenhuma execução registrada:* Exibição de estado vazio informativo.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** execuções concluídas ou com falha para o tenant
  - **When** o usuário consulta o histórico
  - **Then** apenas registros pertencentes ao seu próprio `tenant_id` são exibidos
  - **And** nenhum segredo (tokens, chaves, senhas) aparece nas mensagens de erro detalhadas.
- **Dependências:** US-01, US-11.

---

### US-14: Dashboard Operacional com Métricas Reais
- **ID:** US-14
- **Ator:** Afiliado autenticado
- **Objetivo:** Visualizar cartões com métricas consolidadas: total de automações ativas, instâncias conectadas, ofertas publicadas hoje e próximas execuções.
- **Benefício:** Acompanhar a saúde geral da operação em poucos segundos.
- **Prioridade:** Must-have
- **Pré-condições:** Usuário autenticado.
- **Fluxo Principal:**
  1. O usuário acessa o Dashboard.
  2. O backend calcula as agregações diretamente do banco de dados (filtrado pelo `tenant_id`).
  3. O frontend renderiza os indicadores e a lista de próximas execuções previstas.
- **Exceções:**
  - *Erro no cálculo:* Estado de erro gracioso com botão para recarregar dados.
- **Critérios de Aceite (Given/When/Then):**
  - **Given** um tenant com 2 automações e 15 publicações realizadas hoje
  - **When** o dashboard é carregado
  - **Then** os contadores devem refletir com precisão matemática os dados das tabelas de execuções e automações daquele tenant.
- **Dependências:** US-01, US-08, US-11, US-13.
