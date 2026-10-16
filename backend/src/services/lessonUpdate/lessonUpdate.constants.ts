// Bounded retry on P2034 (write conflict / deadlock) for the lesson-update
// transaction; see `applyLessonUpdate`.
export const MAX_TX_RETRIES = 3;

// First key of the two-key `pg_advisory_xact_lock(namespace, hashtext(tutorId))`;
// two-key locks never collide with the single-key locks used elsewhere.
export const LESSON_UPDATE_LOCK_NAMESPACE = 1001;
