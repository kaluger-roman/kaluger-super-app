import { allSettled, createWatch, fork } from "effector";
import type { EventCallable, Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { studentUserModel, userModel } from "@entities";
import { sessionCleanupModel } from "@features/logoutConfirmation";
import { callEntryModel, callModel } from "@features/videoCall";
import type { CallRole } from "@features/videoCall";

import { BLOCKING_OVERLAY_DELAY_MS } from "../blocking.constants";
import "../sessionLogout.model";
import * as webSocketModel from "../webSocket.model";

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

// The end of a session sends the window to /login, which would outlive the test.
const inCall = (phase: Phase, role: CallRole | null): Scope =>
  fork({
    values: [
      [callModel.$callPhase, phase],
      [callModel.$callRole, role],
    ],
    handlers: [
      [studentUserModel.studentLogoutFx, () => undefined],
      [studentUserModel.clearStudentSessionFx, () => undefined],
      [userModel.redirectToLoginFx, () => undefined],
      [webSocketModel.expireSessionFx, () => undefined],
    ],
  });

// A logout blocks the screen while it cleans up: the overlay's debounce holds allSettled until
// its timer fires.
const settle = async (unit: EventCallable<void>, scope: Scope): Promise<void> => {
  const done = allSettled(unit, { scope });
  await vi.advanceTimersByTimeAsync(BLOCKING_OVERLAY_DELAY_MS);
  await done;
};

const otherRole = (role: CallRole): CallRole => (role === "tutor" ? "student" : "tutor");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app/model/sessionLogout.model", () => {
  describe.each([
    ["tutor", sessionCleanupModel.tutorLogoutConfirmed],
    ["student", sessionCleanupModel.studentLogoutRequested],
  ] as const)("%s logout with a call in progress", (role, logout) => {
    it.each([
      ["outgoing", callModel.cancelCall],
      ["incoming", callEntryModel.rejectRequested],
      ["connecting", callModel.hangUp],
      ["active", callModel.hangUp],
    ] as const)("should end a call in the %s phase at once", async (phase, endUnit) => {
      const scope = inCall(phase, role);
      const ended = vi.fn();
      createWatch({ unit: endUnit, fn: ended, scope });

      await settle(logout, scope);

      expect(ended).toHaveBeenCalledTimes(1);
      expect(scope.getState(callModel.$callPhase)).toBe("idle");
    });

    it.each([
      ["incoming", callEntryModel.rejectRequested],
      ["active", callModel.hangUp],
    ] as const)(
      "should keep a %s call held on the other session's socket (regression: logout ended any call)",
      async (phase, endUnit) => {
        const scope = inCall(phase, otherRole(role));
        const ended = vi.fn();
        createWatch({ unit: endUnit, fn: ended, scope });

        await settle(logout, scope);

        expect(ended).not.toHaveBeenCalled();
        expect(scope.getState(callModel.$callPhase)).toBe(phase);
      }
    );
  });

  describe.each([
    ["another tab logged the tutor out", "tutor", webSocketModel.tutorSessionEndedElsewhere],
    ["this tab dropped the tutor session", "tutor", userModel.tutorSessionCleared],
    [
      "another tab logged the student out",
      "student",
      studentUserModel.studentSessionEndedElsewhere,
    ],
  ] as const)("%s with a call in progress", (_case, role, sessionEnded) => {
    it.each([
      ["outgoing", callModel.cancelCall],
      ["incoming", callEntryModel.rejectRequested],
      ["connecting", callModel.hangUp],
      ["active", callModel.hangUp],
    ] as const)("should end a call in the %s phase at once", async (phase, endUnit) => {
      const scope = inCall(phase, role);
      const ended = vi.fn();
      createWatch({ unit: endUnit, fn: ended, scope });

      await settle(sessionEnded, scope);

      expect(ended).toHaveBeenCalledTimes(1);
      expect(scope.getState(callModel.$callPhase)).toBe("idle");
    });

    it("should keep a call held on the other session's socket", async () => {
      const scope = inCall("active", otherRole(role));

      await settle(sessionEnded, scope);

      expect(scope.getState(callModel.$callPhase)).toBe("active");
    });
  });

  it("should leave the call screen alone when there is no call", async () => {
    const scope = inCall("idle", null);
    const hungUp = vi.fn();
    const canceled = vi.fn();
    const rejected = vi.fn();
    createWatch({ unit: callModel.hangUp, fn: hungUp, scope });
    createWatch({ unit: callModel.cancelCall, fn: canceled, scope });
    createWatch({ unit: callEntryModel.rejectRequested, fn: rejected, scope });

    await settle(sessionCleanupModel.tutorLogoutConfirmed, scope);

    expect(hungUp).not.toHaveBeenCalled();
    expect(canceled).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();
  });
});
