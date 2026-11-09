# PROMPT 01 --- Discovery, PRD e especificações funcionais

**Arquivo sugerido:** `prompts/01-DISCOVERY-PRD-SPECS.md`  
**Objetivo:** transformar a ideia em requisitos verificáveis, sem implementar código.

```text
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

**Critérios de aceite:**
- [ ] Todos os fluxos principais e alternativos estão descritos.
- [ ] Requisitos têm identificadores únicos e prioridade.
- [ ] Regras multi-tenant e de propriedade estão explícitas.
- [ ] Escopo MVP e itens fora do MVP estão separados.
- [ ] Dependências não confirmadas das APIs estão listadas.
- [ ] Cada requisito funcional possui critérios de aceite verificáveis.
- [ ] Dúvidas bloqueantes estão em `OPEN_QUESTIONS.md`.
