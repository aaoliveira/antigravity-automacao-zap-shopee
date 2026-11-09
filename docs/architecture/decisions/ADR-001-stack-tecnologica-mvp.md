# ADR-001: Definição da Stack Tecnológica do MVP

- **Status:** Aprovado
- **Data:** 2026-11-09
- **Autores:** Software Architect Team

---

## Contexto e Problema
O produto é um SaaS multi-tenant que exige alta confiabilidade em I/O assíncrono (comunicação com APIs externas GraphQL e REST), segurança robusta de credenciais, escalabilidade com filas em background e interface reativa para acompanhamento de QR Code e automações. É fundamental evitar sobreengenharia (microsserviços prematuros) e garantir máxima produtividade e tipagem estrita de ponta a ponta.

---

## Alternativas Consideradas
1. **Alternativa A (Escolhida):**
   - **Frontend:** Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia.
   - **Backend:** Node.js (v20 LTS) + NestJS + TypeScript.
   - **Banco de Dados:** PostgreSQL 16 + Prisma ORM.
   - **Filas e Concorrência:** Redis 7 + BullMQ.
   - **Infraestrutura:** Docker Compose + Nginx.
2. **Alternativa B:** Python + FastAPI + Celery + PostgreSQL.
   - *Desvantagem:* Exige manutenção de dois ecossistemas distintos (Python no backend e JS/TS no frontend), impedindo compartilhamento de tipos e contratos DTO.
3. **Alternativa C:** Go (Golang) + Gin / Fiber.
   - *Desvantagem:* Menor velocidade de iteração no MVP e menor maturidade de ecossistema para bibliotecas de integração específicas em relação a Node.js/TypeScript.

---

## Decisão Tomada e Justificativa
Adotar a **Alternativa A**.  
- O NestJS fornece uma arquitetura modular opinativa e robusta, com injeção de dependência e facilidade para testes unitários e de integração.
- O Prisma ORM garante tipagem estrita do banco de dados relacional e previne injeção SQL.
- O BullMQ sobre Redis é o padrão ouro no ecossistema Node.js para processamento distribuído de filas, suporte a locks e controle de concorrência.
- O Vue 3 com Vite entrega uma experiência de desenvolvimento rápida, componentes reativos limpos e facilidade de integração com renderização de QR Code.

---

## Consequências
- **Positivas:** Tipagem TypeScript compartilhável entre módulos; ecossistema maduro para conexões HTTP; produtividade elevada.
- **Negativas / Mitigações:** O uso de Node.js exige gerenciamento consciente de memória em workers, mitigado pela separação de containers entre a API web e o consumidor BullMQ no Docker Compose.
