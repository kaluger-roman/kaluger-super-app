import { describe, expect, it } from "vitest";

import {
  PEER_AUDIO_UNAVAILABLE_TEXT,
  RECONNECTING_TEXT,
  STUDENT_MIC_SUSPENDED_TEXT,
  STUDENT_MINIMIZED_TEXT,
} from "../../videoCall.constants";
import type { PeerPresenceState } from "../../videoCall.types";
import { getPeerAudioNotice, getPeerInterruption } from "../peerView.helpers";

const presenceOf = (patch: Partial<PeerPresenceState>): PeerPresenceState => ({
  presence: "on_screen",
  audioSuspended: false,
  videoSuspended: false,
  ...patch,
});

describe("features/videoCall/model/peerView helpers", () => {
  describe("peer interruption (FR-032, FR-033)", () => {
    it("should show reconnecting to both roles when the peer lost the connection", () => {
      const lost = presenceOf({ presence: "disconnected" });
      const reconnecting = { kind: "reconnecting", label: RECONNECTING_TEXT };
      expect(getPeerInterruption("tutor", lost)).toEqual(reconnecting);
      expect(getPeerInterruption("student", lost)).toEqual(reconnecting);
      expect(getPeerInterruption(null, lost)).toEqual(reconnecting);
    });

    it("should tell only the tutor that the student minimized the app", () => {
      const minimized = presenceOf({ presence: "background", videoSuspended: true });
      expect(getPeerInterruption("tutor", minimized)).toEqual({
        kind: "minimized",
        label: STUDENT_MINIMIZED_TEXT,
      });
      expect(getPeerInterruption("student", minimized)).toEqual({
        kind: "reconnecting",
        label: RECONNECTING_TEXT,
      });
      expect(getPeerInterruption(null, minimized)?.label).toBe(RECONNECTING_TEXT);
    });

    it("should not interrupt a peer whose video keeps going in the background", () => {
      const background = presenceOf({ presence: "background", audioSuspended: true });
      expect(getPeerInterruption("tutor", background)).toBeNull();
      expect(getPeerInterruption("student", background)).toBeNull();
    });

    it("should not interrupt a peer on screen whatever the flags say", () => {
      const onScreen = presenceOf({ audioSuspended: true, videoSuspended: true });
      expect(getPeerInterruption("tutor", onScreen)).toBeNull();
      expect(getPeerAudioNotice("tutor", onScreen)).toBeNull();
    });

    it("should name the suspended microphone of the student to the tutor only", () => {
      const silent = presenceOf({ presence: "background", audioSuspended: true });
      expect(getPeerAudioNotice("tutor", silent)).toBe(STUDENT_MIC_SUSPENDED_TEXT);
      expect(getPeerAudioNotice("student", silent)).toBe(PEER_AUDIO_UNAVAILABLE_TEXT);
      expect(getPeerAudioNotice(null, silent)).toBe(PEER_AUDIO_UNAVAILABLE_TEXT);
    });

    it("should show no audio notice while the peer's microphone keeps working", () => {
      expect(getPeerAudioNotice("tutor", presenceOf({ presence: "background" }))).toBeNull();
      expect(
        getPeerAudioNotice("tutor", presenceOf({ presence: "disconnected", audioSuspended: true }))
      ).toBeNull();
    });
  });
});
