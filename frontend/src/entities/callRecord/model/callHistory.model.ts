import { createEffect, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { getCallHistory } from "../api/callHistoryApi";
import type {
  CallHistoryPrincipal,
  CallHistoryRecord,
} from "../callRecord.types";

export const CallHistoryGate = createGate<CallHistoryPrincipal>();

export const loadCallHistoryFx = createEffect(
  async (principal: CallHistoryPrincipal): Promise<CallHistoryRecord[]> =>
    getCallHistory(principal)
);

export const $callHistory = createStore<CallHistoryRecord[]>([]);
export const $isCallHistoryLoading = loadCallHistoryFx.pending;

sample({ clock: CallHistoryGate.open, target: loadCallHistoryFx });
sample({ clock: loadCallHistoryFx.doneData, target: $callHistory });
