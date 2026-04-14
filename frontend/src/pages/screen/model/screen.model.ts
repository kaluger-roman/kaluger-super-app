import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { screenApi } from "@shared";

export const ScreenGate = createGate();

export const $screenToken = createStore<string | null>(null);
export const $uploadUrl = createStore<string | null>(null);
export const $screenImage = createStore<string | null>(null);
export const $lastUpdated = createStore<string | null>(null);
export const $hasImage = createStore(false);

const $intervalId = createStore<ReturnType<typeof setInterval> | null>(null);
const tick = createEvent();

const startPollingFx = createEffect(() => {
  return setInterval(() => tick(), 5000);
});

const stopPollingFx = createEffect((id: ReturnType<typeof setInterval>) => {
  clearInterval(id);
});

sample({ clock: ScreenGate.open, target: [screenApi.getTokenFx, screenApi.getLatestFx, startPollingFx] });
sample({ clock: tick, target: screenApi.getLatestFx });

sample({ clock: startPollingFx.doneData, target: $intervalId });
sample({ clock: ScreenGate.close, source: $intervalId, filter: Boolean, target: stopPollingFx });
sample({ clock: stopPollingFx.done, fn: () => null, target: $intervalId });

sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.token, target: $screenToken });
sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.uploadUrl, target: $uploadUrl });

sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.image, target: $screenImage });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.updatedAt, target: $lastUpdated });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.hasImage, target: $hasImage });
