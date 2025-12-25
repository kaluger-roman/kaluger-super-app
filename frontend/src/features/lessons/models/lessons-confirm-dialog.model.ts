import { createStore, createEvent, sample } from "effector";

// Types
export type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
  severity?: "warning" | "info" | "error";
};

// Events
export const confirmDialogOpened = createEvent<ConfirmDialogState>();
export const confirmDialogClosed = createEvent();

// Stores
export const $confirmDialog = createStore<ConfirmDialogState>({
  open: false,
  title: "",
  message: "",
  action: () => {
    // Default empty action
  },
});

// Logic
sample({
  clock: confirmDialogOpened,
  target: $confirmDialog,
});

sample({
  clock: confirmDialogClosed,
  source: $confirmDialog,
  fn: (state) => ({ ...state, open: false }),
  target: $confirmDialog,
});
