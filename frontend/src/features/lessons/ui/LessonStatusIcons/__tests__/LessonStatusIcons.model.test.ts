import { allSettled, fork } from "effector";
import { describe, expect, it } from "vitest";

import * as lessonStatusIconsModel from "../LessonStatusIcons.model";

describe("LessonStatusIcons.model received amount", () => {
  it("should prefill the received amount with the price on open", async () => {
    const scope = fork();

    await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
      scope,
      params: { lessonId: "lesson-1", price: 2000 },
    });

    expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBe("lesson-1");
    expect(scope.getState(lessonStatusIconsModel.$receivedAmountInput)).toBe("2000");
    expect(scope.getState(lessonStatusIconsModel.$receivedAmountError)).toBeNull();
  });

  it("should report an error for an empty amount", async () => {
    const scope = fork();
    await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
      scope,
      params: { lessonId: "lesson-1", price: 2000 },
    });

    await allSettled(lessonStatusIconsModel.receivedAmountChanged, { scope, params: "" });

    expect(scope.getState(lessonStatusIconsModel.$receivedAmountError)).toBe(
      "Укажите полученную сумму"
    );
  });

  it("should accept an edited amount", async () => {
    const scope = fork();
    await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
      scope,
      params: { lessonId: "lesson-1", price: 2000 },
    });

    await allSettled(lessonStatusIconsModel.receivedAmountChanged, { scope, params: "1800,5" });

    expect(scope.getState(lessonStatusIconsModel.$receivedAmountInput)).toBe("1800,5");
    expect(scope.getState(lessonStatusIconsModel.$receivedAmountError)).toBeNull();
  });

  it("should not report an error while no dialog is open", () => {
    const scope = fork();

    expect(scope.getState(lessonStatusIconsModel.$receivedAmountError)).toBeNull();
  });

  it("should reset the amount on close", async () => {
    const scope = fork();
    await allSettled(lessonStatusIconsModel.paymentDialogOpened, {
      scope,
      params: { lessonId: "lesson-1", price: 2000 },
    });

    await allSettled(lessonStatusIconsModel.paymentDialogClosed, { scope });

    expect(scope.getState(lessonStatusIconsModel.$openPaymentDialogFor)).toBeNull();
    expect(scope.getState(lessonStatusIconsModel.$receivedAmountInput)).toBe("");
    expect(scope.getState(lessonStatusIconsModel.$receivedAmountError)).toBeNull();
  });
});
