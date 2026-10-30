import { describe, expect, it } from "vitest";

import { CAMERA_FAILED_TEXT, MIC_AND_CAMERA_FAILED_TEXT, MIC_FAILED_TEXT } from "../call.constants";
import {
  getDeviceFailedText,
  isRecoveryRequest,
  queueRecoveryRequest,
  selectRecoveryTargets,
  toToggledDevices,
  toRecoveryRequest,
  toReplayedRequest,
} from "../trackRecovery.helpers";
import type { CallSession } from "../webrtc.types";
import { createFakeStream, createFakeTrack } from "./fakeWebrtc";
import type { FakeTrack } from "./fakeWebrtc";

const sessionWith = (tracks: FakeTrack[], cameraTrack: FakeTrack | null): CallSession => {
  const localStream = createFakeStream([]);
  tracks.forEach((track) => localStream.addTrack(track));
  return { localStream, cameraTrack } as unknown as CallSession;
};

const systemMuted = (kind: "audio" | "video", enabled: boolean): FakeTrack =>
  Object.assign(createFakeTrack(kind), { muted: true, enabled });

const ended = (kind: "audio" | "video"): FakeTrack =>
  Object.assign(createFakeTrack(kind), { readyState: "ended" as const });

const asDom = (track: FakeTrack): MediaStreamTrack => track as unknown as MediaStreamTrack;

describe("features/videoCall/model trackRecovery.helpers", () => {
  describe("selectRecoveryTargets", () => {
    it("should pick the ended microphone and camera, whether turned on or off", () => {
      const mic = Object.assign(ended("audio"), { enabled: false });
      const camera = ended("video");

      expect(selectRecoveryTargets(sessionWith([mic, camera], camera), [])).toEqual([mic, camera]);
    });

    it("should replace a live track the system muted only for a device the user toggled", () => {
      const mic = systemMuted("audio", true);
      const camera = systemMuted("video", true);
      const session = sessionWith([mic, camera], camera);

      expect(selectRecoveryTargets(session, [])).toEqual([]);
      expect(selectRecoveryTargets(session, ["camera"])).toEqual([camera]);
      expect(selectRecoveryTargets(session, ["mic"])).toEqual([mic]);
      expect(selectRecoveryTargets(session, ["mic", "camera"])).toEqual([mic, camera]);
    });

    it("should not replace a muted track the user turned off", () => {
      const mic = systemMuted("audio", false);
      const camera = systemMuted("video", false);

      expect(selectRecoveryTargets(sessionWith([mic, camera], camera), ["mic", "camera"])).toEqual(
        []
      );
    });

    it("should not replace tracks that still run", () => {
      const mic = createFakeTrack("audio");
      const camera = createFakeTrack("video");

      expect(selectRecoveryTargets(sessionWith([mic, camera], camera), ["mic", "camera"])).toEqual(
        []
      );
    });

    it("should never pick a video track that is not the camera", () => {
      const other = ended("video");
      const muted = systemMuted("video", true);

      expect(selectRecoveryTargets(sessionWith([other, muted], null), ["camera"])).toEqual([]);
    });

    it("should pick nothing without a local stream", () => {
      const session = { localStream: null, cameraTrack: null } as unknown as CallSession;

      expect(selectRecoveryTargets(session, ["mic", "camera"])).toEqual([]);
    });

    it("should skip the tracks the previous run tried unless their device was toggled", () => {
      const mic = ended("audio");
      const camera = ended("video");
      const session = sessionWith([mic, camera], camera);
      const both = [asDom(mic), asDom(camera)];

      expect(selectRecoveryTargets(session, [], both)).toEqual([]);
      expect(selectRecoveryTargets(session, ["camera"], both)).toEqual([camera]);
      expect(selectRecoveryTargets(session, [], [asDom(mic)])).toEqual([camera]);
    });
  });

  describe("toReplayedRequest", () => {
    const tried = asDom(ended("audio"));
    const run = { result: { recovered: 0, busy: [], failed: [], attempted: [tried] } };

    it("should replay the waiting request without the tracks the run just tried", () => {
      expect(toReplayedRequest({ callId: "call-1", toggled: ["camera"] }, run)).toEqual({
        callId: "call-1",
        toggled: ["camera"],
        skipped: [tried],
      });
    });

    it("should replay nothing when no request waits", () => {
      expect(toReplayedRequest(null, run)).toBeNull();
    });
  });

  describe("getDeviceFailedText", () => {
    it("should name the microphone, the camera or both", () => {
      expect(getDeviceFailedText(["mic"])).toBe(MIC_FAILED_TEXT);
      expect(getDeviceFailedText(["camera"])).toBe(CAMERA_FAILED_TEXT);
      expect(getDeviceFailedText(["mic", "camera"])).toBe(MIC_AND_CAMERA_FAILED_TEXT);
      expect(getDeviceFailedText(["camera", "mic"])).toBe(MIC_AND_CAMERA_FAILED_TEXT);
    });
  });

  describe("toToggledDevices", () => {
    it("should name the device a toggle changed", () => {
      expect(toToggledDevices({ micOn: false })).toEqual(["mic"]);
      expect(toToggledDevices({ cameraOn: true, cameraAvailable: true })).toEqual(["camera"]);
    });

    it("should name none when the toggle changed nothing", () => {
      expect(toToggledDevices(null)).toEqual([]);
    });
  });

  describe("toRecoveryRequest", () => {
    const address = { callId: "call-1", role: "tutor" as const };

    it("should ask to recover the tracks of the current call", () => {
      expect(toRecoveryRequest(address, ["camera"])).toEqual({
        callId: "call-1",
        toggled: ["camera"],
      });
      expect(toRecoveryRequest(address, [])).toEqual({ callId: "call-1", toggled: [] });
    });

    it("should not ask without a call", () => {
      expect(toRecoveryRequest(null, ["mic"])).toBeNull();
    });
  });

  describe("queueRecoveryRequest", () => {
    const plain = { callId: "call-1", toggled: [] };
    const mic = { callId: "call-1", toggled: ["mic" as const] };
    const camera = { callId: "call-1", toggled: ["camera" as const] };

    it("should keep every device toggled while waiting", () => {
      expect(queueRecoveryRequest(null, plain)).toEqual(plain);
      expect(queueRecoveryRequest(mic, plain)).toEqual(mic);
      expect(queueRecoveryRequest(plain, mic)).toEqual(mic);
      expect(queueRecoveryRequest(mic, camera)).toEqual({
        callId: "call-1",
        toggled: ["mic", "camera"],
      });
      expect(queueRecoveryRequest(mic, mic)).toEqual(mic);
    });

    it("should wait with the request of the newer call only", () => {
      const next = { callId: "call-2", toggled: [] };

      expect(queueRecoveryRequest(mic, next)).toEqual(next);
    });
  });

  describe("isRecoveryRequest", () => {
    it("should tell a request from none", () => {
      expect(isRecoveryRequest({ callId: "call-1", toggled: [] })).toBe(true);
      expect(isRecoveryRequest(null)).toBe(false);
    });
  });
});
