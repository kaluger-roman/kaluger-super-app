-- CreateEnum
CREATE TYPE "public"."PushChannel" AS ENUM ('WEB_PUSH');

-- AlterTable
ALTER TABLE "public"."push_subscriptions" ADD COLUMN     "channel" "public"."PushChannel" NOT NULL DEFAULT 'WEB_PUSH',
ADD COLUMN     "studentUserId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."reminder_settings" ADD COLUMN     "callNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "push_subscriptions_studentUserId_idx" ON "public"."push_subscriptions"("studentUserId");

-- AddForeignKey
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "public"."student_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A subscription belongs to exactly one owner: a tutor or a student.
ALTER TABLE "public"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_single_owner" CHECK (("userId" IS NULL) <> ("studentUserId" IS NULL));
