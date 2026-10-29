export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 100;

export const CALL_LESSON_SELECT = {
  id: true,
  subject: true,
  startTime: true,
  endTime: true,
} as const;

export const CALL_RECORD_WITH_PEER = {
  include: {
    student: { select: { name: true } },
    tutor: { select: { name: true } },
    lesson: { select: CALL_LESSON_SELECT },
  },
} as const;
