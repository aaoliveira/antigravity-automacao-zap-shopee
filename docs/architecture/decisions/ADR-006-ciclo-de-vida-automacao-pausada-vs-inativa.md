# ADR-006: Separação do Ciclo de Vida de Automações (`PAUSED` vs `INACTIVE`) para Edição e Exclusão Segura

- **Status:** Aprovado (`Q-AUT-01` / `DEC-004`)
- **Data:** 2026-11-10
- **Autores:** Product Owner & Software Architect / AppSec Team

---

## Contexto e Problema

O modelo inicial de automações possuía apenas `ACTIVE`, `PAUSED` e `DELETED` no enum `AutomationStatus`. Operacionalmente, pausar uma automação serve para suspender disparos temporariamente (por exemplo, para editar nichos, horários ou grupos), enquanto a exclusão é uma ação destrutiva que deve exigir que a automação tenha sido explicitamente **inativada** antes de poder ser apagada.

---

## Alternativas Consideradas

1. **Reutilizar `PAUSED` como sinônimo de inativa:** Não protege automações pausadas contra exclusão acidental.
2. **Adicionar estado explícito `INACTIVE` ao enum `AutomationStatus` (Escolhida via `DEC-004`):**
   - `ACTIVE`: automação em operação e elegível para agendamento/disparo.
   - `PAUSED`: pausa temporária; suspende agendamento automático, permite edição e bloqueia exclusão.
   - `INACTIVE`: automação desativada; bloqueia agendamento e disparo manual, permite edição, permite reativação (`resume`) e habilita exclusão definitiva.
   - `DELETED`: estado terminal reservado.

---

## Decisão Tomada e Matriz de Transições

1. **Schema Prisma:** Inclusão de `INACTIVE` no enum `AutomationStatus` via migration PostgreSQL aditiva (`ALTER TYPE "AutomationStatus" ADD VALUE 'INACTIVE'`).
2. **Endpoint de Inativação:** `PATCH /api/automations/:id/deactivate` (autenticado e isolado por `tenantId`) altera o status de `ACTIVE` ou `PAUSED` para `INACTIVE`.
3. **Política de Edição (`PUT /api/automations/:id`):** Permitida quando `status ∈ { PAUSED, INACTIVE }`. Tentativas com `ACTIVE` ou `DELETED` retornam `HTTP 409 Conflict`.
4. **Política de Exclusão (`DELETE /api/automations/:id`):** Permitida **exclusivamente** quando `status === INACTIVE`. Tentativas com `ACTIVE` ou `PAUSED` retornam `HTTP 409 Conflict`.
5. **Isolamento Multi-Tenant:** `findOne(tenantId, id)` sempre executa antes da verificação de status para garantir retorno `HTTP 404 Not Found` a qualquer tenant não proprietário, sem vazar estado da automação.

---

## Consequências

- **Positivas:** Proteção robusta contra exclusão acidental de automações apenas pausadas; ciclo de vida explícito na API e na UI (`Ativa`, `Pausada`, `Inativa`).
- **Negativas / Mitigações:** Exige clique adicional ("Inativar") antes de excluir uma automação existente, o que é mitigado por feedback claro e tooltips explicativos na interface.
