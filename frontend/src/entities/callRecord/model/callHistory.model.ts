import { createEffect, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { getCallHistory } from "../api/callHistoryApi";
import type { CallHistoryRecord } from "../callRecord.types";

export const CallHistoryGate = createGate();

export const loadCallHistoryFx = createEffect(
  async (): Promise<CallHistoryRecord[]> => getCallHistory()
);

export const $callHistory = createStore<CallHistoryRecord[]>([]);
export const $isCallHistoryLoading = loadCallHistoryFx.pending;

sample({ clock: CallHistoryGate.open, target: loadCallHistoryFx });
sample({ clock: loadCallHistoryFx.doneData, target: $callHistory });
