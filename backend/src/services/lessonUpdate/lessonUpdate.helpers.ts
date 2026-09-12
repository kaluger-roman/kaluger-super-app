import type { Lesson } from "@prisma/client";
import type { UpdateLessonDto } from "../../types";
import { truncateToMinute } from "../../utils/time";
import type { PreparedLessonUpdate } from "./lessonUpdate.types";

export const resolveUpdatedTimes = (updateData: UpdateLessonDto, existingLesson: Lesson) => ({
  start: updateData.startTime
    ? truncateToMinute(new Date(updateData.startTime))
    : truncateToMinute(new Date(existingLesson.startTime)),
  end: updateData.endTime
    ? truncateToMinute(new Date(updateData.endTime))
    : truncateToMinute(new Date(existingLesson.endTime)),
});

export const computeUpdatedStatus = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson,
  start: Date,
  end: Date,
  now: Date
): UpdateLessonDto["status"] | undefined => {
  if (updateData.status === "CANCELLED") {
    return undefined;
  }
  if (end.getTime() <= now.getTime()) {
    return "COMPLETED";
  }
  if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
    return "IN_PROGRESS";
  }
  if (!updateData.status && existingLesson.status === "CANCELLED") {
    return "CANCELLED";
  }
  return undefined;
};

export const isTimeChanging = (updateData: UpdateLessonDto) =>
  !!(updateData.startTime || updateData.endTime);

export const shouldShiftRecurringSeries = (updateData: UpdateLessonDto, existingLesson: Lesson) =>
  existingLesson.isRecurring &&
  isTimeChanging(updateData) &&
  existingLesson.status === "SCHEDULED" &&
  updateData.status !== "RESCHEDULED";

export const shouldPropagateRecurringPrice = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson
) =>
  existingLesson.isRecurring &&
  Object.prototype.hasOwnProperty.call(updateData, "price") &&
  existingLesson.status === "SCHEDULED" &&
  updateData.status !== "RESCHEDULED";

export const buildLessonUpdateData = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson,
  isLinkingStudent: boolean,
  now: Date = truncateToMinute(new Date())
): PreparedLessonUpdate => {
  const { start, end } = resolveUpdatedTimes(updateData, existingLesson);
  const computedStatus = computeUpdatedStatus(updateData, existingLesson, start, end, now);

  return {
    start,
    end,
    dataToUpdate: {
      ...updateData,
      ...(updateData.startTime ? { startTime: start } : {}),
      ...(updateData.endTime ? { endTime: end } : {}),
      ...(computedStatus ? { status: computedStatus } : {}),
      ...(updateData.prospectName !== undefined
        ? { prospectName: updateData.prospectName.trim() }
        : {}),
      ...(isLinkingStudent
        ? { prospectName: null, prospectPhone: null, prospectContactMethod: null }
        : {}),
    },
  };
};
