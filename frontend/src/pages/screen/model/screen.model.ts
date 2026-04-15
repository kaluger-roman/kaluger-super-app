import { createStore, sample } from "effector";
import { createGate } from "effector-react";

import { handleScreenUpdated } from "@app/model/web-socket.model";
import { screenApi } from "@shared";

export const ScreenGate = createGate();

export const $screenToken = createStore<string | null>(null);
export const $uploadUrl = createStore<string | null>(null);
export const $screenImage = createStore<string | null>(null);
export const $lastUpdated = createStore<string | null>(null);
export const $hasImage = createStore(false);

const $isActive = createStore(false);

sample({ clock: ScreenGate.open, fn: () => true, target: $isActive });
sample({ clock: ScreenGate.close, fn: () => false, target: $isActive });

sample({ clock: ScreenGate.open, target: [screenApi.getTokenFx, screenApi.getLatestFx] });

// WS: картинка приходит сразу в событии
sample({ clock: handleScreenUpdated, source: $isActive, filter: Boolean, fn: (_, data) => data.image, target: $screenImage });
sample({ clock: handleScreenUpdated, source: $isActive, filter: Boolean, fn: (_, data) => data.updatedAt, target: $lastUpdated });
sample({ clock: handleScreenUpdated, source: $isActive, filter: Boolean, fn: () => true, target: $hasImage });

sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.token, target: $screenToken });
sample({ clock: screenApi.getTokenFx.doneData, fn: (data) => data.uploadUrl, target: $uploadUrl });

// HTTP fallback для начальной загрузки
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.image, target: $screenImage });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.updatedAt, target: $lastUpdated });
sample({ clock: screenApi.getLatestFx.doneData, fn: (data) => data.hasImage, target: $hasImage });
