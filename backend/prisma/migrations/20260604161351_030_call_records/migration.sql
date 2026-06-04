-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('COMPLETED', 'MISSED', 'REJECTED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CallerKind" AS ENUM ('TUTOR', 'STUDENT');

-- CreateTable
CREATE TABLE "public"."call_records" (
    "id" TEXT NOT NULL,
    "callerKind" "public"."CallerKind" NOT NULL,
    "status" "public"."CallStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "tutorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_records_tutorId_startedAt_idx" ON "public"."call_records"("tutorId", "startedAt");

-- CreateIndex
CREATE INDEX "call_records_studentId_startedAt_idx" ON "public"."call_records"("studentId", "startedAt");

-- AddForeignKey
ALTER TABLE "public"."call_records" ADD CONSTRAINT "call_records_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_records" ADD CONSTRAINT "call_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
