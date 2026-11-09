# Regras de Negócio Oficiais (BUSINESS_RULES)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  

---

## 1. Classificação das Regras de Negócio

As regras de negócio do SaaS de automação Shopee + WhatsApp estão organizadas em 6 domínios críticos:

```
RN-TEN (Multi-Tenancy e Propriedade de Dados)
RN-SEC (Segredos, Chaves e Proteção)
RN-SHO (Integração e Afiliados Shopee)
RN-EVO (WhatsApp, Instâncias e Grupos via Evolution API)
RN-AUT (Motor de Automação, Agendamento e Seleção)
RN-PUB (Publicação, Jitter e Idempotência)
```

---

## 2. Catálogo Detalhado de Regras

### Domínio: Multi-Tenancy e Propriedade (RN-TEN)

- **RN-TEN-001 (Isolamento Absoluto por Tenant):** Toda entidade persistida no banco de dados (`credentials`, `servers`, `instances`, `groups`, `automations`, `executions`, `publications`, `history`) deve possuir uma coluna obrigatória `tenant_id` vinculada à tabela `tenants`. Nenhuma query ou mutação pode ser executada sem o filtro explícito do `tenant_id` extraído da sessão autenticada.
- **RN-TEN-002 (Validação de Propriedade Cruzada):** No momento de associar instâncias, grupos, credenciais ou categorias a uma automação, o backend deve validar se cada recurso individual pertence rigorosamente ao `tenant_id` da automação. Qualquer incompatibilidade deve rejeitar a operação com erro HTTP 403/404 e gerar log de segurança.
- **RN-TEN-003 (Isolamento em Background Workers):** Workers, jobs agendados, consumers de fila e schedulers nunca devem utilizar credenciais genéricas ou globais. Todo job deve transportar o `tenant_id` e restaurar o contexto restrito de tenant antes de efetuar qualquer chamada a APIs externas ou gravação em banco.

---

### Domínio: Gestão de Segredos e Dados Sensíveis (RN-SEC)

- **RN-SEC-001 (Criptografia Autenticada em Repouso):** O `AppSecret` da Shopee e a `API Key` do servidor Evolution devem ser cifrados no banco de dados utilizando criptografia simétrica autenticada AES-256-GCM.
- **RN-SEC-002 (Chave Mestra Externa ao Banco):** A chave de criptografia de dados (DEK/KEK) deve residir exclusivamente em variável de ambiente segura (`ENCRYPTION_MASTER_KEY`) fora da infraestrutura do banco de dados relacional.
- **RN-SEC-003 (Mascaramento em Todas as Bordas):** Uma vez gravados, segredos nunca são retornados na íntegra para o frontend, em respostas HTTP de leitura, exceções de sistema ou dumps de telemetria. Apenas formatos mascarados (ex: `shopee_app_secret: ************abcd`) podem ser exibidos ao usuário.
- **RN-SEC-004 (Sanitização Estrita de Logs):** É proibido emitir logs contendo URLs com parâmetros confidenciais, assinaturas de hash HMAC com chaves completas ou tokens de portador.

---

### Domínio: Integração Shopee e Links de Afiliados (RN-SHO)

- **RN-SHO-001 (Proibição de Links sem Afiliação Válida):** Nenhuma mensagem será disparada para o WhatsApp se a conversão do link de afiliado pela Shopee Open API falhar. É terminantemente proibido enviar o link original do produto sem a devida afiliação do usuário.
- **RN-SHO-002 (Credencial Proprietária Mandatória):** A geração do Short Link de afiliado deve utilizar unicamente a credencial Shopee do dono da automação. Uma automação jamais poderá utilizar a credencial de outro tenant, mesmo em caso de erro da sua própria.
- **RN-SHO-003 (Validação Prévia de Credencial):** Toda credencial Shopee adicionada deve passar por um handshake oficial com a API da Shopee antes de ser habilitada para uso em automações.

---

### Domínio: WhatsApp, Instâncias e Grupos (RN-EVO)

