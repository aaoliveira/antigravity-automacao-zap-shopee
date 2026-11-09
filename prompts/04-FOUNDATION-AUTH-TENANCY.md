# PROMPT 04 --- Fundação, autenticação e multi-tenancy

**Arquivo sugerido:** `prompts/04-FOUNDATION-AUTH-TENANCY.md`  
**Objetivo:** implementar a fundação técnica, infraestrutura de containers, banco de dados, autenticação segura e isolamento multi-tenant.

```text
Implemente a fundação técnica aprovada. Antes, inspecione o repositório.
Não destrua nem substitua código funcional sem justificativa.

ESCOPO:
- estrutura de frontend e backend;
- configuração TypeScript;
- PostgreSQL e Prisma;
- Redis e BullMQ;
- Docker Compose;
- configuração por ambiente;
- health checks;
- migrations;
- autenticação;
- autorização;
- multi-tenancy;
- layout inicial.

AUTENTICAÇÃO:
Implemente cadastro, login, logout, recuperação de senha e gestão de sessão
conforme PRD. Hash de senha com algoritmo apropriado e parâmetros seguros.
Tokens devem ter expiração; refresh token deve ser protegido, rotacionado
e revogável. Não guardar tokens em localStorage se a arquitetura aprovada
usar cookies HttpOnly.

MULTI-TENANCY:
O tenant vem do contexto autenticado, nunca de um campo livre do frontend.
Toda rota que acessa recurso de negócio valida propriedade.
Toda consulta deve ter escopo de tenant.
Workers ainda não devem processar jobs sem validar o tenant no payload
e no banco.

FRONTEND:
Criar login, cadastro, recuperação, layout responsivo, navegação e
estados de carregamento/erro/vazio.

INFRA:
Criar .env.example sem segredos reais.
Separar ambientes development, test e production.
Configurar migrations, health checks e persistência Docker.
Não expor PostgreSQL/Redis publicamente sem necessidade.

TESTES:
- cadastro/login/logout;
- senha inválida;
- token expirado;
- refresh/revogação;
- acesso sem autenticação;
- usuário A tentando ler/alterar recurso de B;
- validação de payload;
- migrations em banco limpo;
- inicialização dos serviços.

ENTREGÁVEIS:
Código, migrations, testes, README de desenvolvimento e documentação
atualizada. Não implementar integrações Shopee/Evolution nesta etapa.
```

**Critérios de aceite:**
- [ ] Projeto inicia seguindo README.
- [ ] Migrations aplicam em banco vazio.
- [ ] Autenticação funciona.
- [ ] Rotas protegidas rejeitam usuários não autenticados.
- [ ] Testes comprovam bloqueio de acesso cruzado.
- [ ] Nenhum segredo real está versionado.
- [ ] Health checks identificam dependências indisponíveis.
