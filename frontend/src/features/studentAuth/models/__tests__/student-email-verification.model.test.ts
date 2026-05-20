import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentAuthApi } from "@shared";

import * as model from "../student-email-verification.model";

vi.mock("@shared", async () => {
  const actual =
    await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentAuthApi: {
      ...actual.studentAuthApi,
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    },
  };
});

describe("features/studentAuth/models/student-email-verification.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects submission of code that is not exactly 6 digits", async () => {
    const scope = fork({ values: [[model.$code, "12"]] });
    await allSettled(model.codeSubmitted, { scope, params: undefined });
    expect(studentAuthApi.verifyEmail).not.toHaveBeenCalled();
    expect(scope.getState(model.$verifyError)).toBe("Введите 6-значный код");
  });

  it("calls verifyEmail with a valid 6-digit code", async () => {
    vi.mocked(studentAuthApi.verifyEmail).mockResolvedValueOnce({
      id: "su-1",
      email: "s@example.com",
      name: "S",
      isEmailVerified: true,
      tutor: null,
    });

    const scope = fork({ values: [[model.$code, "123456"]] });
    await allSettled(model.codeSubmitted, { scope, params: undefined });

    expect(studentAuthApi.verifyEmail).toHaveBeenCalledWith("123456");
    expect(scope.getState(model.$verifyError)).toBeNull();
  });

  it("captures error from verify failure", async () => {
    vi.mocked(studentAuthApi.verifyEmail).mockRejectedValueOnce({
      response: { data: { error: "Неверный код подтверждения" } },
    });

    const scope = fork({ values: [[model.$code, "654321"]] });
    await allSettled(model.codeSubmitted, { scope, params: undefined });

    expect(scope.getState(model.$verifyError)).toBe(
      "Неверный код подтверждения"
    );
  });

  it("starts 60s cooldown on successful resend", async () => {
    vi.mocked(studentAuthApi.resendVerification).mockResolvedValueOnce(
      undefined
    );

    const scope = fork();

    // Fire-and-forget: после resend модель запускает patronum `interval`,
    // у которого внутренний timeoutFx остаётся pending. Не ждём `allSettled`
    // целиком — продвигаем macrotask queue и сразу гасим интервал, чтобы
    // pending не утёк за пределы теста.
    void allSettled(model.resendRequested, { scope, params: undefined });
    await new Promise((resolve) => setImmediate(resolve));

    expect(scope.getState(model.$resendCooldownSeconds)).toBe(60);
    expect(scope.getState(model.$resendError)).toBeNull();
    expect(scope.getState(model.$isCooldownRunning)).toBe(true);

    await allSettled(model.cooldownEnded, { scope, params: undefined });
  });

  it("captures error from resend failure", async () => {
    vi.mocked(studentAuthApi.resendVerification).mockRejectedValueOnce({
      response: { data: { error: "Подождите 30 секунд" } },
    });

    const scope = fork();
    await allSettled(model.resendRequested, { scope, params: undefined });

    expect(scope.getState(model.$resendError)).toBe("Подождите 30 секунд");
  });

  it("cooldownTick decrements counter and clamps at 0", async () => {
    const scope = fork({ values: [[model.$resendCooldownSeconds, 2]] });
    await allSettled(model.cooldownTick, { scope, params: undefined });
    expect(scope.getState(model.$resendCooldownSeconds)).toBe(1);
    await allSettled(model.cooldownTick, { scope, params: undefined });
    await allSettled(model.cooldownTick, { scope, params: undefined });
    expect(scope.getState(model.$resendCooldownSeconds)).toBe(0);
  });

  it("auto-stops the cooldown interval when the counter reaches 0 (regression: timer logic must live in the model, not in the component's useEffect)", async () => {
    const scope = fork({ values: [[model.$resendCooldownSeconds, 1]] });

    // Стартуем интервал, как будто только что прошёл успешный resend.
    void allSettled(model.cooldownStarted, { scope, params: undefined });
    await Promise.resolve();
    expect(scope.getState(model.$isCooldownRunning)).toBe(true);

    // Один тик доводит счётчик до нуля и должен погасить интервал автоматически
    // (через `sample({ clock: $resendCooldownSeconds, filter: s === 0, target: cooldownEnded })`).
    await allSettled(model.cooldownTick, { scope, params: undefined });

    expect(scope.getState(model.$resendCooldownSeconds)).toBe(0);
    expect(scope.getState(model.$isCooldownRunning)).toBe(false);
  });
});
