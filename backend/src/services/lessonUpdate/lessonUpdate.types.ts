import type { Lesson, Prisma } from "@prisma/client";
import type { ShiftResult, UpdateLessonDto } from "../../types";
import type { ShiftPreview } from "../recurringHelpers";

export type LessonUpdateData = Prisma.LessonUncheckedUpdateInput;

export type UpdatedLesson = Prisma.LessonGetPayload<{
  include: { student: { select: { id: true; name: true } } };
}>;

export type PreparedLessonUpdate = {
  dataToUpdate: LessonUpdateData;
  start: Date;
  end: Date;
};

export type ApplyLessonUpdateParams = {
  id: string;
  userId: string;
  existingLesson: Lesson;
  updateData: UpdateLessonDto;
  dataToUpdate: LessonUpdateData;
  start: Date;
  end: Date;
  nextLessonForTransfer: { id: string } | null;
};

export type LessonUpdateResult = {
  lesson: UpdatedLesson;
  result: ShiftResult | undefined;
  plannedShift: ShiftPreview | undefined;
};
