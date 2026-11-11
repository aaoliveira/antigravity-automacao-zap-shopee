-- AlterTable
ALTER TABLE "whatsapp_instances" ADD COLUMN     "dailyMessageLimit" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "minIntervalSeconds" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "warmUpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "publications_status_sentAt_idx" ON "publications"("status", "sentAt");
