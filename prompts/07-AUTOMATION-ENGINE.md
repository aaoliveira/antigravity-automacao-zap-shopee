# PROMPT 07 --- Automações, scheduler e motor de execução

**Arquivo sugerido:** `prompts/07-AUTOMATION-ENGINE.md`  
**Objetivo:** implementar o motor completo de automações, scheduler com BullMQ, desduplicação (7 dias), sorteio uniforme de nichos, geração de short link com credencial do tenant, publicação multi-grupo e isolamento estrito.

```text
Implemente o motor de automações com base nas especificações aprovadas.
Use Redis/BullMQ se essa for a arquitetura confirmada.

1. CRUD DE AUTOMAÇÕES
Campos:
- nome;
- instância WhatsApp;
- grupos destinatários;
- categorias (palavras-chave/nichos DEC-001);
- frequência/intervalo;
- dias da semana;
- janela de horário;
- fuso horário;
- limite diário;
- intervalo mínimo;
- janela de não repetição;
- estado ativa/pausada.

Permitir várias automações por tenant.
Uma automação pode ter múltiplas categorias e múltiplos grupos.
Validar que todos os recursos pertencem ao mesmo tenant.

2. WIZARD
Interface em etapas:
a) informações;
b) instância;
c) grupos;
d) categorias;
e) estratégia de seleção;
f) agendamento e limites;
g) revisão;
h) salvar.
Permitir editar sem perder seleção válida.
Exibir erros de validação por etapa.

3. SELEÇÃO
Na execução:
- validar automação ativa;
- validar credencial e instância;
- selecionar categoria conforme estratégia aleatória aprovada;
- consultar produtos elegíveis;
- aplicar amostragem/paginação;
- excluir produtos publicados dentro da janela configurada;
- selecionar produto aleatório;
- se não houver candidato, registrar NO_ELIGIBLE_PRODUCT e encerrar
  sem publicar.

4. LINK
Gerar Short Link usando credencial pertencente ao tenant da automação.
Não continuar se a conversão falhar ou URL não for válida.

5. PUBLICAÇÃO MULTIGRUPO
Uma execução seleciona produto e gera link uma vez.
Criar um destino/publicação por grupo.
Enviar aos grupos individualmente.
Registrar sucesso/falha/resultado indeterminado por destino.
Falha em um destino não apaga resultado dos demais.
Não executar nova busca de produto para cada grupo.

6. SCHEDULER
Agendar conforme timezone, dias e janela configurados.
Recalcular próximos horários após edição, pausa ou retomada.
Evitar jobs duplicados.
Ao pausar, impedir novas publicações ainda não iniciadas.
Definir o tratamento de jobs em andamento.

7. CONFIABILIDADE
Implementar:
- idempotency key;
- locks/concurrency;
- retry com backoff e jitter para falhas seguramente repetíveis;
- limite por tenant e instância;
- DLQ;
- timeout;
- cancelamento;
- recuperação após restart;
- reconciliação de envio indeterminado.

Não fazer retry cego após timeout de envio. A mensagem pode ter sido
entregue sem confirmação. Registrar UNKNOWN/INDETERMINATE e reconciliar
quando houver mecanismo suportado. Não prometer exactly-once sem suporte.

8. LIMITES E SEGURANÇA OPERACIONAL
Impedir frequência excessiva, respeitar permissões dos grupos e políticas
das plataformas. Pausar automação após falhas repetidas configuráveis.
Exibir motivo da pausa e exigir ação apropriada para retomar.

9. TESTES
Categoria única/múltipla, produto aleatório, repetição, nenhum produto,
link inválido, instância desconectada, grupo removido, múltiplos grupos,
falha parcial, concorrência, job duplicado, pause/resume, limite diário,
timezone, reinício de worker, resultado indeterminado e isolamento A/B.

ENTREGÁVEIS:
AutomationModule, scheduler, processors, services, filas, migrations,
testes e documentação operacional.
```

**Critérios de aceite:**
- [ ] Cliente cria múltiplas automações independentes.
- [ ] Uma automação pode usar várias categorias e grupos.
- [ ] Produto é selecionado entre candidatos elegíveis.
- [ ] Repetição recente é evitada conforme configuração.
- [ ] Link é gerado com credencial do proprietário.
- [ ] Busca e conversão ocorrem uma vez por execução multigrupo.
- [ ] Cada grupo tem status individual.
- [ ] Jobs duplicados são controlados.
- [ ] Timeout de envio não gera retry cego.
- [ ] Pause/resume e limites são respeitados.
