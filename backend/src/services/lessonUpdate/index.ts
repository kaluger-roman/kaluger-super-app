export {
  applyLessonUpdate,
  notifyLessonUpdated,
  syncAfterLessonUpdate,
} from "./lessonUpdate";
export {
  buildLessonUpdateData,
  computeUpdatedStatus,
  isTimeChanging,
  resolveUpdatedTimes,
  shouldPropagateRecurringPrice,
  shouldShiftRecurringSeries,
} from "./lessonUpdate.helpers";
export type {
  ApplyLessonUpdateParams,
  LessonUpdateData,
  LessonUpdateResult,
  PreparedLessonUpdate,
  UpdatedLesson,
} from "./lessonUpdate.types";
