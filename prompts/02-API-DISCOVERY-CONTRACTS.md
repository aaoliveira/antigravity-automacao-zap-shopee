# PROMPT 02 --- Investigação técnica das APIs e contratos de integração

**Arquivo sugerido:** `prompts/02-API-DISCOVERY-CONTRACTS.md`  
**Objetivo:** confirmar contratos externos antes de implementar os conectores.

```text
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

**Critérios de aceite:**
- [ ] Cada operação externa usada no MVP possui contrato documentado.
- [ ] Autenticação e assinatura Shopee estão verificadas.
- [ ] Geração de Short Link está documentada com request/response.
- [ ] Operações Evolution foram verificadas na versão/provedor escolhidos.
- [ ] Suporte a grupos e mídia está confirmado.
- [ ] Operações não confirmadas estão bloqueadas, sem código especulativo.
