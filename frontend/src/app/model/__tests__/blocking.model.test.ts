import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { studentUserModel } from "@entities/studentUser";

import { BLOCKING_OVERLAY_DELAY_MS } from "../blocking.constants";
import { $isBlocking, $isBlockingVisible } from "../blocking.model";

describe("app/model/blocking.model — $isBlocking", () => {
  it("blocks while studentUserModel.getCurrentStudentFx is pending (regression: профиль ученика грузился без global overlay)", async () => {
    const scope = fork({
      handlers: [
        [
          studentUserModel.getCurrentStudentFx,
          () => new Promise(() => undefined),
        ],
      ],
    });

    expect(scope.getState($isBlocking)).toBe(false);

    void allSettled(studentUserModel.getCurrentStudentFx, { scope });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(scope.getState($isBlocking)).toBe(true);
  });
});

describe("app/model/blocking.model — $isBlockingVisible (300ms delayed overlay)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const forkBlockingScope = () => {
    let resolveRequest: () => void = () => undefined;
    const scope = fork({
      handlers: [
        [
          studentUserModel.studentLogoutFx,
          () =>
            new Promise<void>((resolve) => {
              resolveRequest = resolve;
            }),
        ],
      ],
    });

    void allSettled(studentUserModel.studentLogoutFx, { scope });

    return { scope, resolveRequest: () => resolveRequest() };
  };

  it("never shows the overlay when the request finishes before the threshold", async () => {
    const { scope, resolveRequest } = forkBlockingScope();
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState($isBlocking)).toBe(true);
    expect(scope.getState($isBlockingVisible)).toBe(false);

    await vi.advanceTimersByTimeAsync(BLOCKING_OVERLAY_DELAY_MS - 50);
    resolveRequest();
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState($isBlocking)).toBe(false);

    // Run well past the threshold — the already-scheduled delay must not reveal it.
    await vi.advanceTimersByTimeAsync(BLOCKING_OVERLAY_DELAY_MS);

    expect(scope.getState($isBlockingVisible)).toBe(false);
  });

  it("shows the overlay once the request stays pending past the threshold", async () => {
    const { scope } = forkBlockingScope();
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState($isBlockingVisible)).toBe(false);

    await vi.advanceTimersByTimeAsync(BLOCKING_OVERLAY_DELAY_MS - 50);

    expect(scope.getState($isBlockingVisible)).toBe(false);

    await vi.advanceTimersByTimeAsync(100);

    expect(scope.getState($isBlockingVisible)).toBe(true);
  });

  it("hides the overlay immediately once the request finishes", async () => {
    const { scope, resolveRequest } = forkBlockingScope();
    await vi.advanceTimersByTimeAsync(BLOCKING_OVERLAY_DELAY_MS + 50);

    expect(scope.getState($isBlockingVisible)).toBe(true);

    resolveRequest();
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState($isBlocking)).toBe(false);
    expect(scope.getState($isBlockingVisible)).toBe(false);
  });
});
