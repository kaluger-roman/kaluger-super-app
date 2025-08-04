/*
  Warnings:

  - You are about to drop the column `title` on the `lessons` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Subject" AS ENUM ('MATHEMATICS', 'PHYSICS');

-- CreateEnum
CREATE TYPE "public"."LessonType" AS ENUM ('EGE', 'OGE', 'OLYMPICS', 'SCHOOL');

-- AlterTable
ALTER TABLE "public"."lessons" DROP COLUMN "title",
ADD COLUMN     "lessonType" "public"."LessonType" NOT NULL DEFAULT 'SCHOOL',
ADD COLUMN     "subject" "public"."Subject" NOT NULL DEFAULT 'MATHEMATICS';
