import { createStore, createEvent, sample } from "effector";

import type { Lesson } from "@shared";
import { lessonDeleteDialogModel } from "@shared/ui";

import {
  $isRescheduleDialogOpen,
  $reschedulingLesson,
  $deleteDialogOpen,
  $selectedLesson,
} from "./lessons-delete-dialog.model";
import { $isDialogOpen, $editingLesson } from "./lessons-edit-dialog.model";
import type { ConfirmDialogState } from "../ui/LessonViewDialog/LessonViewDialog.types";

// Events
export const viewDialogOpened = createEvent<Lesson>();
export const viewDialogClosed = createEvent();
export const editFromViewRequested = createEvent();
export const cancelFromViewRequested = createEvent();
export const restoreFromViewRequested = createEvent();
export const rescheduleFromViewRequested = createEvent();
export const deleteFromViewRequested = createEvent();
export const confirmDialogOpened = createEvent<ConfirmDialogState>();
export const confirmDialogClosed = createEvent();
export const openCancelConfirmForLesson = createEvent<Lesson>();
export const openRestoreConfirmForLesson = createEvent<Lesson>();
export const openDeleteConfirmForLesson = createEvent<Lesson>();

// Stores
export const $isViewDialogOpen = createStore<boolean>(false);
export const $viewingLesson = createStore<Lesson | undefined>(undefined, { skipVoid: false });
export const $confirmDialog = createStore<ConfirmDialogState>({
  open: false,
  title: "",
  message: "",
  action: () => undefined,
});

// Logic - View Dialog
sample({
  clock: viewDialogOpened,
  fn: () => true,
  target: $isViewDialogOpen,
});

sample({
  clock: viewDialogOpened,
  target: $viewingLesson,
});

sample({
  clock: viewDialogClosed,
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: viewDialogClosed,
  fn: () => undefined,
  target: $viewingLesson,
});

// Logic - View Dialog Actions -> Edit Dialog
sample({
  clock: editFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: editFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  target: $editingLesson,
});

sample({
  clock: editFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => true,
  target: $isDialogOpen,
});

// Logic - View Dialog Actions -> Close
sample({
  clock: cancelFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: restoreFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => false,
  target: $isViewDialogOpen,
});

// Logic - View Dialog Actions -> Reschedule Dialog
sample({
  clock: rescheduleFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: rescheduleFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => true,
  target: $isRescheduleDialogOpen,
});

sample({
  clock: rescheduleFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  target: $reschedulingLesson,
});

// Logic - View Dialog Actions -> Delete Dialog
sample({
  clock: deleteFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => false,
  target: $isViewDialogOpen,
});

sample({
  clock: deleteFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: () => true,
  target: $deleteDialogOpen,
});

// Logic - Confirm Dialog
sample({
  clock: confirmDialogOpened,
  target: $confirmDialog,
});

sample({
  clock: confirmDialogClosed,
  fn: () => ({
    open: false,
    title: "",
    message: "",
    action: () => undefined,
  }),
  target: $confirmDialog,
});

sample({
  clock: openCancelConfirmForLesson,
  fn: (): ConfirmDialogState => ({
    open: true,
    title: "Отменить урок",
    message: "Вы уверены, что хотите отменить этот урок?",
    action: () => cancelFromViewRequested(),
    severity: "warning",
  }),
  target: confirmDialogOpened,
});

sample({
  clock: openRestoreConfirmForLesson,
  fn: (): ConfirmDialogState => ({
    open: true,
    title: "Восстановить урок",
    message: "Вы уверены, что хотите восстановить этот урок?",
    action: () => restoreFromViewRequested(),
    severity: "info",
  }),
  target: confirmDialogOpened,
});

sample({
  clock: openDeleteConfirmForLesson,
  fn: (lesson): ConfirmDialogState => ({
    open: true,
    title: "Удалить урок",
    message: "Вы уверены, что хотите удалить этот урок? Это действие нельзя отменить.",
    action: () => lessonDeleteDialogModel.lessonDeleteDialogOpened(lesson),
    severity: "error",
  }),
  target: confirmDialogOpened,
});

sample({
  clock: deleteFromViewRequested,
  source: $viewingLesson,
  filter: Boolean,
  fn: (lesson) => lesson || null,
  target: $selectedLesson,
});
