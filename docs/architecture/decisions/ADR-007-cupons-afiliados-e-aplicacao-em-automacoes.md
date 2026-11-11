# ADR-007: Módulo de Cupons por Plataforma de Afiliados e Aplicação Automática em Automações

- **Status:** Aprovado
- **Data:** 2026-11-11
- **Autores:** Product Architect, Software Architect & Full-Stack Team

---

## Contexto e Problema

Afiliados divulgam cupons promocionais com regras próprias (percentual com teto em reais, valor fixo em reais ou código informativo sem desconto numérico, valor mínimo de produto, data de validade, restrição de loja/vendedor e palavras-chave do produto) e precisam injetá-los automaticamente nas mensagens das automações de acordo com o melhor benefício financeiro para cada produto publicado.

Além disso, o sistema atualmente integra oficialmente a plataforma **Shopee Afiliados** (`AffiliatePlatform.SHOPEE`), exigindo que a tela de cadastro exiba apenas plataformas de afiliados realmente existentes no sistema sem induzir o usuário com integrações inexistentes.

---

## Decisão Tomada

1. **Modelo de Dados (`Coupon` + `AffiliatePlatform` + `CouponDiscountType`):**
   - Criação da tabela `coupons` isolada por `tenantId` (`@@index([tenantId, platform, isActive])`) com suporte a:
     - `platform`: enum extensível `AffiliatePlatform` (`SHOPEE` no estado atual do sistema), consultado dinamicamente via `GET /api/coupons/platforms`.
     - `discountType`: `PERCENTAGE` (com `maxDiscountAmount` opcional), `FIXED_AMOUNT` ou `NONE` ("Não informar").
     - Regras de elegibilidade: `minProductPrice`, `expiresAt`, `sellerRestriction`, `productKeywords` (até 10 termos).
     - Limite operacional de 50 cupons cadastrados por organização (`MAX_COUPONS_PER_TENANT = 50`).
   - Vínculo opcional `Automation.couponId` (`SetNull` em exclusão) e registro auditável `AutomationExecution.appliedCouponCode`.

2. **Algoritmo Determinístico/Justo de Seleção (`selectBestCouponForProduct`):**
   - Filtra cupons ativos (`isActive = true`) da mesma plataforma e organização que respeitem validade (`expiresAt >= now`), valor mínimo (`price >= minProductPrice`), vendedor (somente quando o produto identificar vendedor) e ao menos uma palavra-chave configurada.
   - Ordena pelo maior desconto financeiro em `R$` calculado sobre o preço do produto.
   - Em caso de empate no valor do desconto, prioriza cupons com restrição específica (vendedor ou palavras-chave); permanecendo empatados, sorteia aleatoriamente entre os empatados.

3. **Renderização e Limpeza Automática de Variáveis na Legenda (`EvolutionClient.formatCaption`):**
   - Suporte simultâneo a `{variavel}` e `{{variavel}}` para `cupom`, `cupom_desconto`, `preco_com_cupom` e `cupom_validade`.
   - Linhas contendo variáveis de cupom cujo valor resolvido esteja ausente/vazio (ex.: nenhum cupom aplicável, cupom sem data de validade ou `discountType = NONE`) são removidas automaticamente da mensagem enviada ao WhatsApp.
   - Caso a automação utilize o template padrão sem `captionTemplate` customizado e exista cupom elegível, o bloco do cupom é incluído automaticamente na legenda.

---

## Consequências

- **Positivas:** Suporte completo ao fluxo do protótipo (CRUD multi-tenant, regras de uso, preview "Você escreve / Chega no WhatsApp" e seleção inteligente em disparos); zero exposição de plataformas fictícias; fácil extensão quando novas plataformas forem integradas.
- **Negativas / Mitigações:** A Shopee Affiliate Open API (`productOfferV2`) não retorna campo dedicado de vendedor no contrato atual; cupons configurados com restrição de vendedor não serão aplicados indevidamente a produtos sem identificação de loja (orientado explicitamente na UI conforme o protótipo).
