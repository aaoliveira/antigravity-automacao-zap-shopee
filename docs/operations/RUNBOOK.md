# RUNBOOK.md — Guia de Operações, Manutenção e Resolução de Incidentes

> **Projeto:** SaaS Multi-tenant de Automação de Afiliados Shopee + WhatsApp via Evolution API  
> **Público-Alvo:** Engenheiros SRE, DevOps, SysAdmins e Suporte Nível 3  
> **Data de Atualização:** 09/11/2026  
> **Versão:** 1.0.0

---

## 1. Procedimentos de Inicialização e Parada

### 1.1 Inicialização do Ambiente Completo (Docker Compose)
```bash
# 1. Carregar variáveis de ambiente e subir contêineres de infraestrutura + Evolution API
docker compose up -d postgres redis evolution-api

# 2. Verificar estado e healthcheck dos serviços essenciais
docker compose ps

# 3. Aplicar migrações pendentes no banco
npm run db:migrate

# 4. Subir a aplicação completa
docker compose up -d backend frontend
```

> [!NOTE]
> O container `evolution-api` (`evoapicloud/evolution-api:v2.3.7`) utiliza banco PostgreSQL dedicado (`evolution_api` inicializado automaticamente via `evolution-db-init`) e Redis isolado (`redis://redis:6379/6`). A comunicação interna controlada pelo administrador é autorizada exclusivamente para a origem configurada em `EVOLUTION_DOCKER_BASE_URL` quando `EVOLUTION_DOCKER_ENABLED=true`, preservando a mitigação estrita contra SSRF nos demais endereços e parâmetros.

### 1.2 Parada Segura dos Serviços (Graceful Shutdown)
```bash
# Parada suave permitindo que jobs ativos na BullMQ concluam
docker compose stop backend

# Parada completa de todos os contêineres
docker compose down
```

---

## 2. Procedimentos de Deploy e Migração

### 2.1 Pipeline Padrão de Atualização de Versão
1. **Pull do código homologado:**
   ```bash
   git pull origin main
   ```
2. **Execução de migrações estruturais:**
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```
3. **Rebuild e reinício com tempo mínimo de indisponibilidade:**
   ```bash
   docker compose build backend frontend
   docker compose up -d --no-deps backend frontend
   ```
4. **Verificação de integridade pós-deploy:**
   ```bash
   curl -f http://localhost:3005/api/health/ready || echo "ALERTA: Aplicação não pronta!"
   ```

### 2.2 Procedimento de Rollback Imediato
Caso a nova versão apresente falhas críticas em produção:
1. Reverter o código para o commit estável anterior:
   ```bash
   git checkout <hash_commit_anterior>
   ```
2. Se houve migração de banco com breaking change:
   - Executar o script reverso ou restaurar o snapshot do banco anterior ao deploy.
3. Recompilar e subir os contêineres:
   ```bash
   docker compose up -d --build backend frontend
   ```

---

## 3. Procedimento de Backup e Restauração de Desastre (Disaster Recovery)

### 3.1 Execução de Backup Manual do PostgreSQL
```bash
# Gerar dump comprimido com timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec -t shopee_zap_postgres pg_dump -U postgres -d shopee_whatsapp_saas -Fc > "backup_shopee_saas_${TIMESTAMP}.dump"

echo "Backup gerado com sucesso: backup_shopee_saas_${TIMESTAMP}.dump"
```

### 3.2 Restauração de Backup em Base Limpa
> [!CAUTION]
> A restauração sobrescreverá todos os dados correntes do banco. Execute apenas em janela de manutenção autorizada.

```bash
# 1. Interromper o backend para cessar novas gravações
docker compose stop backend

# 2. Dropar e recriar o schema limpo
docker exec -i shopee_zap_postgres psql -U postgres -c "DROP DATABASE shopee_whatsapp_saas;"
docker exec -i shopee_zap_postgres psql -U postgres -c "CREATE DATABASE shopee_whatsapp_saas;"

# 3. Restaurar o arquivo de dump
docker exec -i shopee_zap_postgres pg_restore -U postgres -d shopee_whatsapp_saas < backup_shopee_saas_YYYYMMDD_HHMMSS.dump

