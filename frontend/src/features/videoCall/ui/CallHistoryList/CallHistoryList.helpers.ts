import type { CallHistoryDirection, CallHistoryStatus } from "@entities";

import { STATUS_CHIP_COLOR } from "./CallHistoryList.constants";
import type { ChipColor } from "./CallHistoryList.types";

// A call the caller made and nobody answered is no warning for the caller.
export const getStatusChipColor = (
  status: CallHistoryStatus,
  direction: CallHistoryDirection
): ChipColor =>
  status === "MISSED" && direction === "outgoing" ? "default" : STATUS_CHIP_COLOR[status];
