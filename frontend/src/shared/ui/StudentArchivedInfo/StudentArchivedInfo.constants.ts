import type { ArchiveReason } from "../../types";

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  COMPLETED_STUDIES: "Закончил обучение",
  FOUND_ANOTHER_TUTOR: "Нашел другого преподавателя",
  CHANGED_MIND: "Передумал заниматься предметом",
  POOR_EFFORT: "Плохо старался на занятиях",
  MISSED_LESSONS: "Пропускал занятия",
};
