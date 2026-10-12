-- AlterTable
ALTER TABLE "public"."lessons" ADD COLUMN     "receivedAmount" DECIMAL(10,2);

-- Backfill: every already-paid lesson received exactly its price
UPDATE "public"."lessons" SET "receivedAmount" = COALESCE("price", 0) WHERE "isPaid" = true;
