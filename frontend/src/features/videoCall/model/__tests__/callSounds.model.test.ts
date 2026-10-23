import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setCallSoundsAdapter } from "../callSounds.helpers";
import { callModel } from "../index";
import { installTransport, resetCallFlow } from "./callFlow";

const makeSoundsMock = () => ({
  startRingback: vi.fn<() => void>(),
  stopRingback: vi.fn<() => void>(),
  startRingtone: vi.fn<() => void>(),
  stopRingtone: vi.fn<() => void>(),
});

describe("features/videoCall/model call sounds", () => {
  let sounds: ReturnType<typeof makeSoundsMock>;

  beforeEach(() => {
    sounds = makeSoundsMock();
    setCallSoundsAdapter(sounds);
    installTransport();
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should play the ringback while dialing and stop it once the callee answers", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    expect(sounds.startRingback).not.toHaveBeenCalled();
    callModel.callRinging("c-0");
    expect(sounds.startRingback).toHaveBeenCalledTimes(1);
    expect(sounds.startRingtone).not.toHaveBeenCalled();

    callModel.callAcceptedReceived({ callId: "c-0", iceServers: [] });
    expect(sounds.stopRingback).toHaveBeenCalled();
  });

  it("should play the ringtone on an incoming call and stop it when accepted", () => {
    callModel.incomingCallReceived({ callId: "c-1", callerName: "Анна", role: "tutor" });
    expect(sounds.startRingtone).toHaveBeenCalledTimes(1);
    expect(sounds.startRingback).not.toHaveBeenCalled();

    callModel.acceptCall();
    expect(sounds.stopRingtone).toHaveBeenCalled();
  });

  it("should stop the ringtone when an incoming call is rejected", () => {
    callModel.incomingCallReceived({ callId: "c-2", callerName: "Анна", role: "tutor" });
    sounds.stopRingtone.mockClear();

    callModel.rejectCall();
    expect(sounds.stopRingtone).toHaveBeenCalled();
  });

  it("should not beep when the callee is refused before the call rings (regression: offline tutor)", () => {
    callModel.callStarted({ peerName: "Анна" });
    callModel.callFailed("Репетитор сейчас не в сети");

    expect(sounds.startRingback).not.toHaveBeenCalled();
  });
});
