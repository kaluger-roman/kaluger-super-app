/*
  Warnings:

  - A unique constraint covering the columns `[email,tutorId]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone,tutorId]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."students_email_key";

-- DropIndex
DROP INDEX "public"."students_phone_key";

-- CreateIndex
CREATE UNIQUE INDEX "students_email_tutorId_key" ON "public"."students"("email", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_tutorId_key" ON "public"."students"("phone", "tutorId");
