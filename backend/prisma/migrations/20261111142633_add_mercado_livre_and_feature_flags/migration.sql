-- AlterEnum
ALTER TYPE "AffiliatePlatform" ADD VALUE 'MERCADO_LIVRE';

-- AlterTable
ALTER TABLE "automations" ADD COLUMN     "mercadoLivreAccountId" UUID,
ADD COLUMN     "platform" "AffiliatePlatform" NOT NULL DEFAULT 'SHOPEE',
ALTER COLUMN "shopeeCredentialId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercado_livre_accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL DEFAULT 'Conta Mercado Livre',
    "affiliateTag" VARCHAR(120),
    "sessionCookieEncrypted" TEXT,
    "sessionCookieMasked" VARCHAR(80),
    "sessionExpiresAt" TIMESTAMPTZ,
    "partnerGatewayUrl" VARCHAR(500),
    "partnerGatewayApiKeyEncrypted" TEXT,
    "partnerGatewayApiKeyMasked" VARCHAR(80),
    "extensionTokenEncrypted" TEXT,
    "oauthAppId" VARCHAR(120),
    "oauthClientSecretEncrypted" TEXT,
    "oauthClientSecretMasked" VARCHAR(80),
    "oauthRedirectUri" VARCHAR(500),
    "oauthAccessTokenEncrypted" TEXT,
    "oauthRefreshTokenEncrypted" TEXT,
    "oauthTokenExpiresAt" TIMESTAMPTZ,
    "mlUserId" VARCHAR(80),
    "mlNickname" VARCHAR(150),
    "isOAuthConnected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mercado_livre_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercado_livre_offers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "accountId" UUID,
    "mlItemId" VARCHAR(80),
    "title" VARCHAR(500) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "imageUrl" VARCHAR(1000) NOT NULL,
    "originalUrl" VARCHAR(1000) NOT NULL,
    "affiliateShortUrl" VARCHAR(500) NOT NULL,
    "sellerName" VARCHAR(150),
    "keyword" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPublishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mercado_livre_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_flags_tenantId_idx" ON "feature_flags"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_tenantId_key_key" ON "feature_flags"("tenantId", "key");

-- CreateIndex
CREATE INDEX "mercado_livre_accounts_tenantId_idx" ON "mercado_livre_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "mercado_livre_offers_tenantId_isActive_idx" ON "mercado_livre_offers"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "mercado_livre_offers_tenantId_mlItemId_idx" ON "mercado_livre_offers"("tenantId", "mlItemId");

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercado_livre_accounts" ADD CONSTRAINT "mercado_livre_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercado_livre_offers" ADD CONSTRAINT "mercado_livre_offers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mercado_livre_offers" ADD CONSTRAINT "mercado_livre_offers_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "mercado_livre_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_mercadoLivreAccountId_fkey" FOREIGN KEY ("mercadoLivreAccountId") REFERENCES "mercado_livre_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
