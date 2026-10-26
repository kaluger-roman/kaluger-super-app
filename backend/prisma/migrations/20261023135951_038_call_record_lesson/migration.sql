-- AlterTable
ALTER TABLE "public"."call_records" ADD COLUMN     "lessonId" TEXT;

-- CreateIndex
CREATE INDEX "call_records_lessonId_startedAt_idx" ON "public"."call_records"("lessonId", "startedAt");

-- AddForeignKey
ALTER TABLE "public"."call_records" ADD CONSTRAINT "call_records_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
