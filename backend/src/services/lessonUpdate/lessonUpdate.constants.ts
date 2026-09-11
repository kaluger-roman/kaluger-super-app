// Bounded retry on P2034 (serialization failure) for the Serializable
// lesson-update transaction; see `runLessonUpdateTransaction`.
export const MAX_TX_RETRIES = 3;
