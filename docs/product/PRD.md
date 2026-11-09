# Product Requirements Document (PRD) — SaaS de Automação Shopee + WhatsApp

> **Produto:** Plataforma Multi-tenant de Automação de Afiliados Shopee via WhatsApp (Evolution API)  
> **Versão:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Status:** Em Revisão / Aguardando Aprovação  
> **Autor:** Product Manager & Requirements Engineering Team

---

## 1. Visão Geral do Produto e Proposta de Valor

### 1.1 Contexto de Mercado e Problema
Afiliados profissionais da Shopee no Brasil dependem da criação contínua e publicação frequente de ofertas em dezenas de grupos de WhatsApp para gerar comissões. Esse processo manual impõe sérios gargalos:
1. **Trabalho manual repetitivo:** Copiar links da Shopee, gerar links curtos rastreáveis pelo painel de afiliados, baixar imagens, formatar títulos e preços e postar manualmente em múltiplos grupos consome horas diárias.
2. **Fadiga de audiência e repetição de ofertas:** Afiliados sem controle acabam postando as mesmas promoções nos mesmos grupos várias vezes por semana, gerando churn e silenciamento dos membros.
3. **Escalar sem risco de banimento:** A falta de cadência estruturada (jitter, intervalos mínimos e janelas horárias) gera bloqueios e banimentos de números no WhatsApp por spam.
4. **Isolamento e Segurança:** Profissionais ou agências que gerenciam múltiplas contas de afiliados necessitam de isolamento rigoroso entre tenants para garantir que links e credenciais nunca se misturem.

### 1.2 Proposta de Valor do Produto
Um SaaS centralizado onde cada afiliado conecta com segurança sua conta Shopee Affiliate Open API e seus servidores/instâncias de Evolution API, configurando "Automações" inteligentes que:
- Selecionam produtos e ofertas elegíveis de categorias configuradas sem viés de primeira página.
- Evitam repetição de produtos recentes (janela de desduplicação configurável).
- Convertem o link original para o link curto rastreável de afiliado usando exclusivamente as credenciais do proprietário da automação.
- Disparam a mensagem (imagem + título + preço + link) com espaçamento temporal seguro para múltiplos grupos selecionados de WhatsApp.
- Registram histórico detalhado e telemetria de cada publicação com status individual por grupo.

---

## 2. Personas e Cenários de Uso

Consulte o documento dedicado [`docs/product/PERSONAS_AND_JOURNEYS.md`](PERSONAS_AND_JOURNEYS.md) para o mapeamento aprofundado das personas:
1. **Lucas, o Super Afiliado Independente:** Gerencia de 5 a 15 grupos de achadinhos no WhatsApp. Precisa de publicações consistentes das 08h às 22h sem precisar ficar o dia todo colado ao celular.
2. **Mariana, Gestora de Agência de Tráfego & Afiliados:** Gerencia operações para múltiplos afiliados com diferentes perfis e credenciais Shopee. Exige isolamento estrito de contas e credenciais.

---

## 3. Requisitos Funcionais (RF-01 a RF-16)

| ID | Nome | Descrição Resumida | Prioridade |
| :--- | :--- | :--- | :---: |
| **RF-01** | Autenticação & Sessões | Cadastro, login com senha forte, logout, recuperação de senha e gestão de sessão JWT com expiração segura. | **Must-have** |
| **RF-02** | Multi-Tenancy Estrito | Isolamento criptográfico e lógico por tenant. Nenhuma consulta ou worker acessa recursos de outro tenant. | **Must-have** |
| **RF-03** | Integração Shopee | Cadastro, validação de conectividade, atualização e desconexão de credenciais (AppId / AppSecret). AppSecret cifrado e nunca exposto após salvar. | **Must-have** |
| **RF-04** | Integração Evolution API | Configuração de URL base e API Key de servidor Evolution API. Validação de conexão e gerenciamento por tenant. | **Must-have** |
| **RF-05** | Gestão de Instâncias WhatsApp | Criação, listagem, visualização de QR Code, acompanhamento de estado de conexão, desconexão, reconexão e deleção de instâncias. | **Must-have** |
| **RF-06** | Gestão e Seleção de Grupos | Listagem de grupos disponíveis na instância conectada, busca por nome, persistência do JID oficial e revalidação de pertinência antes do disparo. | **Must-have** |
| **RF-07** | Gestão de Categorias | Exibição de categorias reais retornadas pela API da Shopee. Se não houver endpoint oficial de categorias, aplicar fallback aprovado sem mascarar limitação. | **Must-have** |
| **RF-08** | Busca e Curadoria de Produtos | Consulta oficial de ofertas na Shopee com paginação, validação de imagem e preço, e seleção randômica de candidatos elegíveis. | **Must-have** |
| **RF-09** | Gestão de Automações | Criação, edição, ativação, pausa, retomada, execução manual imediata e exclusão de automações com N categorias e M grupos de destino. | **Must-have** |
| **RF-10** | Motor de Agendamento | Agendamento baseado em frequência/intervalo, janelas de horário permitidas (ex: 08h às 22h), dias da semana, fuso horário e intervalo mínimo entre disparos. | **Must-have** |
| **RF-11** | Algoritmo de Aleatoriedade | Sorteio uniforme de categoria e seleção pseudo-aleatória de produto entre páginas e itens elegíveis para evitar viés de itens fixos. | **Must-have** |
| **RF-12** | Janela de Não Repetição | Bloqueio de republicação do mesmo produto na mesma automação durante janela configurável (padrão de 7 dias), evitando repetição caso haja alternativas. | **Must-have** |
| **RF-13** | Geração de Short Link Afiliado | Geração de link de afiliado oficial usando estritamente as credenciais do proprietário da automação com vínculo auditável e rastreável. | **Must-have** |
| **RF-14** | Publicação Multi-Grupo WhatsApp | Disparo de imagem + legenda (título, preço, link curto) via Evolution API com controle transacional e status independente por grupo de destino. | **Must-have** |
| **RF-15** | Histórico e Auditoria | Registro detalhado de cada execução: produto selecionado, link gerado, destinos, timestamps, status individual, payloads sanitizados e mensagens de erro. | **Must-have** |
| **RF-16** | Dashboard Operacional | Métricas em tempo real calculadas a partir de dados reais do banco: total de execuções, publicações com sucesso, falhas e próximas execuções. | **Must-have** |

