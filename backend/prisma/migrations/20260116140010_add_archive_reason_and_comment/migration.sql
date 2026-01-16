-- CreateEnum
CREATE TYPE "public"."ArchiveReason" AS ENUM ('COMPLETED_STUDIES', 'FOUND_ANOTHER_TUTOR', 'CHANGED_MIND', 'POOR_EFFORT', 'MISSED_LESSONS');

-- AlterTable
ALTER TABLE "public"."students" ADD COLUMN     "archiveComment" TEXT,
ADD COLUMN     "archiveReason" "public"."ArchiveReason";
