import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { notificationsModel } from "@shared";

import { getCallHistory } from "../api";
import { CALL_HISTORY_LOAD_ERROR_TEXT } from "../callRecord.constants";
import type { CallHistoryPrincipal, CallHistoryRecord } from "../callRecord.types";

export const CallHistoryGate = createGate<CallHistoryPrincipal>();

export const $callHistory = createStore<CallHistoryRecord[]>([]);
export const $loadFailed = createStore(false);

export const refreshRequested = createEvent();

export const loadCallHistoryFx = createEffect(
  async (principal: CallHistoryPrincipal): Promise<CallHistoryRecord[]> => getCallHistory(principal)
);

export const $isLoading = loadCallHistoryFx.pending;

sample({ clock: CallHistoryGate.open, target: loadCallHistoryFx });
sample({
  clock: refreshRequested,
  source: CallHistoryGate.state,
  filter: CallHistoryGate.status,
  target: loadCallHistoryFx,
});
// Reset on success only, so a retry keeps the error on screen instead of flashing the empty state.
sample({
  clock: [loadCallHistoryFx.done, CallHistoryGate.close],
  fn: () => false,
  target: $loadFailed,
});
sample({ clock: loadCallHistoryFx.fail, fn: () => true, target: $loadFailed });
sample({ clock: loadCallHistoryFx.doneData, target: $callHistory });
sample({
  clock: [CallHistoryGate.close, loadCallHistoryFx.fail],
  fn: (): CallHistoryRecord[] => [],
  target: $callHistory,
});
sample({
  clock: loadCallHistoryFx.fail,
  fn: () => CALL_HISTORY_LOAD_ERROR_TEXT,
  target: notificationsModel.showErrorEvent,
});
