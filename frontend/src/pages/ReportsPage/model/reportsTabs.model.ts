import { createEvent, createStore, sample } from "effector";

import { userModel } from "@entities";

import type { ReportsTab } from "./reportsTabs.types";

// Not reset by ReportsPageGate: the tab survives leaving the page, but not a reload
// or a logout.
export const $activeTab = createStore<ReportsTab>("summary");

export const tabChanged = createEvent<ReportsTab>();

sample({ clock: tabChanged, target: $activeTab });

sample({
  clock: [userModel.logoutUser, userModel.tutorSessionCleared],
  fn: (): ReportsTab => "summary",
  target: $activeTab,
});
