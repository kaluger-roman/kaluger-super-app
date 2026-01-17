import { fork, allSettled } from "effector";
import { describe, it, expect, beforeEach } from "vitest";

import * as paymentStatusModel from "../payment-status.model";

describe("PaymentStatus", () => {
  beforeEach(() => {
    // no-op
  });

  it("should have necessary exports from model", () => {
    expect(paymentStatusModel).toBeDefined();
    expect(paymentStatusModel.$isOpen).toBeDefined();
    expect(paymentStatusModel.$pendingStatus).toBeDefined();
    expect(paymentStatusModel.confirmDialogOpened).toBeDefined();
    expect(paymentStatusModel.confirmDialogClosed).toBeDefined();
  });

  it("should open dialog with pending status when confirmDialogOpened is called", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: true,
    });

    const isOpen = scope.getState(paymentStatusModel.$isOpen);
    const pendingStatus = scope.getState(paymentStatusModel.$pendingStatus);

    expect(isOpen).toBe(true);
    expect(pendingStatus).toBe(true);
  });

  it("should close dialog and reset pending status when confirmDialogClosed is called", async () => {
    const scope = fork({
      values: [
        [paymentStatusModel.$isOpen, true],
        [paymentStatusModel.$pendingStatus, true],
      ],
    });

    await allSettled(paymentStatusModel.confirmDialogClosed, { scope });

    const isOpen = scope.getState(paymentStatusModel.$isOpen);
    const pendingStatus = scope.getState(paymentStatusModel.$pendingStatus);

    expect(isOpen).toBe(false);
    expect(pendingStatus).toBeNull();
  });

  it("should handle marking as paid", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: true,
    });

    const pendingStatus = scope.getState(paymentStatusModel.$pendingStatus);
    expect(pendingStatus).toBe(true);
  });

  it("should handle marking as unpaid", async () => {
    const scope = fork();

    await allSettled(paymentStatusModel.confirmDialogOpened, {
      scope,
      params: false,
    });

    const pendingStatus = scope.getState(paymentStatusModel.$pendingStatus);
    expect(pendingStatus).toBe(false);
  });
});
