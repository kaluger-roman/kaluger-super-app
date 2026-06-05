import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  setCallSoundsAdapter,
  setCallTransport,
  stopAllSessions,
} from "../index";

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
    setCallTransport(vi.fn());
  });

  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  it("plays the ringback while dialing and stops it once connected", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    expect(sounds.startRingback).toHaveBeenCalledTimes(1);
    expect(sounds.startRingtone).not.toHaveBeenCalled();

    callModel.callConnected();
    expect(sounds.stopRingback).toHaveBeenCalled();
  });

  it("plays the ringtone on an incoming call and stops it when accepted", () => {
    callModel.incomingCallReceived({ callId: "c-1", callerName: "Анна" });
    expect(sounds.startRingtone).toHaveBeenCalledTimes(1);
    expect(sounds.startRingback).not.toHaveBeenCalled();

    callModel.acceptCall();
    expect(sounds.stopRingtone).toHaveBeenCalled();
  });

  it("stops the ringtone when an incoming call is rejected", () => {
    callModel.incomingCallReceived({ callId: "c-2", callerName: "Анна" });
    sounds.stopRingtone.mockClear();

    callModel.rejectCall();
    expect(sounds.stopRingtone).toHaveBeenCalled();
  });
});
