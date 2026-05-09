import { describe, it, expect } from "vitest";

import {
  getTaxLabel,
  shouldShowTaxInfoIcon,
} from "../FinancialStatistics.helpers";

describe("getTaxLabel", () => {
  it("returns rate-bearing label for a single regular entry", () => {
    expect(getTaxLabel([{ rate: 6, earnings: 10000, tax: 600 }])).toBe(
      "Налоги (6%)",
    );
  });

  it("returns neutral label when single entry is outside configured periods", () => {
    expect(
      getTaxLabel([
        { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
      ]),
    ).toBe("Налоги");
  });

  it("returns neutral label for multiple entries", () => {
    expect(
      getTaxLabel([
        { rate: 4, earnings: 15000, tax: 600 },
        { rate: 6, earnings: 10000, tax: 600 },
      ]),
    ).toBe("Налоги");
  });

  it("returns neutral label for empty breakdown", () => {
    expect(getTaxLabel([])).toBe("Налоги");
  });
});

describe("shouldShowTaxInfoIcon", () => {
  it("hides icon for a single regular entry", () => {
    expect(
      shouldShowTaxInfoIcon([{ rate: 6, earnings: 10000, tax: 600 }]),
    ).toBe(false);
  });

  it("shows icon when single entry is outside configured periods", () => {
    expect(
      shouldShowTaxInfoIcon([
        { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
      ]),
    ).toBe(true);
  });

  it("shows icon for multiple entries", () => {
    expect(
      shouldShowTaxInfoIcon([
        { rate: 4, earnings: 15000, tax: 600 },
        { rate: 6, earnings: 10000, tax: 600 },
      ]),
    ).toBe(true);
  });

  it("hides icon for empty breakdown", () => {
    expect(shouldShowTaxInfoIcon([])).toBe(false);
  });
});
