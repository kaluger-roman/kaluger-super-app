import { SUBJECT_LABELS } from "../domain.constants";
import type { Subject } from "../types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isSubject = (value: unknown): value is Subject =>
  typeof value === "string" && Object.keys(SUBJECT_LABELS).includes(value);
