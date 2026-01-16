import { createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";

import { studentModel } from "@entities";
import type { Student } from "@shared";

// Gates
export const StudentsPageGate = createGate();

// Events
export const dialogOpened = createEvent<Student | undefined>();
export const dialogClosed = createEvent();
export const viewDialogOpened = createEvent<Student>();
export const viewDialogClosed = createEvent();
export const deleteDialogOpened = createEvent<Student>();
export const deleteDialogClosed = createEvent();
export const deleteConfirmed = createEvent();
export const deleteFromViewConfirmed = createEvent();
export const menuOpened = createEvent<{
  anchorEl: HTMLElement;
  student: Student;
}>();
export const menuClosed = createEvent();
export const editFromMenuRequested = createEvent();
export const deleteFromMenuRequested = createEvent();
export const editFromViewRequested = createEvent();
export const deleteFromViewRequested = createEvent();
export const tabChanged = createEvent<number>();

// Stores (atomic)
export const $isDialogOpen = createStore<boolean>(false);
export const $isViewDialogOpen = createStore<boolean>(false);
export const $anchorEl = createStore<HTMLElement | null>(null);
export const $selectedStudent = createStore<Student | null>(null);
export const $deleteDialogStudent = createStore<Student | null>(null);
export const $editingStudent = createStore<Student | undefined>(undefined, { skipVoid: false });
export const $viewingStudent = createStore<Student | undefined>(undefined, { skipVoid: false });
export const $currentTab = createStore<number>(0);

// Logic
sample({
  clock: dialogOpened,
  fn: () => true,
  target: $isDialogOpen,
});

sample({
  clock: dialogOpened,
  target: $editingStudent,
});

sample({
  clock: [dialogClosed, studentModel.addStudentFx.doneData, studentModel.updateStudentFx.doneData],
  fn: () => false,
  target: $isDialogOpen,
});

sample({
  clock: dialogClosed,
  fn: () => undefined,
  target: $editingStudent,
});

sample({
  clock: viewDialogOpened,
  fn: () => true,
  target: $isViewDialogOpen,
});

sample({
  clock: viewDialogOpened,
  target: $viewingStudent,
});

sample({
  clock: [viewDialogClosed, deleteFromViewRequested],
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: viewDialogClosed,
  fn: () => undefined,
  target: $viewingStudent,
});

sample({
  clock: deleteDialogOpened,
  target: $deleteDialogStudent,
});

sample({
  clock: deleteDialogClosed,
  fn: () => null,
  target: $deleteDialogStudent,
});

sample({
  clock: menuOpened,
  fn: ({ anchorEl }) => anchorEl,
  target: $anchorEl,
});

sample({
  clock: menuOpened,
  fn: ({ student }) => student,
  target: $selectedStudent,
});

sample({
  clock: [editFromMenuRequested, editFromViewRequested],
  fn: () => true,
  target: $isDialogOpen,
});

sample({
  clock: deleteFromMenuRequested,
  source: $selectedStudent,
  filter: (student): student is Student => student !== null,
  target: $deleteDialogStudent,
});

sample({
  clock: editFromMenuRequested,
  source: $selectedStudent,
  filter: (student): student is Student => student !== null,
  fn: (student) => student as Student | undefined,
  target: $editingStudent,
});

sample({
  clock: [menuClosed, editFromMenuRequested, deleteFromMenuRequested],
  fn: () => null,
  target: [$anchorEl, $selectedStudent],
});

sample({
  clock: editFromViewRequested,
  source: $viewingStudent,
  filter: (student) => student !== undefined,
  target: $editingStudent,
});

sample({
  clock: editFromViewRequested,
  fn: () => undefined,
  target: $viewingStudent,
});

sample({
  clock: deleteConfirmed,
  source: $deleteDialogStudent,
  filter: (student): student is Student => student !== null,
  fn: (student: Student) => student.id,
  target: studentModel.removeStudent,
});

sample({
  clock: deleteConfirmed,
  fn: () => null,
  target: $deleteDialogStudent,
});

sample({
  clock: deleteFromViewConfirmed,
  source: $viewingStudent,
  filter: (student): student is Student => student !== undefined,
  fn: (student: Student) => student.id,
  target: studentModel.removeStudent,
});

sample({
  clock: deleteFromViewConfirmed,
  fn: () => undefined,
  target: $viewingStudent,
});

sample({
  clock: tabChanged,
  target: $currentTab,
});

sample({
  clock: tabChanged,
  fn: (tabIndex) => ({ archived: tabIndex === 1 }),
  target: studentModel.loadStudents,
});

sample({
  clock: StudentsPageGate.open,
  fn: () => ({ archived: false }),
  target: studentModel.loadStudents,
});

sample({
  clock: [studentModel.archiveStudentFx.doneData, studentModel.unarchiveStudentFx.doneData],
  fn: () => false,
  target: [$isViewDialogOpen, $isDialogOpen],
});
