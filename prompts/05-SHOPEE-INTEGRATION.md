# PROMPT 05 --- Credenciais e integração Shopee

**Arquivo sugerido:** `prompts/05-SHOPEE-INTEGRATION.md`  
**Objetivo:** implementar o módulo de credenciais, o conector oficial GraphQL da Shopee, geração de Short Link, busca de produtos e testes automatizados.

```text
Implemente a integração Shopee somente com os contratos confirmados
em SHOPEE_API_CONTRACTS.md. Se faltar operação essencial, pare e marque
o bloqueio; não crie endpoint presumido.

1. CREDENCIAIS
Criar interface e API para cadastrar App ID e Secret, validar conexão,
atualizar e desconectar.
Criptografar Secret em repouso.
Nunca devolver o valor salvo; retornar somente estado configurado,
mascaramento e metadados.
Evitar logs de request/response que contenham assinatura ou segredo.

2. CLIENT
Implementar cliente isolado para transporte, autenticação, assinatura,
timeout, retry seguro, rate limit e parsing de erros conforme contrato.
Assinatura deve ser testada com vetores/exemplos oficiais quando disponíveis.
Não repetir automaticamente operações não idempotentes sem avaliar risco.

3. CATEGORIAS
Implementar apenas operação oficial confirmada.
Se não houver endpoint de categorias, não inventar catálogo oficial.
Apresentar limitação e alternativa documentada para aprovação.
Cache com data de atualização e estratégia de invalidação, se apropriado.

4. PRODUTOS/OFERTAS
Implementar consulta, filtros e paginação conforme schema oficial.
Normalizar os campos necessários para o domínio:
título, preço, imagem, URL original, identificador e categoria, quando
esses campos forem fornecidos pela API.
Validar moeda, preço, URL e imagem. Não inferir preço ausente.
Não misturar resultados de tenants.

5. ALEATORIEDADE
Selecionar aleatoriamente entre candidatos elegíveis, não simplesmente
usar o primeiro item retornado.
Definir estratégia de amostragem respeitando paginação e limites da API.
Documentar eventuais vieses e limitações de amostragem.
Aplicar histórico de repetição por automação.

6. SHORT LINK
Implementar a operação oficial documentada para gerar link de afiliado.
A credencial deve ser obtida no backend a partir da automação autenticada.
Não aceitar credentialId arbitrário como autoridade.
Validar que a credencial pertence ao mesmo tenant da automação.
Associar link, produto, execução e credencial proprietária.
Validar URL retornada e não publicar se a conversão falhar.
Usar Sub ID somente se suportado e dentro das regras oficiais.

7. ERROS
Mapear autenticação inválida, assinatura inválida, rate limit, timeout,
resposta inválida, produto indisponível e falha de conversão.
Não expor detalhes secretos ao usuário.

8. TESTES
Unitários do signer/client/normalização.
Integração controlada com API quando possível.
Credencial válida/inválida.
Paginação.
Rate limit.
Timeout.
Resposta malformada.
Short Link.
Isolamento A/B: tentar usar credencial B em execução A deve ser bloqueado.
Verificar que nenhuma resposta/log contém Secret.

ENTREGÁVEIS:
ShopeeModule e serviços necessários, contratos atualizados, testes,
documentação de configuração e evidências reais.
```

**Critérios de aceite:**
- [ ] Credenciais criptografadas em repouso e mascaradas na API.
- [ ] Assinatura HMAC-SHA256 validada com testes unitários.
- [ ] Cliente executa `generateShortLink` e `productOfferV2` estritamente conforme contrato.
- [ ] Categorias utilizam palavras-chave/nichos oficiais (`DEC-001`), sem catálogo fictício.
- [ ] Isolamento estrito de credenciais entre tenants comprovado por teste.
- [ ] Nenhuma resposta de API ou log expõe o `AppSecret`.
- [ ] Frontend possui interface de gerenciamento de credenciais Shopee funcional.
