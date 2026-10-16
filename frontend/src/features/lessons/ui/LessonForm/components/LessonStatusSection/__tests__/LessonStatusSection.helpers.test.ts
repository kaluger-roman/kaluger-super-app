import { describe, expect, it } from "vitest";

import type { LessonFormData } from "../../../LessonForm.types";
import { applyPaymentChange, getPaymentDialogPrice } from "../LessonStatusSection.helpers";

describe("getPaymentDialogPrice", () => {
  it("should use a positive price typed in the form", () => {
    expect(getPaymentDialogPrice("2500", 2000)).toBe(2500);
    expect(getPaymentDialogPrice("1500.5", undefined)).toBe(1500.5);
  });

  it.each(["", "  ", "0", "-5", "abc"])(
    "should keep the saved price when the form price is %p",
    (formPrice) => {
      expect(getPaymentDialogPrice(formPrice, 2000)).toBe(2000);
      expect(getPaymentDialogPrice(formPrice, undefined)).toBeUndefined();
    }
  );
});

describe("applyPaymentChange", () => {
  const formData = {
    isPaid: false,
    paymentDate: undefined,
    receivedAmount: "",
    price: "2000",
  } as LessonFormData;

  it("should store the payment with its received amount", () => {
    expect(applyPaymentChange(formData, true, "2026-01-20", 1800)).toEqual({
      ...formData,
      isPaid: true,
      paymentDate: "2026-01-20",
      receivedAmount: "1800",
    });
  });

  it("should store a zero amount", () => {
    expect(applyPaymentChange(formData, true, "2026-01-20", 0).receivedAmount).toBe("0");
  });

  it("should clear the amount when the payment is removed", () => {
    const paid = { ...formData, isPaid: true, paymentDate: "2026-01-20", receivedAmount: "1800" };

    expect(applyPaymentChange(paid, false, undefined, undefined)).toEqual({
      ...paid,
      isPaid: false,
      paymentDate: undefined,
      receivedAmount: "",
    });
  });
});
