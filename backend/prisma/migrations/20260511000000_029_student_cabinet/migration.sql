-- CreateEnum
CREATE TYPE "StudentInvitationStatus" AS ENUM ('PENDING', 'USED', 'REVOKED');

-- CreateTable
CREATE TABLE "student_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationCodeExpiry" TIMESTAMP(3),
    "verificationCodeSentAt" TIMESTAMP(3),
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT,

    CONSTRAINT "student_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_invitations" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "StudentInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,

    CONSTRAINT "student_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_users_email_key" ON "student_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_users_studentId_key" ON "student_users"("studentId");

-- CreateIndex
CREATE INDEX "student_users_studentId_idx" ON "student_users"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_invitations_tokenHash_key" ON "student_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "student_invitations_studentId_status_idx" ON "student_invitations"("studentId", "status");

-- CreateIndex
CREATE INDEX "student_invitations_tutorId_idx" ON "student_invitations"("tutorId");

-- CreateIndex
CREATE INDEX "student_invitations_expiresAt_idx" ON "student_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "student_users" ADD CONSTRAINT "student_users_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_invitations" ADD CONSTRAINT "student_invitations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_invitations" ADD CONSTRAINT "student_invitations_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
