/*
  Warnings:

  - You are about to drop the column `recurringParentId` on the `lessons` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."lessons" DROP CONSTRAINT "lessons_recurringParentId_fkey";

-- AlterTable
ALTER TABLE "public"."lessons" DROP COLUMN "recurringParentId";
