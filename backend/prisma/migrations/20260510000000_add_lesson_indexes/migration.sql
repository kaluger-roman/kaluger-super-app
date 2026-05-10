-- CreateIndex
CREATE INDEX "lessons_tutorId_startTime_idx" ON "lessons"("tutorId", "startTime");

-- CreateIndex
CREATE INDEX "lessons_tutorId_status_idx" ON "lessons"("tutorId", "status");

-- CreateIndex
CREATE INDEX "lessons_tutorId_isPaid_status_idx" ON "lessons"("tutorId", "isPaid", "status");
