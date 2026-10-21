import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RINGTONE_PATTERN } from "../callSounds.constants";
import { getCallSoundsAdapter } from "../callSounds.helpers";

const createAudioNode = () => ({ connect: vi.fn(), disconnect: vi.fn() });

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => {
    if (this.state === "suspended") throw new Error("NotAllowedError");
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain = () => ({
    ...createAudioNode(),
    gain: { value: 0, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() },
  });

  createOscillator = () => ({
    ...createAudioNode(),
    type: "sine",
    frequency: { value: 0 },
    start: vi.fn(),
    stop: vi.fn(),
  });
}

describe("features/videoCall/model callSounds.helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    getCallSoundsAdapter().stopRingtone();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("should keep resuming a suspended audio context until the page allows sound", async () => {
    getCallSoundsAdapter().startRingtone();
    const [ctx] = FakeAudioContext.instances;
    expect(ctx.resume).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(RINGTONE_PATTERN.onMs);
    expect(ctx.resume).toHaveBeenCalledTimes(2);

    ctx.state = "running";
    await vi.advanceTimersByTimeAsync(RINGTONE_PATTERN.offMs + RINGTONE_PATTERN.onMs);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
  });
});
