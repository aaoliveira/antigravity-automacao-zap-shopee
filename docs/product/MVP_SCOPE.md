# Escopo do MVP e Fronteiras de Produto (MVP_SCOPE)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  

---

## 1. Princípios do Escopo de MVP

O objetivo primordial do MVP é comprovar a viabilidade técnica e a entrega de valor do fluxo ponta a ponta: **o usuário conecta suas credenciais Shopee e Evolution, configura uma automação e tem ofertas reais enviadas automaticamente para seus grupos de WhatsApp com seu link de afiliado oficial**.

Qualquer funcionalidade que não contribua diretamente para a segurança, isolamento multi-tenant ou para a execução confiável desse fluxo está expressamente fora do MVP.

---

## 2. Itens Estritamente DENTRO do Escopo do MVP

| Módulo | Funcionalidades Incluídas no MVP |
| :--- | :--- |
| **Autenticação & Tenant** | - Auto-cadastro de novos usuários com criação automática de tenant isolado.<br>- Login com email e senha forte.<br>- Logout e invalidação de sessão.<br>- Recuperação de senha por email ou token seguro.<br>- Isolamento total de banco de dados e dados relacionais com chave estrangeira `tenant_id`. |
| **Credenciais Shopee** | - Formulário para inserir `AppId` e `AppSecret`.<br>- Teste de validação imediata da credencial contra o endpoint de ping/shortlink oficial.<br>- Armazenamento criptografado (AES-256-GCM) do `AppSecret`.<br>- Exibição apenas mascarada (`shopee_app_secret: **********ab12`) após salvar.<br>- Possibilidade de atualizar ou revogar a credencial. |
| **Servidor Evolution** | - Configuração do endpoint da Evolution API (`baseURL`) e Chave Global/API Key.<br>- Validação de conectividade com a API da Evolution.<br>- Armazenamento cifrado em repouso da API Key. |
| **Instâncias WhatsApp** | - Criar nova instância no servidor Evolution configurado.<br>- Gerar e exibir QR Code inline no frontend com polling de status.<br>- Acompanhar status em tempo real (Conectado, Desconectado, Conectando).<br>- Desconectar instância (logout) e excluir instância. |
| **Grupos WhatsApp** | - Listar grupos reais retornados pela instância conectada.<br>- Busca textual por nome do grupo.<br>- Armazenamento do JID original (`120363xxx@g.us`).<br>- Validação de pertinência do grupo antes de cada publicação. |
| **Categorias & Produtos** | - Consulta oficial de produtos/ofertas via Shopee Affiliate Open API.<br>- Resolução de categorias com base nas operações reais confirmadas da API (sem alucinações).<br>- Paginação e validação dos dados essenciais (título, preço, imagem válida, URL original). |
| **Motor de Automações** | - Criar, editar, ativar, pausar e excluir automações.<br>- Seleção de 1 ou N categorias por automação.<br>- Seleção de 1 ou N grupos de destino por automação.<br>- Disparo manual imediato ("Executar Agora") para testes ponta a ponta. |
| **Agendamento & Sorteio** | - Configuração de frequência (ex: a cada X minutos/horas), dias da semana e janela horária (ex: 08:00 às 22:00).<br>- Fuso horário configurado no tenant (padrão `America/Sao_Paulo`).<br>- Seleção aleatória uniforme de categoria e de produto não repetido.<br>- Janela de não repetição (desduplicação) padrão de 7 dias na mesma automação. |
| **Publicação WhatsApp** | - Geração de Short Link oficial da Shopee com as credenciais do dono da automação.<br>- Envio de imagem + legenda estruturada (Título, Preço, Link curto).<br>- Espaçamento temporal configurável (jitter de segurança) entre envios para múltiplos grupos da mesma execução.<br>- Registro de resultado independente por grupo (sucesso/falha individual). |
| **Logs & Dashboard** | - Histórico cronológico detalhado de execuções com filtros por automação, status e data.<br>- Painel com métricas reais: Total de publicações, taxa de sucesso, próximas execuções agendadas e alertas de desconexão. |

---

## 3. Itens Estritamente FORA do Escopo do MVP

Os seguintes módulos e recursos estão **formalmente excluídos do MVP** para manter o foco na estabilidade e prevenir inchaço de escopo:

1. **Gateways de Pagamento e Billing:**
   - Não haverá integração com Stripe, Asaas, Mercado Pago ou controle de assinaturas. O provisionamento de contas no MVP é aberto/direto.
2. **Aplicativos Mobile Nativos:**
   - O produto é 100% web responsivo (compatível com mobile web e desktop). Sem apps iOS/Android.
3. **Outros Marketplaces de Afiliados:**
   - Excluídos: Mercado Livre Afiliados, Amazon Associates, Magazine Luiza, AliExpress, Shein. Apenas Shopee Affiliate Open API no MVP.
4. **Geração de Mensagens / Copywriting com IA Generativa (LLMs):**
   - Não haverá integração com OpenAI, Gemini ou Claude para reescrever legendas. As mensagens seguirão templates determinísticos e parametrizáveis.
5. **Analytics Avançado de Vendas e Conversões:**
   - O sistema não rastreará cliques individuais de usuários finais ou comissões geradas (a Shopee não fornece webhook de conversão em tempo real no MVP). O foco é no rastreamento de entregas de mensagens.
6. **Programas de Indicação e Afiliados do Próprio SaaS:**
   - Sem módulos de comissão por indicação de novos clientes do software.
7. **Suporte a Múltiplos Provedores de WhatsApp além da Evolution API:**
   - Excluídos: Z-API, Baileys nativo standalone sem Evolution, Cloud API Oficial da Meta (WABA). Apenas Evolution API via provider homologado.
8. **Edição e Manipulação de Imagens Dinâmicas:**
   - Sem inclusão de molduras, stickers ou badges de preço sobre a imagem original. A imagem oficial fornecida pela Shopee será repassada diretamente ao WhatsApp.
