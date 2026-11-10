-- CreateEnum
CREATE TYPE "DispatchStrategy" AS ENUM ('ALL_SEQUENTIAL', 'RANDOM_ORDER', 'RANDOM_SINGLE');

-- CreateEnum
CREATE TYPE "GroupLinkStrategy" AS ENUM ('LEAST_FILLED', 'RANDOM_AVAILABLE', 'MANUAL_WITH_FALLBACK');

-- AlterTable
ALTER TABLE "automations" ADD COLUMN     "captionTemplate" TEXT,
ADD COLUMN     "dispatchStrategy" "DispatchStrategy" NOT NULL DEFAULT 'ALL_SEQUENTIAL',
ADD COLUMN     "groupRedirectLinkId" UUID;

-- AlterTable
ALTER TABLE "whatsapp_groups" ADD COLUMN     "inviteUrl" VARCHAR(500),
ADD COLUMN     "maxParticipants" INTEGER NOT NULL DEFAULT 1024;

-- CreateTable
CREATE TABLE "group_redirect_links" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "strategy" "GroupLinkStrategy" NOT NULL DEFAULT 'LEAST_FILLED',
    "maxParticipants" INTEGER NOT NULL DEFAULT 1024,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentGroupId" UUID,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "lastRedirectedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "group_redirect_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_redirect_targets" (
    "id" UUID NOT NULL,
    "redirectLinkId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "inviteUrl" VARCHAR(500),
    "maxParticipants" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "group_redirect_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_redirect_links_slug_key" ON "group_redirect_links"("slug");

-- CreateIndex
CREATE INDEX "group_redirect_links_tenantId_idx" ON "group_redirect_links"("tenantId");

-- CreateIndex
CREATE INDEX "group_redirect_targets_redirectLinkId_idx" ON "group_redirect_targets"("redirectLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "group_redirect_targets_redirectLinkId_groupId_key" ON "group_redirect_targets"("redirectLinkId", "groupId");

-- AddForeignKey
ALTER TABLE "group_redirect_links" ADD CONSTRAINT "group_redirect_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_redirect_links" ADD CONSTRAINT "group_redirect_links_currentGroupId_fkey" FOREIGN KEY ("currentGroupId") REFERENCES "whatsapp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_redirect_targets" ADD CONSTRAINT "group_redirect_targets_redirectLinkId_fkey" FOREIGN KEY ("redirectLinkId") REFERENCES "group_redirect_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_redirect_targets" ADD CONSTRAINT "group_redirect_targets_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "whatsapp_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_groupRedirectLinkId_fkey" FOREIGN KEY ("groupRedirectLinkId") REFERENCES "group_redirect_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
