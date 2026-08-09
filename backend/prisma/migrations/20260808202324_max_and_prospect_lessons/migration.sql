-- AlterEnum
ALTER TYPE "public"."ContactMethod" ADD VALUE 'MAX';

-- AlterTable
ALTER TABLE "public"."lessons" ADD COLUMN     "prospectContactMethod" "public"."ContactMethod",
ADD COLUMN     "prospectName" TEXT,
ADD COLUMN     "prospectPhone" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;
