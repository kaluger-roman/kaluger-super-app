import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { getLessonCalls } from "../api";
import type { CallHistoryRecord, LessonCallsRequest } from "../callRecord.types";

export const LessonCallsGate = createGate<string>();

export const $lessonCalls = createStore<CallHistoryRecord[]>([]);
// Every request gets the next version. A response is applied only when it is newer than the
// last one applied, so an older answer never overwrites a newer one; opening another lesson or
// closing the dialog moves the floor up so nothing still in flight lands in the next lesson.
const $requestedVersion = createStore(0);
const $appliedVersion = createStore(0);
const $requestedLessonId = createStore<string | null>(null);

export const refreshRequested = createEvent();
const loadStarted = createEvent<string>();
const refreshStarted = createEvent<string>();

export const loadLessonCallsFx = createEffect(
  async ({ lessonId }: LessonCallsRequest): Promise<CallHistoryRecord[]> => getLessonCalls(lessonId)
);

// Background refresh after a call: not blocking, a failure keeps what is shown.
export const refreshLessonCallsFx = createEffect(
  async ({ lessonId }: LessonCallsRequest): Promise<CallHistoryRecord[]> => getLessonCalls(lessonId)
);

// The gate state changes on open and when the dialog switches to another lesson without
// unmounting. Closing resets it to `{}` despite the `string` type: effector-react falls back to
// `{}` for any falsy defaultState, so there is no typed "no lesson" value to reset to.
sample({
  clock: LessonCallsGate.state.updates,
  source: $requestedLessonId,
  filter: (requested, lessonId) => typeof lessonId === "string" && lessonId !== requested,
  fn: (_, lessonId) => lessonId,
  target: loadStarted,
});
sample({ clock: loadStarted, target: $requestedLessonId });
sample({
  clock: refreshRequested,
  source: $requestedLessonId,
  filter: (lessonId): lessonId is string => lessonId !== null,
  target: refreshStarted,
});

const versionedLoad = sample({
  clock: loadStarted,
  source: $requestedVersion,
  fn: (version, lessonId): LessonCallsRequest => ({ lessonId, version: version + 1 }),
});
const versionedRefresh = sample({
  clock: refreshStarted,
  source: $requestedVersion,
  fn: (version, lessonId): LessonCallsRequest => ({ lessonId, version: version + 1 }),
});
sample({
  clock: [versionedLoad, versionedRefresh],
  fn: ({ version }) => version,
  target: $requestedVersion,
});
sample({ clock: versionedLoad, fn: ({ version }) => version - 1, target: $appliedVersion });
sample({ clock: versionedLoad, target: loadLessonCallsFx });
sample({ clock: versionedRefresh, target: refreshLessonCallsFx });
sample({ clock: LessonCallsGate.close, source: $requestedVersion, target: $appliedVersion });
sample({ clock: LessonCallsGate.close, fn: () => null, target: $requestedLessonId });

const callsReceived = sample({
  clock: [loadLessonCallsFx.done, refreshLessonCallsFx.done],
  source: $appliedVersion,
  filter: (applied, { params }) => params.version > applied,
  fn: (_, done) => done,
});
const loadFailed = sample({
  clock: loadLessonCallsFx.fail,
  source: $appliedVersion,
  filter: (applied, { params }) => params.version > applied,
  fn: (_, failed) => failed,
});

sample({
  clock: [callsReceived, loadFailed],
  fn: ({ params }) => params.version,
  target: $appliedVersion,
});
sample({ clock: callsReceived, fn: ({ result }) => result, target: $lessonCalls });
sample({
  clock: [loadStarted, loadFailed, LessonCallsGate.close],
  fn: (): CallHistoryRecord[] => [],
  target: $lessonCalls,
});
