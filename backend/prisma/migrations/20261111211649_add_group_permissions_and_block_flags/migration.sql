-- AlterTable
ALTER TABLE "whatsapp_groups" ADD COLUMN     "isAnnounceOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRestricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendBlockedReason" VARCHAR(255);
