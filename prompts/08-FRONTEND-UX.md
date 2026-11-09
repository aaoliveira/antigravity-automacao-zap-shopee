# PROMPT 08 --- Frontend, dashboard e experiência do usuário

**Arquivo sugerido:** `prompts/08-FRONTEND-UX.md`  
**Objetivo:** Implementar o Dashboard com dados em tempo real, tela analítica de Histórico de Publicações com filtros por data, automação, grupo e status, empty states, toasts de feedback, refinamento de design system e testes e2e de frontend.

```text
Atue como Frontend Engineer e UX Designer de SaaS.
Implemente a interface conectada aos endpoints reais já disponíveis.

STACK preferencial: Vue 3, TypeScript, Vite e Tailwind.
Preserve o padrão existente no repositório.

1. DESIGN SYSTEM
Criar tokens de cores, tipografia, espaçamento, componentes de formulário,
botões, tabelas, badges de status, modais, toasts e estados de loading.
Garantir responsividade e acessibilidade básica.

2. NAVEGAÇÃO
- Dashboard
- Integrações
  - Shopee
  - Evolution API
- Instâncias WhatsApp
- Grupos
- Categorias
- Automações
- Publicações
- Histórico
- Configurações

3. DASHBOARD
Exibir dados reais:
- automações ativas/pausadas;
- instâncias conectadas;
- publicações concluídas;
- falhas;
- próximas execuções;
- últimas publicações.
Não fabricar números quando não houver dados.
Incluir empty state para conta nova.

4. SHOPEE
Formulário App ID e Secret.
Salvar, testar, atualizar e desconectar.
Após salvar, mostrar somente Secret configurado/mascarado.
Erros devem ser compreensíveis sem expor detalhes sensíveis.

5. EVOLUTION
Cadastrar servidor, criar instância, solicitar QR Code, acompanhar conexão,
desconectar e excluir.
QR Code deve ter expiração e botão de atualizar quando permitido.
Exibir estados de conexão reais.

6. GRUPOS E CATEGORIAS
Listar dados reais, com busca, seleção, paginação quando necessário,
atualização e indicação da origem/última sincronização.
Exibir mensagem clara quando operação não for suportada.

7. AUTOMAÇÕES
Implementar wizard descrito na especificação.
Exibir resumo antes de salvar:
instância, grupos, categorias, frequência, fuso, limites e estado.
Validar seleções e dependências.
Permitir criar, editar, pausar, retomar e executar manualmente.
Confirmar exclusões.

8. PUBLICAÇÕES E HISTÓRICO
Exibir imagem, título, preço, link, automação, grupo, horário e status.
Diferenciar sucesso, falha, pendente e resultado indeterminado.
Filtros por data, automação, grupo e status.
Links externos devem ser apresentados com segurança.

9. UX E ERROS
- loading, empty, success e error states;
- feedback em ações;
- prevenção de duplo clique;
- confirmação para ações destrutivas;
- mensagens sem stack trace;
- não simular sucesso;
- não criar botão sem ação real;
- tratar sessão expirada;
- acessibilidade por teclado e labels.

10. TESTES
Playwright para login, configuração Shopee, conexão WhatsApp em ambiente
controlado, wizard, CRUD de automação, pausa, histórico e permissões.
Mocks apenas em testes isolados, nunca como prova de integração real.

ENTREGÁVEIS:
Telas, componentes, integração API, testes E2E e documentação.
```

**Critérios de aceite:**
- [ ] Todas as telas do MVP existem e estão conectadas.
- [ ] Dashboard usa dados reais.
- [ ] QR Code e status refletem a instância real.
- [ ] Wizard valida dependências e permite múltiplas automações.
- [ ] Histórico diferencia falha parcial e resultado indeterminado.
- [ ] Não existem botões sem ação.
- [ ] Layout funciona em desktop e mobile.
- [ ] Testes E2E principais passam.
