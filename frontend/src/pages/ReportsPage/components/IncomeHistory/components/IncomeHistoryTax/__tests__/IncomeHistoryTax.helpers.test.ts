import { describe, expect, it } from "vitest";

import { formatEntryTax } from "../IncomeHistoryTax.helpers";

const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

describe("formatEntryTax", () => {
  it("should describe a taxed payment with its rate", () => {
    expect(normalizeSpaces(formatEntryTax({ kind: "TAXED", amount: 1200, rate: 6 }))).toBe(
      "налог 1 200 ₽ · 6%"
    );
  });

  it("should keep a fractional rate", () => {
    expect(normalizeSpaces(formatEntryTax({ kind: "TAXED", amount: 65, rate: 6.5 }))).toBe(
      "налог 65 ₽ · 6.5%"
    );
  });

  it("should describe a payment outside the configured periods", () => {
    expect(normalizeSpaces(formatEntryTax({ kind: "OUTSIDE_PERIODS" }))).toBe(
      "налог 0 ₽ · вне настроенных периодов"
    );
  });
});
