import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { notificationsModel } from "@shared";

import { getCallHistory } from "../api";
import { CALL_HISTORY_LOAD_ERROR_TEXT } from "../callRecord.constants";
import type {
  CallHistoryPrincipal,
  CallHistoryRecord,
  CallHistoryRequest,
} from "../callRecord.types";

export const CallHistoryGate = createGate<CallHistoryPrincipal>();

export const $callHistory = createStore<CallHistoryRecord[]>([]);
export const $loadFailed = createStore(false);
// Every request gets the next version. A response is applied only when it is newer than the
// last one applied, so an older answer never overwrites a newer one; closing the page moves
// the floor up so nothing still in flight lands on the next visit.
const $requestedVersion = createStore(0);
const $appliedVersion = createStore(0);

export const retryRequested = createEvent();
export const refreshRequested = createEvent();
const loadStarted = createEvent<CallHistoryPrincipal>();
const refreshStarted = createEvent<CallHistoryPrincipal>();

// Page load and retry: blocking, a failure clears the list and shows the error.
export const loadCallHistoryFx = createEffect(
  async ({ principal }: CallHistoryRequest): Promise<CallHistoryRecord[]> =>
    getCallHistory(principal)
);

// Background refresh after a call: not blocking, a failure keeps what is shown.
export const refreshCallHistoryFx = createEffect(
  async ({ principal }: CallHistoryRequest): Promise<CallHistoryRecord[]> =>
    getCallHistory(principal)
);

export const $isLoading = loadCallHistoryFx.pending;

sample({ clock: CallHistoryGate.open, target: loadStarted });
sample({
  clock: retryRequested,
  source: CallHistoryGate.state,
  filter: CallHistoryGate.status,
  target: loadStarted,
});
sample({
  clock: refreshRequested,
  source: CallHistoryGate.state,
  filter: CallHistoryGate.status,
  target: refreshStarted,
});

const versionedLoad = sample({
  clock: loadStarted,
  source: $requestedVersion,
  fn: (version, principal): CallHistoryRequest => ({ principal, version: version + 1 }),
});
const versionedRefresh = sample({
  clock: refreshStarted,
  source: $requestedVersion,
  fn: (version, principal): CallHistoryRequest => ({ principal, version: version + 1 }),
});
sample({
  clock: [versionedLoad, versionedRefresh],
  fn: ({ version }) => version,
  target: $requestedVersion,
});
sample({ clock: versionedLoad, target: loadCallHistoryFx });
sample({ clock: versionedRefresh, target: refreshCallHistoryFx });
sample({ clock: CallHistoryGate.close, source: $requestedVersion, target: $appliedVersion });

const historyReceived = sample({
  clock: [loadCallHistoryFx.done, refreshCallHistoryFx.done],
  source: $appliedVersion,
  filter: (applied, { params }) => params.version > applied,
  fn: (_, done) => done,
});
const loadFailed = sample({
  clock: loadCallHistoryFx.fail,
  source: $appliedVersion,
  filter: (applied, { params }) => params.version > applied,
  fn: (_, failed) => failed,
});

sample({
  clock: [historyReceived, loadFailed],
  fn: ({ params }) => params.version,
  target: $appliedVersion,
});
sample({ clock: historyReceived, fn: ({ result }) => result, target: $callHistory });
// Reset on success only, so a retry keeps the error on screen instead of flashing the empty state.
sample({
  clock: [historyReceived, CallHistoryGate.close],
  fn: () => false,
  target: $loadFailed,
});
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
