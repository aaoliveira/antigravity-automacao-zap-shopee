# ADR-004: Arquitetura de Filas, Idempotência e Semântica de Envio

- **Status:** Aprovado
- **Data:** 2026-11-09
- **Autores:** Software Architect Team

---

## Contexto e Problema
A execução de automações envolve chamadas de I/O em cadeia: consulta e sorteio na Shopee -> geração de link curto de afiliado -> publicação em múltiplos grupos de WhatsApp via Evolution API. É imperativo evitar sobreposição de execuções concorrentes da mesma automação, garantir resiliência contra falhas transitórias e definir a conduta correta perante a impossibilidade teórica de *exactly-once delivery* na comunicação com o WhatsApp.

---

## Alternativas Consideradas
1. **Alternativa 1 (Processamento Síncrono direto no HTTP Controller):** Inviável, pois o loop com múltiplos grupos e jitter pode levar de 30 segundos a vários minutos, estourando limites de timeout HTTP (`504 Gateway Timeout`).
2. **Alternativa 2 (BullMQ com Lock Distribuído e Semântica At-Least-Once Controlada - Escolhida):**
   - Agendamento enfileira jobs no Redis.
   - Lock atômico por automação impede concorrência.
   - Retries com backoff apenas para falhas transitórias pré-envio.
   - Proibição estrita de retry automático após início de envio com resultado indeterminado na Evolution API.
3. **Alternativa 3 (Kafka / RabbitMQ Enterprise):** Complexidade de infraestrutura e custos operacionais desnecessários para o estágio de MVP.

---

## Decisão Tomada e Justificativa
Adotar a **Alternativa 2**:
1. **BullMQ sobre Redis** pela robustez, simplicidade de deploy em Docker Compose e facilidade de integração com o NestJS.
2. **Lock Distribuído no Redis:** `SET lock:automation:{id} {executionId} NX EX 600`. Se o lock estiver ocupado, a nova tentativa é descartada graciosamente.
3. **Semântica de Envio Realista:** 
   - A etapa de publicação em grupos adota transações independentes por destino (`PublicationStatus: SUCCESS | FAILED`).
   - Se a Evolution API der timeout no envio para um grupo, o grupo é gravado como `FAILED` com nota de erro e o sistema segue para o próximo grupo após o jitter. Não há retry cego para não duplicar mensagens no grupo do WhatsApp.

---

## Consequências
- **Positivas:** Prevenção total de disparos duplicados em massa; isolamento de falhas por grupo; proteção do número de WhatsApp contra bloqueios.
- **Negativas / Mitigações:** Mensagens que falharem por timeout indeterminado necessitarão de auditoria visual pelo afiliado no histórico da aplicação.
