import { describe, it, expect } from "vitest";

import { formatTaxExemptLine } from "../TaxRateInfoTooltip.helpers";

describe("formatTaxExemptLine", () => {
  it("formats the tax-exempt sum with grouped rubles", () => {
    expect(formatTaxExemptLine(2000)).toMatch(/^Не облагается налогом: 2\s000\s₽$/);
  });

  it("keeps kopecks so the line matches the income history total", () => {
    expect(formatTaxExemptLine(2000.4)).toMatch(/^Не облагается налогом: 2\s000,40\s₽$/);
  });
});
