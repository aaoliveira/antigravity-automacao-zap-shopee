# ADR-005: Links Permanentes de Grupo ("O grupo mudou, o link continua") e Randomização de Disparos

- **Status:** Aprovado
- **Data:** 2026-11-10
- **Autores:** Software Architect & AppSec Team

---

## Contexto e Problema

Na operação contínua de afiliados Shopee em grupos de WhatsApp, dois gargalos operacionais recorrentes ocorrem em produção:
1. **Saturação / Troca de Grupos sem Quebra de Links Publicados:** Links diretos `https://chat.whatsapp.com/...` publicados em redes sociais, anúncios, páginas de captura ou automações param de converter assim que o grupo atinge seu limite de participantes ou quando o gestor decide redirecionar leads para um novo grupo, obrigando republicação manual em todos os canais.
2. **Previsibilidade e Risco de Bloqueio em Disparos Multi-Grupo:** O envio sempre na mesma ordem fixa para dezenas de grupos em todas as execuções reduz a naturalidade da distribuição e impede campanhas em que apenas um grupo aleatório deve receber determinada oferta por ciclo.

---

## Alternativas Consideradas

1. **Encaminhamento simples sem checagem de lotação (apenas troca manual no banco):** Resolve apenas a mudança manual de grupo, mas falha em evitar que novos membros caiam em grupos já lotados.
2. **Roteamento Inteligente com Link Permanente (`/join/:slug` + `/api/join/:slug`), Sincronização com Evolution API v2 e Estratégias Configuráveis (Escolhida):**
   - Persistência de `GroupRedirectLink` (`slug` único público) e `GroupRedirectTarget` vinculado a múltiplos `WhatsAppGroup` do mesmo tenant.
   - Checagem de ocupação (`participantCount < maxParticipants`) com atualização sob demanda via `GET /group/findGroupInfos/{instanceName}` protegida por cooldown de 15 segundos para evitar rate limit na Evolution API.
   - Seleção automática conforme estratégia (`LEAST_FILLED`, `MANUAL_WITH_FALLBACK`, `RANDOM_AVAILABLE`).
   - Adição de `DispatchStrategy` (`ALL_SEQUENTIAL`, `RANDOM_ORDER`, `RANDOM_SINGLE`) e variável `{link_grupo}` no motor de automações.

---

## Decisão Tomada e Justificativa

1. **Rota Única Permanente Dupla (`/join/:slug` e `/api/join/:slug`):**
   - `GET /api/join/:slug` executa redirecionamento HTTP `302 Found` direto para `https://chat.whatsapp.com/...` do grupo vencedor (ou `409 Conflict` com HTML escapado quando todos os grupos estiverem lotados).
   - `GET /join/:slug` (SPA pública) consulta `GET /api/join/:slug/resolve` para exibir feedback visual amigável ao usuário final antes de encaminhar ao WhatsApp.
2. **Prevenção Estrita de Open Redirect e Isolamento Multi-Tenant:**
   - Toda `inviteUrl` aceita ou persistida deve corresponder exclusivamente à regex oficial `^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{6,100}$`.
   - Links permanentes e sua vinculação em automações (`groupRedirectLinkId`) validam obrigatoriamente a propriedade contra o `tenantId` do JWT.
   - Rotas públicas (`/api/join/:slug`) nunca expõem `tenantId`, JIDs (`@g.us`) nem credenciais do proprietário.
3. **Randomização de Disparos por Automação (`DispatchStrategy`):**
   - `ALL_SEQUENTIAL`: preserva a lista de grupos em ordem fixa.
   - `RANDOM_ORDER`: embaralha os destinos com algoritmo Fisher-Yates a cada execução.
   - `RANDOM_SINGLE`: sorteia 1 grupo ativo distinto por execução, mantendo compatibilidade total com deduplicação e Short Link único por disparo.

---

## Consequências

- **Positivas:** Eliminação de republicação de convites após troca ou lotação de grupos; distribuição equilibrada de participantes no grupo mais vazio disponível; maior proteção anti-spam via randomização de envios; suporte nativo à variável `{link_grupo}` nas legendas.
- **Negativas / Mitigações:**
  - A obtenção automática do `inviteCode` na Evolution API exige que o número conectado da instância seja administrador do grupo no WhatsApp. **Mitigação:** suporte simultâneo a importação automática via `GET /group/inviteCode/{instanceName}` e cadastro manual validado da URL oficial `chat.whatsapp.com`.
  - Picos simultâneos de cliques no link público poderiam sobrecarregar a Evolution API. **Mitigação:** throttle em memória de `15s` por link no `refreshTargetsFromEvolution` e fallback gracioso para a contagem em cache do banco.
