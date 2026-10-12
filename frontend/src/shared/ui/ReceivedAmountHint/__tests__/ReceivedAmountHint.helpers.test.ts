import { describe, expect, it } from "vitest";

import {
  formatReceivedMismatchTitle,
  formatReceivedShortLabel,
  isReceivedAmountMismatch,
} from "../ReceivedAmountHint.helpers";

const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

describe("isReceivedAmountMismatch", () => {
  it("should not flag equal amounts", () => {
    expect(isReceivedAmountMismatch(2000, 2000)).toBe(false);
  });

  it("should compare in kopecks", () => {
    expect(isReceivedAmountMismatch(0.1 + 0.2, 0.3)).toBe(false);
    expect(isReceivedAmountMismatch(1999.99, 2000)).toBe(true);
  });

  it("should flag a different amount", () => {
    expect(isReceivedAmountMismatch(1800, 2000)).toBe(true);
    expect(isReceivedAmountMismatch(2500, 2000)).toBe(true);
  });

  it("should treat a missing price as zero", () => {
    expect(isReceivedAmountMismatch(0, null)).toBe(false);
    expect(isReceivedAmountMismatch(500, undefined)).toBe(true);
  });

  it.each([null, undefined])(
    "should not flag a lesson without a received amount (%p)",
    (amount) => {
      expect(isReceivedAmountMismatch(amount, 2000)).toBe(false);
    }
  );
});

describe("formatReceivedMismatchTitle", () => {
  it("should name both amounts", () => {
    expect(normalizeSpaces(formatReceivedMismatchTitle(2000, 2500))).toBe(
      "Получено 2 000 ₽, стоимость урока 2 500 ₽"
    );
  });

  it("should keep kopecks", () => {
    expect(normalizeSpaces(formatReceivedMismatchTitle(1800.5, 2000))).toBe(
      "Получено 1 800,50 ₽, стоимость урока 2 000 ₽"
    );
  });
});

describe("formatReceivedShortLabel", () => {
  it("should describe the received amount", () => {
    expect(normalizeSpaces(formatReceivedShortLabel(0))).toBe("получено 0 ₽");
    expect(normalizeSpaces(formatReceivedShortLabel(1800))).toBe("получено 1 800 ₽");
  });
});
