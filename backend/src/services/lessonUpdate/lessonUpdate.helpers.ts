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
  if (!updateData.status && existingLesson.status === "CANCELLED") {
    return "CANCELLED";
  }
  if (end.getTime() <= now.getTime()) {
    return "COMPLETED";
  }
  if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
    return "IN_PROGRESS";
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

export const resolveReceivedAmount = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson
): number | null | undefined => {
  const wasPaid = existingLesson.isPaid;
  const willPay = updateData.isPaid ?? wasPaid;

  if (wasPaid && !willPay) {
    return null;
  }
  if (!wasPaid && willPay) {
    return updateData.receivedAmount ?? updateData.price ?? existingLesson.price?.toNumber() ?? 0;
  }
  if (wasPaid && willPay && updateData.receivedAmount !== undefined) {
    return updateData.receivedAmount;
  }
  return undefined;
};

export const buildLessonUpdateData = (
  updateData: UpdateLessonDto,
  existingLesson: Lesson,
  isLinkingStudent: boolean,
  now: Date = truncateToMinute(new Date())
): PreparedLessonUpdate => {
  const { start, end } = resolveUpdatedTimes(updateData, existingLesson);
  const computedStatus = computeUpdatedStatus(updateData, existingLesson, start, end, now);
  const receivedAmount = resolveReceivedAmount(updateData, existingLesson);
  const { receivedAmount: _rawReceivedAmount, ...fields } = updateData;

  return {
    start,
    end,
    dataToUpdate: {
      ...fields,
      ...(receivedAmount !== undefined ? { receivedAmount } : {}),
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
