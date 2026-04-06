import { createStore, createEvent, sample } from "effector";

import * as filtersModel from "./lessons-filters.model";
import {
  ALL_TAB_INDEX,
  BASE_TAB_LABELS,
  CANCELLED_TAB_INDEX,
  COMPLETED_TAB_INDEX,
  TAB_LABELS,
  UPCOMING_TAB_INDEX,
} from "./lessons-tabs.constants";

export {
  ALL_TAB_INDEX,
  BASE_TAB_LABELS,
  CANCELLED_TAB_INDEX,
  COMPLETED_TAB_INDEX,
  TAB_LABELS,
  UPCOMING_TAB_INDEX,
};

// Events
export const tabChanged = createEvent<number>();

// Stores
export const $currentTab = createStore<number>(0);

// Logic
sample({
  clock: tabChanged,
  target: $currentTab,
});

// Auto-select "Все" tab when payment filter becomes active (any of the dates changes to non-null)
sample({
  clock: [filtersModel.$paymentDateFrom, filtersModel.$paymentDateTo],
  source: {
    from: filtersModel.$paymentDateFrom,
    to: filtersModel.$paymentDateTo,
  },
  filter: ({ from, to }) => from !== null || to !== null,
  fn: () => ALL_TAB_INDEX,
  target: $currentTab,
});

// Reset to "Запланированные" when filter is cleared while "Все" was selected
sample({
  clock: [filtersModel.$paymentDateFrom, filtersModel.$paymentDateTo],
  source: {
    currentTab: $currentTab,
    from: filtersModel.$paymentDateFrom,
    to: filtersModel.$paymentDateTo,
  },
  filter: ({ currentTab, from, to }) =>
    from === null && to === null && currentTab === ALL_TAB_INDEX,
  fn: () => 0,
  target: $currentTab,
});
