-- CreateTable
CREATE TABLE "tax_rate_periods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rate_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_rate_periods_userId_startDate_key" ON "tax_rate_periods"("userId", "startDate");

-- CreateIndex
CREATE INDEX "tax_rate_periods_userId_startDate_idx" ON "tax_rate_periods"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "tax_rate_periods" ADD CONSTRAINT "tax_rate_periods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add taxEnabled BEFORE we drop taxRate so the data migration can read both
ALTER TABLE "users" ADD COLUMN "taxEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DataMigrate: для пользователей с явно не-дефолтной ставкой создаём seed-период
INSERT INTO "tax_rate_periods" ("id", "userId", "startDate", "rate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text AS id,
  u."id",
  COALESCE(MIN(l."startTime"), u."createdAt") AS "startDate",
  u."taxRate",
  NOW(),
  NOW()
FROM "users" u
LEFT JOIN "lessons" l ON l."tutorId" = u."id"
WHERE u."taxRate" <> 6.0
GROUP BY u."id", u."taxRate", u."createdAt";

-- DataMigrate: включаем тумблер у тех же пользователей
UPDATE "users" SET "taxEnabled" = true WHERE "taxRate" <> 6.0;

-- AlterTable: удаляем устаревшую колонку
ALTER TABLE "users" DROP COLUMN "taxRate";
