export type ConfirmDialogSeverity = "warning" | "info" | "error";

export type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
  severity?: ConfirmDialogSeverity;
};
