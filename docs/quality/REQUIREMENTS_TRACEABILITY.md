# Matriz de Rastreabilidade de Requisitos (REQUIREMENTS_TRACEABILITY)

> **Projeto:** SaaS Multi-tenant Shopee + WhatsApp Automation  
> **Versão do Documento:** 1.0 (MVP)  
> **Metodologia:** Spec-Driven Development (SDD)  

---

## 1. Visão Geral da Matriz

Esta matriz assegura a correspondência biunívoca entre **Requisitos Funcionais (RF)**, **Histórias de Usuário (US)**, **Regras de Negócio (RN)** e **Critérios de Aceite (AC)**, permitindo rastrear o impacto de alterações e garantir cobertura total de testes.

---

## 2. Matriz de Mapeamento

| Requisito Funcional | Histórias de Usuário Relacionadas | Regras de Negócio Aplicáveis | Critérios de Aceite Associados | Prioridade MVP |
| :--- | :--- | :--- | :--- | :---: |
| **RF-01** (Autenticação e Sessão) | US-01, US-02 | RN-TEN-001, RN-SEC-001 | AC-RF01-01 a AC-RF01-07 | Must-have |
| **RF-02** (Multi-Tenancy Estrito) | US-01, US-08, US-10 | RN-TEN-001, RN-TEN-002, RN-TEN-003 | AC-RF02-01 a AC-RF02-04 | Must-have |
| **RF-03** (Credenciais Shopee) | US-03 | RN-SEC-001, RN-SEC-002, RN-SEC-003, RN-SHO-003 | AC-RF03-01 a AC-RF03-05 | Must-have |
| **RF-04** (Servidor Evolution) | US-04 | RN-TEN-001, RN-SEC-001, RN-SEC-003 | AC-RF04-01 a AC-RF04-04 | Must-have |
| **RF-05** (Instâncias WhatsApp) | US-05 | RN-TEN-002, RN-EVO-002 | AC-RF05-01 a AC-RF05-04 | Must-have |
| **RF-06** (Grupos WhatsApp) | US-06 | RN-TEN-002, RN-EVO-001 | AC-RF06-01 a AC-RF06-04 | Must-have |
| **RF-07** (Categorias Shopee) | US-07 | RN-AUT-004 | AC-RF07-01 a AC-RF07-02 | Must-have |
| **RF-08** (Produtos & Curadoria) | US-07, US-09 | RN-AUT-007 | AC-RF08-01 a AC-RF08-03 | Must-have |
| **RF-09** (Gestão de Automações) | US-08, US-12 | RN-TEN-002, RN-AUT-001, RN-AUT-002 | AC-RF09-01 a AC-RF09-04 | Must-have |
| **RF-10** (Agendamento & Janelas) | US-08 | RN-AUT-001, RN-AUT-003 | AC-RF10-01 a AC-RF10-04 | Must-have |
| **RF-11** (Aleatoriedade & Sorteio) | US-09 | RN-AUT-004, RN-AUT-007 | AC-RF11-01 a AC-RF11-02 | Must-have |
| **RF-12** (Desduplicação / 7 dias) | US-09 | RN-AUT-005, RN-AUT-006 | AC-RF12-01 a AC-RF12-02 | Must-have |
| **RF-13** (Short Link Afiliado) | US-10 | RN-SHO-001, RN-SHO-002 | AC-RF13-01 a AC-RF13-03 | Must-have |
| **RF-14** (Publicação WhatsApp) | US-11 | RN-EVO-002, RN-EVO-003, RN-PUB-001, RN-PUB-002, RN-PUB-003 | AC-RF14-01 a AC-RF14-04 | Must-have |
| **RF-15** (Histórico e Auditoria) | US-13 | RN-SEC-004, RN-TEN-001, RN-EVO-003 | AC-RF15-01 a AC-RF15-03 | Must-have |
| **RF-16** (Dashboard Operacional) | US-14 | RN-TEN-001 | AC-RF16-01 a AC-RF16-03 | Must-have |

---

## 3. Cobertura de Verificação por Tipo de Teste

| Domínio de Requisito | Testes Unitários | Testes de Integração | Testes End-to-End |
| :--- | :---: | :---: | :---: |
| Autenticação & Multi-tenancy (RF-01, RF-02) | ✅ Validação de schemas, hash | ✅ Rotas de auth, isolamento SQL | ✅ Fluxo de login e acesso a tenants |
| Criptografia e Segredos (RF-03, RF-04) | ✅ Algoritmo AES-256-GCM | ✅ Ciclo de escrita/leitura em banco | - |
| Integração Shopee (RF-03, RF-07, RF-08, RF-13) | ✅ Assinatura HMAC, parsers | ✅ Chamadas à API com stubs/sandboxes | ✅ Teste de Short Link real |
| Integração Evolution (RF-04, RF-05, RF-06, RF-14) | ✅ Formatação de payloads | ✅ Criação de instância, listagem | ✅ Disparo real em grupo de teste |
| Motor de Automações & Scheduler (RF-09 a RF-12) | ✅ Algoritmo de sorteio e deduplicação | ✅ Locks concorrentes, worker loop | ✅ Execução manual ponta a ponta |
| Observabilidade & Dashboard (RF-15, RF-16) | ✅ Agregadores de métricas | ✅ Consultas de histórico por tenant | ✅ Renderização no frontend |
