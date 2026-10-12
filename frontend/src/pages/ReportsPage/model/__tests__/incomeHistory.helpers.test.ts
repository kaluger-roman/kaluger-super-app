import { describe, it, expect } from "vitest";

import { PERIOD, makeHistory } from "./incomeHistory.fixtures";
import {
  appendIncomeHistoryPage,
  buildNextPageParams,
  buildReloadRequest,
  getLastLoadedDayKey,
  isNextPageReady,
  isNotFoundError,
  isReloadReady,
} from "../incomeHistory.helpers";

const first = makeHistory(["2026-09-25", "2026-09-20"], {
  nextCursor: "2026-09-20",
  remainingCount: 1,
});
const next = makeHistory(["2026-09-12"]);

const readySource = {
  history: first,
  range: PERIOD,
  version: 3,
  isNextPageLoading: false,
  isFirstPageLoading: false,
};

describe("appendIncomeHistoryPage", () => {
  it("should append the days, take the page and keep the summary", () => {
    const result = appendIncomeHistoryPage(first, next);

    expect(result.days.map((day) => day.date)).toEqual(["2026-09-25", "2026-09-20", "2026-09-12"]);
    expect(result.page).toEqual(next.page);
    expect(result.summary).toBe(first.summary);
  });

  it("should keep the already loaded day objects", () => {
    const result = appendIncomeHistoryPage(first, next);

    expect(result.days[0]).toBe(first.days[0]);
    expect(result.days[1]).toBe(first.days[1]);
  });

  it("should take the page as is when nothing is loaded", () => {
    expect(appendIncomeHistoryPage(null, next)).toBe(next);
  });
});

describe("getLastLoadedDayKey", () => {
  it("should return null without a loaded history", () => {
    expect(getLastLoadedDayKey(null)).toBeNull();
    expect(getLastLoadedDayKey(makeHistory([]))).toBeNull();
  });

  it("should return the key of the last loaded day", () => {
    expect(getLastLoadedDayKey(first)).toBe("2026-09-20");
  });
});

describe("isNextPageReady", () => {
  it("should allow a request when more days exist and nothing is loading", () => {
    expect(isNextPageReady(readySource)).toBe(true);
  });

  it.each([
    ["a page is loading", { isNextPageLoading: true }],
    ["the first page is loading", { isFirstPageLoading: true }],
    ["no period was applied", { range: null }],
    ["no history is loaded", { history: null }],
    ["everything is loaded", { history: next }],
  ])("should block the request when %s", (_, override) => {
    expect(isNextPageReady({ ...readySource, ...override })).toBe(false);
  });
});

describe("buildNextPageParams", () => {
  it("should continue before the cursor in the applied period", () => {
    expect(
      buildNextPageParams({
        ...readySource,
        history: { ...first, page: { nextCursor: "2026-09-20", remainingCount: 1 } },
      })
    ).toEqual({ ...PERIOD, before: "2026-09-20", version: 3 });
  });
});

describe("isReloadReady", () => {
  it("should require an applied period", () => {
    expect(isReloadReady({ history: first, historyRange: PERIOD, range: PERIOD })).toBe(true);
    expect(isReloadReady({ history: first, historyRange: PERIOD, range: null })).toBe(false);
  });
});

describe("buildReloadRequest", () => {
  it("should reload down to the last loaded day", () => {
    expect(buildReloadRequest({ history: first, historyRange: PERIOD, range: PERIOD })).toEqual({
      ...PERIOD,
      through: "2026-09-20",
    });
  });

  it.each([
    ["of another period", { ...PERIOD, startDate: "2026-07-31T21:00:00.000Z" }],
    ["of no known period", null],
  ])("should request the first page for a history %s", (_, historyRange) => {
    expect(buildReloadRequest({ history: first, historyRange, range: PERIOD })).toEqual(PERIOD);
  });

  it.each([
    ["without a history", null],
    ["with an empty history", makeHistory([])],
  ])("should request the first page %s", (_, history) => {
    expect(buildReloadRequest({ history, historyRange: PERIOD, range: PERIOD })).toEqual(PERIOD);
  });
});

describe("isNotFoundError", () => {
  it.each([
    [{ response: { status: 404 } }, true],
    [{ response: { status: 500 } }, false],
    [new Error("Network Error"), false],
    [undefined, false],
  ])("should tell whether %o is a 404 answer", (error, expected) => {
    expect(isNotFoundError(error)).toBe(expected);
  });
});
