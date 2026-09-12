import { createStore, createEvent, sample } from "effector";

import { studentModel } from "@entities";
import type { Student, ArchiveReason } from "@shared";

// Events
export const archiveRequested = createEvent<Student>();
export const unarchiveRequested = createEvent<Student>();
export const archiveDialogClosed = createEvent();
export const unarchiveDialogClosed = createEvent();
export const archiveConfirmed = createEvent<{
  archiveReason?: ArchiveReason;
  archiveComment?: string;
}>();
export const unarchiveConfirmed = createEvent();
export const archiveReasonChanged = createEvent<ArchiveReason | "">();
export const archiveCommentChanged = createEvent<string>();

// Stores
export const $archiveDialogStudent = createStore<Student | null>(null);
export const $unarchiveDialogStudent = createStore<Student | null>(null);
export const $archiveReason = createStore<ArchiveReason | "">("");
export const $archiveComment = createStore<string>("");

// Logic
sample({
  clock: archiveRequested,
  target: $archiveDialogStudent,
});

sample({
  clock: archiveDialogClosed,
  fn: () => null,
  target: $archiveDialogStudent,
});

sample({
  clock: archiveDialogClosed,
  fn: () => "",
  target: [$archiveReason, $archiveComment],
});

sample({
  clock: unarchiveRequested,
  target: $unarchiveDialogStudent,
});

sample({
  clock: unarchiveDialogClosed,
  fn: () => null,
  target: $unarchiveDialogStudent,
});

sample({
  clock: archiveReasonChanged,
  target: $archiveReason,
});

sample({
  clock: archiveCommentChanged,
  target: $archiveComment,
});

sample({
  clock: archiveConfirmed,
  source: $archiveDialogStudent,
  filter: (student): student is Student => student !== null,
  fn: (student: Student, params) => ({
    id: student.id,
    archiveReason: params.archiveReason || undefined,
    archiveComment: params.archiveComment || undefined,
  }),
  target: studentModel.archiveStudent,
});

sample({
  clock: archiveConfirmed,
  target: archiveDialogClosed,
});

sample({
  clock: unarchiveConfirmed,
  source: $unarchiveDialogStudent,
  filter: (student): student is Student => student !== null,
  fn: (student: Student) => student.id,
  target: studentModel.unarchiveStudent,
});

sample({
  clock: unarchiveConfirmed,
  target: unarchiveDialogClosed,
});
