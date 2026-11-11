-- CreateEnum
CREATE TYPE "AffiliatePlatform" AS ENUM ('SHOPEE');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'NONE');

-- AlterTable
ALTER TABLE "automation_executions" ADD COLUMN     "appliedCouponCode" VARCHAR(60);

-- AlterTable
ALTER TABLE "automations" ADD COLUMN     "couponId" UUID;

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "platform" "AffiliatePlatform" NOT NULL DEFAULT 'SHOPEE',
    "code" VARCHAR(60) NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10,2),
    "maxDiscountAmount" DECIMAL(10,2),
    "minProductPrice" DECIMAL(10,2),
    "expiresAt" TIMESTAMPTZ,
    "sellerRestriction" VARCHAR(150),
    "productKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_tenantId_platform_isActive_idx" ON "coupons"("tenantId", "platform", "isActive");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
