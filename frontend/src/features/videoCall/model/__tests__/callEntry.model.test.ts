import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import * as callModel from "../call.model";
import type { CallPhase, StartCallParams } from "../call.types";
import * as callEntryModel from "../callEntry.model";

const CALL: StartCallParams = { studentId: "stu-1", peerName: "Иван", lesson: null };

const setup = (phase: CallPhase) => {
  const scope = fork({ values: [[callModel.$callPhase, phase]] });
  const started: StartCallParams[] = [];
  let accepted = 0;
  let rejected = 0;
  createWatch({ unit: callModel.callStarted, fn: (call) => started.push(call), scope });
  createWatch({ unit: callModel.acceptCall, fn: () => (accepted += 1), scope });
  createWatch({ unit: callModel.rejectCall, fn: () => (rejected += 1), scope });
  return {
    scope,
    started,
    accepted: () => accepted,
    rejected: () => rejected,
  };
};

describe("features/videoCall/model/callEntry.model", () => {
  it("should start a call while there is none", async () => {
    const { scope, started } = setup("idle");

    await allSettled(callEntryModel.startRequested, { scope, params: CALL });

    expect(started).toEqual([CALL]);
  });

  it.each<CallPhase>(["outgoing", "incoming", "connecting", "active"])(
    "should not start a call in the %s phase",
    async (phase) => {
      const { scope, started } = setup(phase);

      await allSettled(callEntryModel.startRequested, { scope, params: CALL });

      expect(started).toEqual([]);
    }
  );

  it("should answer and reject only an incoming call", async () => {
    const incoming = setup("incoming");
    await allSettled(callEntryModel.answerRequested, { scope: incoming.scope });
    expect(incoming.accepted()).toBe(1);
    expect(incoming.scope.getState(callModel.$callPhase)).toBe("connecting");

    const ringing = setup("incoming");
    await allSettled(callEntryModel.rejectRequested, { scope: ringing.scope });
    expect(ringing.rejected()).toBe(1);
    expect(ringing.scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should ignore a second answer tap and a late reject", async () => {
    const { scope, accepted, rejected } = setup("incoming");

    await allSettled(callEntryModel.answerRequested, { scope });
    await allSettled(callEntryModel.answerRequested, { scope });
    await allSettled(callEntryModel.rejectRequested, { scope });

    expect(accepted()).toBe(1);
    expect(rejected()).toBe(0);
    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
  });

  it("should not answer when no call rings", async () => {
    const { scope, accepted, rejected } = setup("idle");

    await allSettled(callEntryModel.answerRequested, { scope });
    await allSettled(callEntryModel.rejectRequested, { scope });

    expect(accepted()).toBe(0);
    expect(rejected()).toBe(0);
  });
});
