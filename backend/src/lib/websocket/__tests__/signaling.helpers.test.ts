import { ICE_CANDIDATE_MAX_LENGTH, ICE_FIELD_MAX_LENGTH } from "../signaling.constants";
import {
  parseCallSignal,
  toDropPeerMessage,
  toIceCandidate,
  toSessionDescription,
} from "../signaling.helpers";

const CANDIDATE = {
  candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host",
  sdpMid: "0",
  sdpMLineIndex: 0,
};

describe("toIceCandidate", () => {
  it("should keep only the known candidate fields", () => {
    expect(toIceCandidate({ ...CANDIDATE, extra: 1 })).toEqual({
      ...CANDIDATE,
      usernameFragment: null,
    });
  });

  it("should reject a candidate that is not a string or is too long", () => {
    expect(toIceCandidate({ candidate: 1 })).toBeNull();
    expect(toIceCandidate({ candidate: "c".repeat(ICE_CANDIDATE_MAX_LENGTH + 1) })).toBeNull();
  });

  it("should reject an oversized sdpMid or usernameFragment", () => {
    const long = "m".repeat(ICE_FIELD_MAX_LENGTH + 1);
    expect(toIceCandidate({ ...CANDIDATE, sdpMid: long })).toBeNull();
    expect(toIceCandidate({ ...CANDIDATE, usernameFragment: long })).toBeNull();
  });

  it("should reject a negative or fractional sdpMLineIndex", () => {
    expect(toIceCandidate({ ...CANDIDATE, sdpMLineIndex: -1 })).toBeNull();
    expect(toIceCandidate({ ...CANDIDATE, sdpMLineIndex: 1.5 })).toBeNull();
  });

  it("should reject non-object candidates", () => {
    expect(toIceCandidate(null)).toBeNull();
    expect(toIceCandidate(["candidate"])).toBeNull();
  });
});

describe("toSessionDescription", () => {
  it("should accept offers and answers with a string sdp", () => {
    expect(toSessionDescription({ type: "answer", sdp: "v=0", extra: true })).toEqual({
      type: "answer",
      sdp: "v=0",
    });
  });

  it("should reject other description types", () => {
    expect(toSessionDescription({ type: "rollback", sdp: "" })).toBeNull();
  });
});

describe("parseCallSignal", () => {
  it("should reject call_media_state with non-boolean flags", () => {
    expect(
      parseCallSignal({
        type: "call_media_state",
        callId: "c-1",
        micOn: "yes",
        cameraOn: true,
        screenSharing: false,
      })
    ).toBeNull();
    expect(
      parseCallSignal({
        type: "call_media_state",
        callId: "c-1",
        micOn: true,
        cameraOn: true,
        screenSharing: false,
        cameraAvailable: "no",
      })
    ).toBeNull();
  });

  it("should reject signals without a callId and unknown types", () => {
    expect(parseCallSignal({ type: "call_accept" })).toBeNull();
    expect(parseCallSignal({ type: "ping", callId: "c-1" })).toBeNull();
  });

  it("should accept an invite without a target and drop an empty target", () => {
    expect(parseCallSignal({ type: "call_invite" })).toEqual({ type: "call_invite" });
    expect(parseCallSignal({ type: "call_invite", targetStudentId: "" })).toBeNull();
  });

  it("should strip unknown fields from simple signals", () => {
    expect(parseCallSignal({ type: "call_hangup", callId: "c-1", junk: 1 })).toEqual({
      type: "call_hangup",
      callId: "c-1",
    });
  });

  it("should keep a known hangup reason and drop an unknown one", () => {
    expect(
      parseCallSignal({ type: "call_hangup", callId: "c-1", reason: "media_unavailable" })
    ).toEqual({ type: "call_hangup", callId: "c-1", reason: "media_unavailable" });
    expect(parseCallSignal({ type: "call_hangup", callId: "c-1", reason: "<b>" })).toEqual({
      type: "call_hangup",
      callId: "c-1",
    });
  });
});

describe("toDropPeerMessage", () => {
  it("should map each drop outcome to the message the peer gets", () => {
    expect(toDropPeerMessage({ status: "COMPLETED", peerMessage: "call_ended" }, "c-1")).toEqual({
      type: "call_ended",
      callId: "c-1",
      reason: "peer_disconnected",
    });
    expect(toDropPeerMessage({ status: "CANCELED", peerMessage: "call_canceled" }, "c-1")).toEqual({
      type: "call_canceled",
      callId: "c-1",
      reason: "canceled",
    });
    expect(toDropPeerMessage({ status: "MISSED", peerMessage: "call_unavailable" }, "c-1")).toEqual(
      { type: "call_unavailable", reason: "offline" }
    );
  });
});