---

## 4. Requisitos Não Funcionais (RNF)

| ID | Categoria | Especificação Mensurável | Proposta / Meta |
| :--- | :--- | :--- | :---: |
| **RNF-01** | **Segurança** | Criptografia em repouso autenticada (AES-256-GCM) para AppSecret Shopee e Global API Key Evolution. Hash de senhas com Argon2id ou Bcrypt (cost >= 12). Sanitização de logs (zero segredos em texto plano). | Obrigatório |
| **RNF-02** | **Desempenho** | Resposta da API web em até 500ms (P95) para requisições de dashboard e gerenciamento, excluindo tempo de resposta de APIs de terceiros. | Proposta (Meta MVP) |
| **RNF-03** | **Disponibilidade** | Disponibilidade do serviço da aplicação de 99,0% no MVP (excluindo janelas de manutenção comunicadas e instabilidades das APIs Shopee/WhatsApp). | Proposta (Meta MVP) |
| **RNF-04** | **Escalabilidade** | Capacidade inicial para suportar até 50 tenants ativos e 250 automações concorrentes com execução em fila distribuída (Redis/Postgres Queue). | Proposta (Meta MVP) |
| **RNF-05** | **Observabilidade** | Logs estruturados em formato JSON com `tenantId`, `automationId`, `executionId` e `requestId`. Registro de telemetria sem expor chaves. | Obrigatório |
| **RNF-06** | **Idempotência** | Bloqueio de execuções simultâneas duplicadas para a mesma automação através de locks distribuídos ou transacionais. | Obrigatório |
| **RNF-07** | **Retenção de Dados** | Histórico detalhado de execuções retido por 30 dias no MVP para fins de auditoria e diagnóstico. | Proposta (Meta MVP) |

---

## 5. Arquitetura de Alto Nível (Conceitual)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Frontend Web (SPA)                            │
│           Dashboard, Configurações, QR Code, Automações e Logs         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST / JWT
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Backend Core (Monólito Modular)                  │
│  - Auth & Multi-Tenancy Guard                                          │
│  - Credentials Vault (AES-256-GCM)                                     │
│  - Automation & Scheduling Engine                                      │
│  - Integration Adapters (Shopee Client / Evolution Client)            │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
    Tarefas em     ▼                                  ▼  Persistência &
    Background ┌───────────────┐                  ┌──────────────────────┐
               │ Worker / Queue│                  │ PostgreSQL + Cifras  │
               └───────┬───────┘                  └──────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Shopee Affiliate API    │     │ Evolution API Server    │
│ (HMAC-SHA256 / GraphQL) │     │ (Baileys / Multi-Inst.) │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 6. Riscos de Negócio e Plano de Mitigação

1. **Risco de Banimento de WhatsApp:**
   - *Mitigação:* Implementação obrigatória de delay/jitter configurável (ex: 5 a 30 segundos entre grupos), limites diários de publicação por automação e alertas visuais no painel orientando boas práticas.
2. **Mudanças ou Instabilidade nas APIs Externas:**
   - *Mitigação:* Isolamento das chamadas externas através de adaptadores e contratos estritos, com retries com backoff exponencial apenas para erros transitórios (429/503), nunca repetindo requisições com resultado incerto.
3. **Vazamento de Dados Multi-Tenant:**
   - *Mitigação:* Restrição em nível de modelo, validação de propriedade obrigatória em todas as rotas e workers, testes automatizados específicos de isolamento multi-tenant.
