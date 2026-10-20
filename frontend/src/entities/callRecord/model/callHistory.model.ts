import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { notificationsModel } from "@shared";

import { getCallHistory } from "../api";
import { CALL_HISTORY_LOAD_ERROR_TEXT } from "../callRecord.constants";
import type { CallHistoryPrincipal, CallHistoryRecord } from "../callRecord.types";

export const CallHistoryGate = createGate<CallHistoryPrincipal>();

export const $callHistory = createStore<CallHistoryRecord[]>([]);
export const $loadFailed = createStore(false);
const $refreshQueued = createStore(false);

export const retryRequested = createEvent();
export const refreshRequested = createEvent();
const queuedRefreshStarted = createEvent();

// Page load and retry: blocking, a failure clears the list and shows the error.
export const loadCallHistoryFx = createEffect(
  async (principal: CallHistoryPrincipal): Promise<CallHistoryRecord[]> => getCallHistory(principal)
);

// Background refresh after a call: not blocking, a failure keeps what is shown.
export const refreshCallHistoryFx = createEffect(
  async (principal: CallHistoryPrincipal): Promise<CallHistoryRecord[]> => getCallHistory(principal)
);

export const $isLoading = loadCallHistoryFx.pending;
const $isFetching = combine(
  loadCallHistoryFx.pending,
  refreshCallHistoryFx.pending,
  (loading, refreshing) => loading || refreshing
);
const $gate = combine({ open: CallHistoryGate.status, principal: CallHistoryGate.state });

sample({ clock: CallHistoryGate.open, target: loadCallHistoryFx });
sample({
  clock: retryRequested,
  source: CallHistoryGate.state,
  filter: CallHistoryGate.status,
  target: loadCallHistoryFx,
});
// One request at a time, so an older response never overwrites a newer one.
sample({
  clock: refreshRequested,
  source: CallHistoryGate.state,
  filter: combine(CallHistoryGate.status, $isFetching, (open, fetching) => open && !fetching),
  target: refreshCallHistoryFx,
});
sample({
  clock: refreshRequested,
  filter: combine(CallHistoryGate.status, $isFetching, (open, fetching) => open && fetching),
  fn: () => true,
  target: $refreshQueued,
});
sample({
  clock: [loadCallHistoryFx.finally, refreshCallHistoryFx.finally],
  filter: $refreshQueued,
  target: queuedRefreshStarted,
});
sample({ clock: queuedRefreshStarted, fn: () => false, target: $refreshQueued });
sample({
  clock: queuedRefreshStarted,
  source: CallHistoryGate.state,
  filter: CallHistoryGate.status,
  target: refreshCallHistoryFx,
});

// A response that outlives its page (or its account) is dropped.
const historyReceived = sample({
  clock: [loadCallHistoryFx.done, refreshCallHistoryFx.done],
  source: $gate,
  filter: ({ open, principal }, { params }) => open && principal === params,
  fn: (_, { result }) => result,
});
const loadFailed = sample({
  clock: loadCallHistoryFx.fail,
  source: $gate,
  filter: ({ open, principal }, { params }) => open && principal === params,
});

sample({ clock: historyReceived, target: $callHistory });
// Reset on success only, so a retry keeps the error on screen instead of flashing the empty state.
sample({
  clock: [historyReceived, CallHistoryGate.close],
  fn: () => false,
  target: $loadFailed,
});
sample({ clock: CallHistoryGate.close, fn: () => false, target: $refreshQueued });
sample({ clock: loadFailed, fn: () => true, target: $loadFailed });
sample({
  clock: [CallHistoryGate.close, loadFailed],
  fn: (): CallHistoryRecord[] => [],
  target: $callHistory,
});
sample({
  clock: loadFailed,
  fn: () => CALL_HISTORY_LOAD_ERROR_TEXT,
  target: notificationsModel.showErrorEvent,
});