# 4. Reiniciar a aplicação
docker compose start backend
```

---

## 4. Procedimento de Rotação da Chave Mestra de Criptografia (`ENCRYPTION_MASTER_KEY`)

Quando a política de segurança exigir rotação periódica ou em caso de suspeita de vazamento da chave:
1. **Gerar nova chave mestra de 256 bits (64 caracteres hexadecimais):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Executar script de recifragem:**
   - O método `CryptoVaultService.reencryptWithNewKey(payload, novaChave)` decifra cada registro das tabelas `shopee_credentials` e `evolution_servers` e grava a nova cifra atômica.
3. **Atualizar a variável de ambiente:**
   - Atualizar `ENCRYPTION_MASTER_KEY` no arquivo `.env` de produção.
4. **Reiniciar o serviço backend:**
   ```bash
   docker compose restart backend
   ```

---

## 5. Playbooks de Troubleshooting (Resolução de Incidentes)

### 5.1 Playbook A: Instância WhatsApp Desconectada / Alerta de QR Code
- **Sintoma:** Execuções registrando `SKIPPED_INSTANCE_OFFLINE`. Usuários reportam que as mensagens pararam de chegar.
- **Diagnóstico:**
  1. Verificar status da instância via API ou painel:
     ```bash
     curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3005/api/whatsapp-instances | jq .
     ```
  2. Verificar logs da Evolution API para verificar se o WhatsApp derrubou a sessão (ex: `Logout`, `401 Unauthorized` ou `Connection Lost`).
- **Ação:**
  1. Solicitar reconexão pelo painel na tela **Instâncias WhatsApp**.
  2. Se a sessão estiver corrompida, desconectar e gerar novo QR Code para leitura no celular do operador.

### 5.2 Playbook B: Erro de Cota / Rate Limit Shopee (`10035` ou `429`)
- **Sintoma:** Execuções registrando `FAILED` com a mensagem `error [10035]: You currently do not have access to the Shopee Affiliate Open API Platform`.
- **Diagnóstico:**
  - A Shopee bloqueou o par App ID/Secret por limite de requisições excedido ou credencial revogada no portal de afiliados.
- **Ação:**
  1. O motor automaticamente aborta a execução sem reenviar para evitar bloqueio definitivo.
  2. Acessar o Portal de Afiliados Shopee (`https://affiliate.shopee.com.br/open_api/home`) e verificar o status da conta.
  3. No painel do SaaS, atualizar as credenciais do tenant com novo App Secret.

### 5.3 Playbook C: Fila Travada ou Acúmulo de Jobs no BullMQ
- **Sintoma:** Automações ativas não disparam no horário programado.
- **Diagnóstico:**
  1. Inspecionar o tamanho da fila no Redis:
     ```bash
     docker exec -it shopee_zap_redis redis-cli LLEN "bull:automations-execution-queue:wait"
     ```
  2. Verificar se há jobs presos em estado ativo (`active`):
     ```bash
     docker exec -it shopee_zap_redis redis-cli SMEMBERS "bull:automations-execution-queue:active"
     ```
- **Ação:**
  1. Se os workers estiverem travados, reiniciar o contêiner `backend`:
     ```bash
     docker compose restart backend
     ```
  2. Os jobs em andamento possuem timeout configurado e serão recuperados ou movidos para estado de falha controlado sem duplicação de disparos.

### 5.4 Playbook D: Remoção de Locks Órfãos no Redis
- **Sintoma:** Automação não executa e logs exibem `Automação já está em processamento concorrente`.
- **Diagnóstico:**
  - Um worker foi encerrado abruptamente (ex: `SIGKILL`) antes de conseguir executar o `releaseLock`.
- **Ação:**
  1. Localizar a chave do lock da automação:
     ```bash
     docker exec -it shopee_zap_redis redis-cli KEYS "lock:automation:*"
     ```
  2. Notar que o TTL padrão expira automaticamente em 600 segundos (10 minutos).
  3. Caso seja necessária liberação emergencial imediata:
     ```bash
     docker exec -it shopee_zap_redis redis-cli DEL "lock:automation:<AUTOMATION_ID>"
     ```

### 5.5 Playbook E: Expurgo de Dados de Tenant (Solicitação de Exclusão LGPD)
- **Ação:**
  1. Deletar o registro na tabela `tenants`:
     ```sql
     DELETE FROM tenants WHERE id = '<TENANT_ID>';
     ```
  2. Por conta das constraints de chave estrangeira com `ON DELETE CASCADE`:
     - Todas as credenciais, instâncias, grupos, automações, snapshots, links de afiliados e publicações associados serão permanentemente excluídos do banco de dados relacional em uma única transação atômica.
