import { allSettled, createEvent, createWatch, fork } from "effector";
import { describe, expect, it } from "vitest";

import * as callModel from "../call.model";
import { forCurrentCall } from "../currentCall.model";

const resultArrived = createEvent<{ callId: string | null; value: number }>();
const currentResult = forCurrentCall(resultArrived, ({ callId }) => callId);

const collectFor = async (current: string | null, callIds: (string | null)[]) => {
  const scope = fork({ values: [[callModel.$callId, current]] });
  const seen: number[] = [];
  const watcher = createWatch({ unit: currentResult, fn: ({ value }) => seen.push(value), scope });
  for (let value = 0; value < callIds.length; value += 1) {
    await allSettled(resultArrived, { scope, params: { callId: callIds[value], value } });
  }
  watcher.unsubscribe();
  return seen;
};

describe("features/videoCall/model forCurrentCall", () => {
  it("should pass results of the current call only", async () => {
    expect(await collectFor("c-1", ["c-1", "c-old", null, "c-1"])).toEqual([0, 3]);
  });

  it("should drop every result once no call goes on", async () => {
    expect(await collectFor(null, ["c-1", null])).toEqual([]);
  });
});
