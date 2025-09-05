/*
  Warnings:

  - You are about to drop the column `email` on the `students` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- DropIndex
DROP INDEX "public"."students_email_tutorId_key";

-- AlterTable
ALTER TABLE "public"."students" DROP COLUMN "email",
ADD COLUMN     "contactMethod" "public"."ContactMethod" NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "parentContactMethod" "public"."ContactMethod",
ADD COLUMN     "parentPhone" TEXT,
ADD COLUMN     "parentTelegramNick" TEXT,
ADD COLUMN     "telegramNick" TEXT;
