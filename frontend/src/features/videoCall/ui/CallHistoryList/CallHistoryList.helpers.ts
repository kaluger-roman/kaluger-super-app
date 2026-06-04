import type { CallStatus } from "../../videoCall.types";

type ChipColor = "success" | "warning" | "error" | "default";

const STATUS_CHIP_COLOR: Record<CallStatus, ChipColor> = {
  completed: "success",
  missed: "warning",
  rejected: "error",
  canceled: "default",
  failed: "error",
};

export const getStatusChipColor = (status: CallStatus): ChipColor =>
  STATUS_CHIP_COLOR[status];
