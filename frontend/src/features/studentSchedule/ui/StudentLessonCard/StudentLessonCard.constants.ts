import type { StudentVisibleLesson } from "@shared";

export const statusChipColor: Record<
  StudentVisibleLesson["status"],
  "default" | "primary" | "success" | "error" | "warning" | "info"
> = {
  SCHEDULED: "primary",
  COMPLETED: "success",
  CANCELLED: "error",
  RESCHEDULED: "warning",
  IN_PROGRESS: "info",
};
