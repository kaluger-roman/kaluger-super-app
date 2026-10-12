import { describe, expect, it } from "vitest";

import { RECEIVED_AMOUNT_ERRORS } from "../receivedAmount.constants";
import {
  parseReceivedAmount,
  toReceivedAmountInput,
  validateReceivedAmount,
} from "../receivedAmount.helpers";

describe("validateReceivedAmount", () => {
  it.each(["", "   "])("should require a value for %p", (value) => {
    expect(validateReceivedAmount(value)).toBe(RECEIVED_AMOUNT_ERRORS.REQUIRED);
  });

  it.each(["-1", "abc", "-0.01"])("should reject %p as not a non-negative number", (value) => {
    expect(validateReceivedAmount(value)).toBe(RECEIVED_AMOUNT_ERRORS.INVALID);
  });

  it("should reject more than two decimals", () => {
    expect(validateReceivedAmount("1800.123")).toBe(RECEIVED_AMOUNT_ERRORS.TOO_MANY_DECIMALS);
  });

  it("should reject amounts above the limit", () => {
    expect(validateReceivedAmount("100000000")).toBe(RECEIVED_AMOUNT_ERRORS.TOO_LARGE);
  });

  it.each(["0", "1800", "1800,5", "1800.55", " 1800 ", "99999999.99"])(
    "should accept %p",
    (value) => {
      expect(validateReceivedAmount(value)).toBeNull();
    }
  );

  it("should use Russian messages", () => {
    expect(RECEIVED_AMOUNT_ERRORS).toEqual({
      REQUIRED: "Укажите полученную сумму",
      INVALID: "Сумма должна быть неотрицательным числом",
      TOO_MANY_DECIMALS: "Не больше двух знаков после запятой",
      TOO_LARGE: "Сумма не может превышать 99 999 999,99 ₽",
    });
  });
});

describe("toReceivedAmountInput", () => {
  it.each([null, undefined])("should turn %p into an empty field", (amount) => {
    expect(toReceivedAmountInput(amount)).toBe("");
  });

  it.each([
    [0, "0"],
    [2000, "2000"],
    [1800.5, "1800.5"],
  ])("should turn %p into %p", (amount, expected) => {
    expect(toReceivedAmountInput(amount)).toBe(expected);
  });
});

describe("parseReceivedAmount", () => {
  it.each([
    ["1800", 1800],
    ["1800,5", 1800.5],
    [" 0 ", 0],
    ["99999999.99", 99999999.99],
  ])("should parse %p as %p", (value, expected) => {
    expect(parseReceivedAmount(value)).toBe(expected);
  });
});
