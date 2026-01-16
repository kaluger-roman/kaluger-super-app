import type { ArchiveReason } from "@shared";

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  COMPLETED_STUDIES: "Закончил обучение",
  FOUND_ANOTHER_TUTOR: "Нашел другого преподавателя",
  CHANGED_MIND: "Передумал заниматься предметом",
  POOR_EFFORT: "Плохо старался на занятиях",
  MISSED_LESSONS: "Пропускал занятия",
};

export const ARCHIVE_REASON_OPTIONS: Array<{ value: ArchiveReason; label: string }> = [
  { value: "COMPLETED_STUDIES", label: "Закончил обучение" },
  { value: "FOUND_ANOTHER_TUTOR", label: "Нашел другого преподавателя" },
  { value: "CHANGED_MIND", label: "Передумал заниматься предметом" },
  { value: "POOR_EFFORT", label: "Плохо старался на занятиях" },
  { value: "MISSED_LESSONS", label: "Пропускал занятия" },
];
