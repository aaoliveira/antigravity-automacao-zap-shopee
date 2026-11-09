# Dúvidas Bloqueantes e Perguntas Abertas (OPEN_QUESTIONS)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Data:** 2026-11-09  

Este documento lista todas as questões técnicas, arquiteturais e de produto que exigem confirmação oficial das APIs de terceiros ou aprovação formal do Product Owner antes das etapas de codificação.

---

## 1. Dúvidas Bloqueantes de Integração Externa (Mapeamento no Prompt 02)

### Q-INT-01: Exposição de Categorias na Shopee Affiliate Open API
- **Contexto:** O RF-07 e a regra RN-AUT-004 exigem que o usuário possa selecionar categorias para filtrar produtos. No entanto, algumas versões da API de afiliados da Shopee não oferecem uma operação GraphQL explícita para listagem de categorias (`query categories`), fornecendo apenas parâmetros de busca textual (`keyword`) ou filtragem na operação de ofertas (`productOfferV2`).
- **Impacto:** Se a API não expuser categorias nativamente, criar um catálogo inventado violará a Regra 2 (Zero Alucinações).
- **Ação Obrigatória:** No **Prompt 02**, inspecionar formalmente a documentação oficial da Shopee (`https://affiliate.shopee.com.br/open_api/list`). Caso não exista operação de categorias:
  - *Alternativa Proposta A:* Permitir que a automação utilize palavras-chave de nicho definidas pelo usuário (ex: "cozinha", "moda", "celular").
  - *Alternativa Proposta B:* Utilizar a lista estática oficial de IDs de categoria homologadas pela Shopee Brasil, se comprovada por documentação oficial.
- **Status:** **PENDENTE DE VALIDAÇÃO TÉCNICA (PROMPT 02)**.

---

### Q-INT-02: Capacidade de Envio de Imagem + Legenda na Evolution API v2 (Provider Baileys)
- **Contexto:** O RF-14 especifica o envio de mensagem contendo imagem e legenda (Título, Preço e Short Link). Na Evolution API v2 com o provider Baileys, o envio de mídia ocorre prioritariamente via `POST /message/sendMedia` com o campo `caption`.
- **Impacto:** Deve-se confirmar se o campo `caption` aceita formatação em negrito/itálico do WhatsApp e links clicáveis, e qual é o comportamento caso a URL da imagem falhe (timeout ou formato não suportado).
- **Ação Obrigatória:** No **Prompt 02**, validar o contrato exato de `sendMedia` na documentação oficial da Evolution API (`https://docs.evolutionfoundation.com.br/evolution-api`).
- **Status:** **PENDENTE DE VALIDAÇÃO TÉCNICA (PROMPT 02)**.

---

## 2. Decisões de Arquitetura e Modelo de Propriedade (Aprovação Necessária)

### Q-ARC-01: Modelo de Hospedagem do Servidor Evolution API
- **Cenário A (Multi-Servidor / BYO-Server - Bring Your Own):** Cada cliente (tenant) cadastra a URL e a API Key do seu próprio servidor Evolution API (ex: auto-hospedado no Railway, VPS ou Docker).
  - *Vantagens:* Custo de infraestrutura WhatsApp fica a cargo do usuário; isolamento físico entre instâncias de diferentes clientes.
  - *Desvantagens:* Configuração mais técnica para o usuário leigo.
- **Cenário B (Servidor Central Compartilhado):** A plataforma mantém um cluster próprio de Evolution API, e o tenant apenas cria instâncias dentro desse servidor gerenciado.
  - *Vantagens:* Experiência do usuário (UX) muito mais simples (apenas clica em "Criar Instância" e lê o QR Code).
  - *Desvantagens:* Risco compartilhado de estabilidade e custos operacionais centralizados.
- **Recomendação da Equipe:** Suportar o **Cenário A** como padrão do modelo de dados (tabela `evolution_servers` pertencente ao `tenant_id`), com a possibilidade técnica de um servidor padrão ser provisionado para testes.
- **Status:** **AGUARDANDO APROVAÇÃO DO PO**.

---

### Q-ARC-02: Política de Fuso Horário e Horário de Verão
- **Proposta:**
  1. Todos os registros de timestamp no banco de dados serão gravados estritamente em **UTC** (`TIMESTAMPTZ`).
  2. O tenant terá um campo configurável de timezone, com padrão inicial fixado em `America/Sao_Paulo` (Horário de Brasília).
  3. O motor de agendamento converterá o horário UTC atual para o fuso do tenant para verificar se está dentro da janela permitida (ex: 08:00 às 22:00).
- **Status:** **PROPOSTA TÉCNICA REGISTRADA — AGUARDANDO VALIDAÇÃO**.

---

## 3. Gestão de Escopo do MVP

### Q-SCP-01: Cadastro Inicial e Provisionamento de Tenants
- **Pergunta:** O cadastro no MVP deve ser totalmente público (qualquer visitante pode se cadastrar e começar a usar) ou deve ser protegido por um código de convite / flag de aprovação pelo administrador?
- **Recomendação da Equipe:** No MVP, manter cadastro aberto com flag de ativação simples ou convite de admin para evitar abuso da infraestrutura durante os primeiros testes de homologação.
- **Status:** **AGUARDANDO DECISÃO DE NEGÓCIO**.
