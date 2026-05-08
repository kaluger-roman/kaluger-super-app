-- AlterTable
ALTER TABLE "users" ADD COLUMN "verificationCodeSentAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
