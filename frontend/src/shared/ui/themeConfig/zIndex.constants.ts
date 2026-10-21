// Layers above theme.zIndex.modal, in stacking order: a call is never covered by the app's
// blocking spinner. Snackbars (theme.zIndex.snackbar) stay above both.
export const ABOVE_MODAL_Z_OFFSET = {
  blockingOverlay: 1,
  call: 2,
} as const;