- **RN-EVO-001 (Preservação de JID Original):** O identificador de grupos do WhatsApp deve ser persistido exatamente como retornado pela Evolution API (ex: `120363012345678901@g.us`). Não é permitido truncar ou alterar o JID.
- **RN-EVO-002 (Validação de Conexão Pré-Execução):** Antes de iniciar o loop de disparos de uma automação, o sistema deve verificar o estado atual da instância vinculada. Se o status for diferente de `CONNECTED` / `open`, a execução deve ser abortada imediatamente com o status `FAILED_INSTANCE_OFFLINE`.
- **RN-EVO-003 (Independência de Status por Destino):** Caso uma automação possua múltiplos grupos de destino (ex: 5 grupos), a falha de envio para um grupo (ex: bot foi expulso do grupo #2) não deve interromper o envio para os demais grupos (#3, #4, #5). Cada grupo recebe seu registro individual com timestamp e status.
- **RN-EVO-004 (Proibição de Retry Cego):** Em caso de resposta indeterminada da Evolution API (ex: timeout de rede após envio do payload), o sistema não deve efetuar retry imediato automático cego, para evitar duplicação de mensagens no grupo do WhatsApp.

---

### Domínio: Motor de Automação, Agendamento e Seleção (RN-AUT)

- **RN-AUT-001 (Concorrência e Idempotência de Execução):** Uma mesma automação nunca pode ter duas execuções ocorrendo simultaneamente. Ao iniciar uma execução (agendada ou manual), um lock distribuído ou transacional com tempo de expiração (`TTL`) deve ser adquirido. Se o lock estiver ocupado, a nova execução é ignorada.
- **RN-AUT-002 (Respeito a Pausas e Exclusões):** Se uma automação for pausada (`PAUSED`) ou excluída (`DELETED`), nenhum job agendado poderá ser disparado. Se um job estiver na fila e a automação for pausada antes do processamento, o job é descartado graciosamente.
- **RN-AUT-003 (Janela de Horário e Dias Permitidos):** Uma automação só pode disparar mensagens dentro da sua janela horária (ex: 08:00 às 22:00) e nos dias da semana habilitados, calculados com base no fuso horário configurado no tenant (padrão `America/Sao_Paulo`). Se o horário do disparo cair fora da janela, o disparo é reprogramado para o início da próxima janela válida.
- **RN-AUT-004 (Sorteio Uniforme de Categorias):** Quando uma automação tiver $N$ categorias associadas ($N > 1$), o sorteio da categoria deve ser pseudo-aleatório com distribuição uniforme, garantindo igual probabilidade para cada nicho ao longo do tempo.
- **RN-AUT-005 (Desduplicação e Janela de Não Repetição):** Uma automação não pode publicar um produto que já tenha sido publicado por ela mesma dentro de uma janela configurável (padrão de 7 dias / 168 horas). 
- **RN-AUT-006 (Esgotamento de Produtos Elegíveis):** Se todos os produtos retornados pela Shopee na categoria sorteada já tiverem sido publicados dentro da janela de desduplicação, o sistema deve:
  1. Tentar sortear outra categoria configurada na mesma automação (se houver).
  2. Caso todas as categorias estejam sem produtos inéditos, registrar a execução como `SKIPPED_NO_ELIGIBLE_PRODUCT` e concluir o ciclo sem erro e sem forçar repetição.
- **RN-AUT-007 (Sem Viés de Primeira Posição):** A busca de produtos na Shopee não deve limitar a escolha apenas ao primeiro item da lista ou primeira página. O algoritmo deve sortear aleatoriamente o índice do produto entre o conjunto de candidatos elegíveis obtidos.

---

### Domínio: Publicação e Jitter Temporal (RN-PUB)

- **RN-PUB-001 (Jitter Obrigatório entre Grupos):** Quando uma execução enviar a mesma oferta para múltiplos grupos, deve ser inserido um delay aleatório configurável (ex: entre 5 e 20 segundos) entre o envio para o Grupo $K$ e o envio para o Grupo $K+1$. Essa regra previne detecção de comportamento de spam por parte da rede do WhatsApp.
- **RN-PUB-002 (Compartilhamento da Oferta na Mesma Execução):** Em uma determinada execução de uma automação com múltiplos grupos, todos os grupos recebem **o mesmo produto e o mesmo link de afiliado** sorteados para aquela execução específica, salvo especificação formal em contrário.
- **RN-PUB-003 (Estrutura Obrigatória da Mensagem):** A mensagem publicada no grupo deve conter obrigatoriamente:
  - Imagem oficial do produto (obtida da API Shopee).
  - Legenda formatada em texto claro com Título do produto, Preço formatado em Reais (`R$`) e o Short Link de afiliado oficial.
  - Se a Evolution API/provedor exigir envio separado de imagem e texto, o sistema deve garantir que o texto acompanhe a imagem na sequência imediata.
