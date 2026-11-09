# PROMPT 06 --- Evolution API, instâncias, QR Code e grupos

**Arquivo sugerido:** `prompts/06-EVOLUTION-WHATSAPP.md`  
**Objetivo:** implementar o gerenciamento de servidores Evolution API, ciclo de vida de instâncias WhatsApp (pareamento por QR Code), sincronização de grupos e envio de mensagens com mídia.

```text
Implemente Evolution API conforme EVOLUTION_API_CONTRACTS.md e versão
explicitamente escolhida. Não extrapole operações entre provedores.

1. SERVIDOR
Permitir cadastrar URL base e API Key.
Validar URL, conectividade e autenticação.
Bloquear destinos privados/internos não autorizados para mitigar SSRF.
Se houver necessidade de servidor interno, exigir configuração controlada
pelo administrador e documentar a exceção.
Criptografar API Key e nunca retorná-la em texto claro.

2. INSTÂNCIAS
Criar, listar, consultar, conectar, desconectar, reconectar e excluir
somente conforme contratos confirmados.
Validar propriedade de servidor e instância.
Não assumir que instância está conectada apenas porque foi criada.

3. QR CODE E ESTADO
Exibir QR Code no frontend com expiração e atualização controlada.
Não persistir QR Code por mais tempo que o necessário.
Confirmar conexão consultando estado real ou evento autenticado.
Exibir estados: não conectada, aguardando QR, conectando, conectada,
desconectada, erro e estado desconhecido.
Não mostrar conectado com base apenas em resposta de criação.

4. GRUPOS
Listar grupos da instância conectada.
Persistir identificador original, nome e metadados estritamente necessários.
Permitir pesquisa, atualização e seleção.
Antes de publicar, verificar que grupo pertence à instância e tenant
e ainda está disponível.
Não alterar o formato do groupId retornado pela API.

5. MENSAGENS E MÍDIA
Implementar envio de imagem e legenda com título, preço e link.
Se não houver suporte comprovado a imagem com legenda, implementar
sequência controlada de mídia e texto, com estado por etapa.
Validar URL/tipo/tamanho da imagem e comportamento de download.
Não permitir URLs arbitrárias sem validação contra SSRF.
Não registrar conteúdo sensível desnecessário.

Template padrão:
"Oferta encontrada!

{titulo}

Preço: {preco}

Confira: {link_afiliado}"

O template deve permitir ajustes simples aprovados no MVP, sem motor
complexo de templates.

6. WEBHOOKS
Se usados, validar assinatura/segredo conforme suporte oficial.
Rejeitar eventos inválidos, deduplicar eventos e evitar confiar em
payload sem validação.
Não aceitar tenantId do corpo do webhook como única forma de associação.

7. TESTES
Servidor inválido, API Key inválida, criação, QR Code, estado,
desconexão, grupos, grupo removido, envio de mídia, envio de texto,
timeout, provedor incompatível, webhook inválido e isolamento A/B.

ENTREGÁVEIS:
EvolutionModule, client, serviços, telas, testes e documentação.
```

**Critérios de aceite:**
- [ ] API Key criptografada e mascarada.
- [ ] Instância tem ciclo de vida rastreável.
- [ ] QR Code expira e estado conectado é confirmado.
- [ ] Grupos vêm da instância correta.
- [ ] IDs de grupo são preservados.
- [ ] Envio real de imagem/legenda é demonstrado em ambiente controlado.
- [ ] Falhas de um tenant não afetam outro.
- [ ] SSRF e URLs de mídia são tratados.
