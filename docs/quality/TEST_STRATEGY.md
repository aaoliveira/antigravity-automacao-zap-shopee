# Estratégia de Testes e Garantia da Qualidade (TEST_STRATEGY)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD) & Test-Driven Development (TDD pragmático)  
> **Autor:** QA Engineer & Security Architect Team  

---

## 1. Princípios de Qualidade e Pirâmide de Testes

A qualidade do software é validada através de uma abordagem em camadas:

```
          / \
         / E2E \       Playwright (Fluxos críticos no browser)
        /-------\
       /  Integ. \     Supertest + PostgreSQL/Redis reais (Rotas, ORM, Multi-Tenant)
      /-----------\
     /   Unitários \   Vitest / Jest (Regras de negócio, Criptografia, Sorteio, Hash)
    /---------------\
```

### 1.1 Regra de Ouro (Zero Mocks em Fluxos de Produção)
Conforme a Regra 2 de `AGENTS.md`, mocks e stubs são **exclusivos do ambiente de testes automatizados**, devidamente identificados como tais, e nunca misturados com código de runtime de produção.

---

## 2. Camadas de Testes e Ferramental

| Camada | Ferramentas | Foco de Validação | Cobertura Mínima |
| :--- | :--- | :--- | :---: |
| **Unitários** | Vitest / Jest | - Algoritmo AES-256-GCM (cifragem, decifragem e integridade de tag).<br>- Cálculo da assinatura SHA-256 da Shopee.<br>- Algoritmo de sorteio randômico e distribuição uniforme de nichos.<br>- Lógica de desduplicação (janela de 7 dias).<br>- Cálculo de jitter e janelas de horário no timezone. | >= 85% do domínio |
| **Integração** | Vitest + Supertest + Testcontainers / Docker DB | - Rotas REST da API NestJS (HTTP status, validação Zod/class-validator).<br>- **Testes Negativos de Multi-Tenancy:** Tenant A tentando acessar ID do Tenant B (esperado HTTP 404/403).<br>- Persistência Prisma e integridade de chaves estrangeiras.<br>- Enfileiramento e locks no Redis/BullMQ. | 100% dos controllers e guards |
| **End-to-End (E2E)** | Playwright | - Cadastro e login com emissão de token JWT.<br>- Configuração de credenciais com validação de máscara.<br>- Criação de automação e disparo manual imediato com visualização no histórico. | Fluxos principais |

---

## 3. Matriz Obrigatória de Testes de Segurança (AppSec)

1. **Teste de Isolamento Multi-Tenant Cruzado (Mandatório):**
   - Criação de Tenant 1 (`T1`) e Tenant 2 (`T2`).
   - `T1` cria uma automação com ID `auto_1`.
   - `T2` efetua requisição autenticada para `GET /api/automations/auto_1`.
   - **Critério de Aprovação:** A requisição **deve** retornar `HTTP 404 Not Found` (ou `HTTP 403 Forbidden`). Nenhuma informação da automação de `T1` pode vazar no payload.
2. **Teste de Tentativa de Adulteração de Segredo:**
   - Um registro de `shopee_credentials` tem seu campo cifrado adulterado em 1 byte diretamente via SQL.
   - A aplicação tenta decifrar a chave com `AES-256-GCM`.
   - **Critério de Aprovação:** A decifragem **deve lançar exceção explícita de falha de autenticação de tag**, abortando o processo sem expor dados.
3. **Teste de Sanitização de Logs:**
   - Simulação de erro de autenticação na Shopee ou Evolution contendo tokens e segredos.
   - Captura do stream de saída de logs.
   - **Critério de Aprovação:** O log gerado **não deve conter** a chave secreta em texto claro; apenas o valor mascarado ou `[REDACTED]`.

---

## 4. Pipeline de Execução e Comandos

```bash
# Execução da suíte unitária
npm run test:unit

# Execução da suíte de integração (com banco de teste)
npm run test:integration

# Execução de testes de segurança multi-tenant
npm run test:security

# Cobertura global
npm run test:cov
```
