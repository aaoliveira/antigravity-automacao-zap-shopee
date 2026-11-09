-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('CREATED', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DELETED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'SKIPPED_NO_ELIGIBLE_PRODUCT', 'SKIPPED_INSTANCE_OFFLINE');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopee_credentials" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "appId" VARCHAR(100) NOT NULL,
    "appSecretEncrypted" TEXT NOT NULL,
    "appSecretMasked" VARCHAR(50) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "lastValidatedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shopee_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evolution_servers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "baseUrl" VARCHAR(500) NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "apiKeyMasked" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "evolution_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "instanceName" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'CREATED',
    "phoneConnected" VARCHAR(50),
    "qrCodeBase64" TEXT,
    "lastConnectedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "jid" VARCHAR(150) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "participantCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "shopeeCredentialId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequencyMinutes" INTEGER NOT NULL DEFAULT 60,
    "dailyExecutionLimit" INTEGER NOT NULL DEFAULT 20,
    "jitterSeconds" INTEGER NOT NULL DEFAULT 10,
    "windowStartTime" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "windowEndTime" VARCHAR(5) NOT NULL DEFAULT '22:00',
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[],
    "dedupWindowDays" INTEGER NOT NULL DEFAULT 7,
    "nextExecutionAt" TIMESTAMPTZ,
    "lastExecutedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_keywords" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,

    CONSTRAINT "automation_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_groups" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "automation_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "selectedKeyword" VARCHAR(100),
    "totalDestinations" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_snapshots" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "shopeeItemId" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "imageUrl" VARCHAR(1000) NOT NULL,
    "productUrl" VARCHAR(1000) NOT NULL,
    "commissionRate" DECIMAL(5,4),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "originalUrl" VARCHAR(1000) NOT NULL,
    "shortLink" VARCHAR(255) NOT NULL,
    "subId1" VARCHAR(50),
    "subId2" VARCHAR(50),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "evolutionMessageId" VARCHAR(150),
    "errorMessage" TEXT,
    "sentAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(100),
    "metadataJson" JSONB,
    "ipAddress" VARCHAR(50),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "shopee_credentials_tenantId_idx" ON "shopee_credentials"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "shopee_credentials_tenantId_appId_key" ON "shopee_credentials"("tenantId", "appId");

-- CreateIndex
CREATE INDEX "evolution_servers_tenantId_idx" ON "evolution_servers"("tenantId");

-- CreateIndex
CREATE INDEX "whatsapp_instances_tenantId_idx" ON "whatsapp_instances"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_serverId_instanceName_key" ON "whatsapp_instances"("serverId", "instanceName");

-- CreateIndex
CREATE INDEX "whatsapp_groups_tenantId_idx" ON "whatsapp_groups"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_groups_instanceId_jid_key" ON "whatsapp_groups"("instanceId", "jid");

-- CreateIndex
CREATE INDEX "automations_tenantId_idx" ON "automations"("tenantId");

-- CreateIndex
CREATE INDEX "automations_status_nextExecutionAt_idx" ON "automations"("status", "nextExecutionAt");

-- CreateIndex
CREATE INDEX "automation_keywords_automationId_idx" ON "automation_keywords"("automationId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_keywords_automationId_keyword_key" ON "automation_keywords"("automationId", "keyword");

-- CreateIndex
CREATE INDEX "automation_groups_automationId_idx" ON "automation_groups"("automationId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_groups_automationId_groupId_key" ON "automation_groups"("automationId", "groupId");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_idx" ON "automation_executions"("tenantId");

-- CreateIndex
CREATE INDEX "automation_executions_automationId_startedAt_idx" ON "automation_executions"("automationId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_snapshots_executionId_key" ON "product_snapshots"("executionId");

-- CreateIndex
CREATE INDEX "product_snapshots_shopeeItemId_idx" ON "product_snapshots"("shopeeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_executionId_key" ON "affiliate_links"("executionId");

-- CreateIndex
CREATE INDEX "publications_executionId_idx" ON "publications"("executionId");

-- CreateIndex
CREATE INDEX "publications_groupId_sentAt_idx" ON "publications"("groupId", "sentAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_events_tenantId_createdAt_idx" ON "webhook_events"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopee_credentials" ADD CONSTRAINT "shopee_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evolution_servers" ADD CONSTRAINT "evolution_servers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "evolution_servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_shopeeCredentialId_fkey" FOREIGN KEY ("shopeeCredentialId") REFERENCES "shopee_credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_keywords" ADD CONSTRAINT "automation_keywords_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_groups" ADD CONSTRAINT "automation_groups_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_groups" ADD CONSTRAINT "automation_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "whatsapp_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "whatsapp_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
