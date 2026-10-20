export const DEFAULT_HISTORY_LIMIT = 50;
export const MAX_HISTORY_LIMIT = 100;

export const CALL_RECORD_WITH_PEER = {
  include: { student: { select: { name: true } }, tutor: { select: { name: true } } },
} as const;
