-- CreateEnum
CREATE TYPE "public"."AdminAlertSeverity" AS ENUM ('critical', 'warning');

-- CreateEnum
CREATE TYPE "public"."AdminAlertEmailStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped_no_email', 'skipped_disabled');

-- AlterTable
ALTER TABLE "public"."backup_settings" ADD COLUMN     "enabledChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."admin_alerts" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "activeType" VARCHAR(64),
    "severity" "public"."AdminAlertSeverity" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "eventKey" VARCHAR(200),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "resolvedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "openEmailStatus" "public"."AdminAlertEmailStatus" NOT NULL,
    "openEmailAttempts" INTEGER NOT NULL DEFAULT 0,
    "openEmailError" TEXT,
    "resolveEmailStatus" "public"."AdminAlertEmailStatus",
    "resolveEmailAttempts" INTEGER NOT NULL DEFAULT 0,
    "resolveEmailError" TEXT,

    CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_settings" (
    "id" TEXT NOT NULL,
    "alertEmail" VARCHAR(254),
    "alertEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "testEmailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_alerts_activeType_key" ON "public"."admin_alerts"("activeType");

-- CreateIndex
CREATE INDEX "admin_alerts_resolvedAt_idx" ON "public"."admin_alerts"("resolvedAt");

-- Backfill: the moment autobackups were last switched is unknown, updatedAt is the best guess
UPDATE "public"."backup_settings" SET "enabledChangedAt" = "updatedAt";
