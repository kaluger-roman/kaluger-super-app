import { createStore, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { screenApi } from "@shared";

export const ScreenGate = createGate();

export const $screenToken = createStore<string | null>(null);
export const $uploadUrl = createStore<string | null>(null);
export const $screenImage = createStore<string | null>(null);
export const $lastUpdated = createStore<string | null>(null);
export const $hasImage = createStore(false);

const $isActive = createStore(false);

const delayFx = createEffect(
  () => new Promise<void>((resolve) => setTimeout(resolve, 2000))
);

sample({ clock: ScreenGate.open, fn: () => true, target: $isActive });
sample({ clock: ScreenGate.close, fn: () => false, target: $isActive });

sample({ clock: ScreenGate.open, target: [screenApi.getTokenFx, screenApi.getLatestFx] });

sample({ clock: screenApi.getLatestFx.finally, source: $isActive, filter: Boolean, target: delayFx });
sample({ clock: delayFx.done, source: $isActive, filter: Boolean, target: screenApi.getLatestFx });

sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.token, target: $screenToken });
sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.uploadUrl, target: $uploadUrl });

sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.image, target: $screenImage });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.updatedAt, target: $lastUpdated });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.hasImage, target: $hasImage });
