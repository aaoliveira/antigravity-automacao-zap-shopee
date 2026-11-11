-- AlterTable
ALTER TABLE "whatsapp_instances" ADD COLUMN     "circuitOpenUntil" TIMESTAMPTZ,
ADD COLUMN     "consecutiveSendFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastErrorReason" VARCHAR(500);
