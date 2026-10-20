import type { CallHistoryStatus } from "@entities";

import type { ChipColor } from "./CallHistoryList.types";

export const STATUS_CHIP_COLOR: Record<CallHistoryStatus, ChipColor> = {
  COMPLETED: "success",
  MISSED: "warning",
  REJECTED: "error",
  CANCELED: "default",
  FAILED: "error",
};
