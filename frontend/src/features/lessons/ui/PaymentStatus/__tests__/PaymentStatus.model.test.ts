import { allSettled, fork } from "effector";
import { describe, expect, it } from "vitest";

import * as paymentStatusModel from "../PaymentStatus.model";

describe("PaymentStatus.model received amount", () => {
  it("should prefill the received amount with the price when marking as paid", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true, price: 2000 },
    });

    expect(scope.getState(paymentStatusModel.$isOpen)).toBe(true);
    expect(scope.getState(paymentStatusModel.$pendingStatus)).toBe(true);
    expect(scope.getState(paymentStatusModel.$receivedAmountInput)).toBe("2000");
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBeNull();
  });

  it("should leave the field empty for a lesson without a price", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true },
    });

    expect(scope.getState(paymentStatusModel.$receivedAmountInput)).toBe("");
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBe(
      "Укажите полученную сумму"
    );
  });

  it("should validate the edited amount", async () => {
    const scope = fork();
    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true, price: 2000 },
    });

    await allSettled(paymentStatusModel.receivedAmountChanged, { scope, params: "" });
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBe(
      "Укажите полученную сумму"
    );

    await allSettled(paymentStatusModel.receivedAmountChanged, { scope, params: "1800" });
    expect(scope.getState(paymentStatusModel.$receivedAmountInput)).toBe("1800");
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBeNull();
  });

  it("should not report an error when removing the payment", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: false, price: 2000 },
    });
    await allSettled(paymentStatusModel.receivedAmountChanged, { scope, params: "" });

    expect(scope.getState(paymentStatusModel.$pendingStatus)).toBe(false);
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBeNull();
  });

  it("should reset the amount when the dialog closes", async () => {
    const scope = fork();
    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true, price: 2000 },
    });

    await allSettled(paymentStatusModel.confirmDialogClosed, { scope });

    expect(scope.getState(paymentStatusModel.$isOpen)).toBe(false);
    expect(scope.getState(paymentStatusModel.$pendingStatus)).toBeNull();
    expect(scope.getState(paymentStatusModel.$receivedAmountInput)).toBe("");
    expect(scope.getState(paymentStatusModel.$receivedAmountError)).toBeNull();
  });

  it("should prefill again with the new price when reopened", async () => {
    const scope = fork();
    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true, price: 2000 },
    });
    await allSettled(paymentStatusModel.receivedAmountChanged, { scope, params: "1800" });
    await allSettled(paymentStatusModel.confirmDialogClosed, { scope });

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: { isPaid: true, price: 2500 },
    });

    expect(scope.getState(paymentStatusModel.$receivedAmountInput)).toBe("2500");
  });
});
