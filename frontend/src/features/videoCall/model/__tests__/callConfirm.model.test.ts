import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import * as callModel from "../call.model";
import type { CallPhase, StartCallParams } from "../call.types";
import * as callConfirmModel from "../callConfirm.model";

const LESSON = {
  id: "lesson-1",
  subject: "MATHEMATICS" as const,
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
};

const TUTOR_CALL: StartCallParams = { studentId: "stu-1", peerName: "Иван", lesson: LESSON };

const setup = (phase: CallPhase = "idle") => {
  const scope = fork({ values: [[callModel.$callPhase, phase]] });
  const started: StartCallParams[] = [];
  const confirmed: StartCallParams[] = [];
  createWatch({ unit: callModel.callStarted, fn: (call) => started.push(call), scope });
  createWatch({ unit: callConfirmModel.confirmed, fn: (call) => confirmed.push(call), scope });
  return { scope, started, confirmed };
};

describe("features/videoCall/model/callConfirm.model", () => {
  it("should open the confirmation without starting the call", async () => {
    const { scope, started } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(true);
    expect(scope.getState(callConfirmModel.$call)).toEqual(TUTOR_CALL);
    expect(started).toEqual([]);
  });

  it("should close without a call when the confirmation is dismissed", async () => {
    const { scope, started } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await allSettled(callConfirmModel.confirmDismissed, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    expect(started).toEqual([]);
  });

  it("should close and start exactly one call with the same parameters", async () => {
    const { scope, started, confirmed } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    expect(started).toEqual([TUTOR_CALL]);
    expect(confirmed).toEqual([TUTOR_CALL]);
  });

  it("should start one call on a double confirmation", async () => {
    const { scope, started } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await Promise.all([
      allSettled(callConfirmModel.callConfirmed, { scope }),
      allSettled(callConfirmModel.callConfirmed, { scope }),
    ]);

    expect(started).toHaveLength(1);
  });

  it("should ignore a confirmation while nothing is asked", async () => {
    const { scope, started, confirmed } = setup();

    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(started).toEqual([]);
    expect(confirmed).toEqual([]);
  });

  it("should close without a call when an incoming call arrives", async () => {
    const { scope, started } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "in-1", callerName: "Анна", role: "tutor", lesson: null },
    });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
    expect(started).toEqual([]);
  });

  it("should not start a second call while another call is in progress", async () => {
    const { scope, started } = setup("active");

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(started).toEqual([]);
    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
  });

  it("should keep the asked call after closing", async () => {
    const { scope } = setup();

    await allSettled(callConfirmModel.callRequested, { scope, params: TUTOR_CALL });
    await allSettled(callConfirmModel.confirmDismissed, { scope });

    expect(scope.getState(callConfirmModel.$call)).toEqual(TUTOR_CALL);
  });
});
