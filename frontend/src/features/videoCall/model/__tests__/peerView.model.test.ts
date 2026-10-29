import { fork } from "effector";
import { describe, expect, it } from "vitest";

import {
  PEER_AUDIO_UNAVAILABLE_TEXT,
  RECONNECTING_TEXT,
  STUDENT_MIC_SUSPENDED_TEXT,
  STUDENT_MINIMIZED_TEXT,
} from "../../videoCall.constants";
import type { CallMediaState, PeerPresenceState } from "../../videoCall.types";
import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callPresenceModel from "../callPresence.model";
import * as peerViewModel from "../peerView.model";
import type { CallRole } from "../signaling.types";

const SHARING: CallMediaState = {
  micOn: true,
  cameraOn: true,
  screenSharing: true,
  cameraAvailable: true,
};

const MINIMIZED: PeerPresenceState = {
  presence: "background",
  audioSuspended: true,
  videoSuspended: true,
};

type ViewScope = {
  role?: CallRole;
  presence?: PeerPresenceState;
  mediaLost?: boolean;
  phase?: CallPhase;
};

const viewOf = ({
  role = "tutor",
  presence = { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  mediaLost = false,
  phase = "active",
}: ViewScope = {}) =>
  fork({
    values: [
      [callModel.$callRole, role],
      [callModel.$callPhase, phase],
      [callModel.$peerMediaState, SHARING],
      [callPresenceModel.$peerPresence, presence],
      [callPresenceModel.$mediaConnectionLost, mediaLost],
    ],
  });

describe("features/videoCall/model/peerView.model", () => {
  it("should show the peer as it is while it is on screen", () => {
    const scope = viewOf();

    expect(scope.getState(peerViewModel.$peerInterruption)).toBeNull();
    expect(scope.getState(peerViewModel.$isPeerInterrupted)).toBe(false);
    expect(scope.getState(peerViewModel.$peerAudioNotice)).toBeNull();
    expect(scope.getState(peerViewModel.$shownPeerMedia)).toEqual(SHARING);
  });

  it("should tell the tutor that the student minimized the app (FR-032)", () => {
    const scope = viewOf({ role: "tutor", presence: MINIMIZED });

    expect(scope.getState(peerViewModel.$peerInterruption)).toEqual({
      kind: "minimized",
      label: STUDENT_MINIMIZED_TEXT,
    });
    expect(scope.getState(peerViewModel.$peerAudioNotice)).toBe(STUDENT_MIC_SUSPENDED_TEXT);
  });

  it("should give the student only neutral wording about the tutor (FR-032)", () => {
    const scope = viewOf({ role: "student", presence: MINIMIZED });

    expect(scope.getState(peerViewModel.$peerInterruption)).toEqual({
      kind: "reconnecting",
      label: RECONNECTING_TEXT,
    });
    expect(scope.getState(peerViewModel.$peerAudioNotice)).toBe(PEER_AUDIO_UNAVAILABLE_TEXT);
  });

  it("should show the peer as reconnecting while the media of an active call is lost", () => {
    const scope = viewOf({ mediaLost: true });

    expect(scope.getState(peerViewModel.$peerInterruption)?.kind).toBe("reconnecting");
    expect(scope.getState(peerViewModel.$isPeerInterrupted)).toBe(true);
  });

  it("should hide the camera and the shared screen of an interrupted peer, not its mic", () => {
    const scope = viewOf({ presence: MINIMIZED });

    expect(scope.getState(peerViewModel.$shownPeerMedia)).toEqual({
      ...SHARING,
      cameraOn: false,
      screenSharing: false,
    });
  });
});
