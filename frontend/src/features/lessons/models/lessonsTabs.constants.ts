export const TAB_LABELS = ["Запланированные", "Прошедшие", "Отмененные", "Все"] as const;

export const BASE_TAB_LABELS = TAB_LABELS.filter((label) => label !== "Все");

export const UPCOMING_TAB_INDEX = TAB_LABELS.indexOf("Запланированные");
export const COMPLETED_TAB_INDEX = TAB_LABELS.indexOf("Прошедшие");
export const CANCELLED_TAB_INDEX = TAB_LABELS.indexOf("Отмененные");
export const ALL_TAB_INDEX = TAB_LABELS.indexOf("Все");
