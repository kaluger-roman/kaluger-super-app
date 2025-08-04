-- AlterTable
ALTER TABLE "public"."lessons" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurringParentId" TEXT;

-- AlterTable
ALTER TABLE "public"."students" ADD COLUMN     "grade" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."lessons" ADD CONSTRAINT "lessons_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "public"."lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
