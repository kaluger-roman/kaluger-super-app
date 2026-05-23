-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "students_tutorId_archived_idx" ON "public"."students"("tutorId", "archived");
