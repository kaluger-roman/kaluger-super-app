import type { CallHistoryStatus } from "@entities";

import type { ChipColor } from "./CallHistoryList.types";

export const STATUS_CHIP_COLOR: Record<CallHistoryStatus, ChipColor> = {
  completed: "success",
  missed: "warning",
  rejected: "error",
  canceled: "default",
  failed: "error",
};
