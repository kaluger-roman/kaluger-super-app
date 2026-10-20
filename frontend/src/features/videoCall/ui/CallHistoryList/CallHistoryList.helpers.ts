import type { CallHistoryStatus } from "@entities";

import { STATUS_CHIP_COLOR } from "./CallHistoryList.constants";
import type { ChipColor } from "./CallHistoryList.types";

export const getStatusChipColor = (status: CallHistoryStatus): ChipColor =>
  STATUS_CHIP_COLOR[status];
