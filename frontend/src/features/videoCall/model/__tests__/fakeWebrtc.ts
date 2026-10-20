import { vi } from "vitest";

import type { WebRtcAdapter } from "../webrtc.types";

type FakeTrack = {
  kind: "audio" | "video";
  enabled: boolean;
  stop: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  dispatchEnded: () => void;
};

const makeTrack = (kind: "audio" | "video"): FakeTrack => {
  const listeners: Array<() => void> = [];
  return {
    kind,
    enabled: true,
    stop: vi.fn(),
    addEventListener: (type, listener) => {
      if (type === "ended") listeners.push(listener);
    },
    dispatchEnded: () => listeners.forEach((listener) => listener()),
  };
};

export const createFakeStream = (
  tracks: Array<"audio" | "video"> = ["audio", "video"]
): MediaStream => {
  const list = tracks.map(makeTrack);
  const stream = {
    getTracks: () => list,
    getTrackById: () => null,
    getAudioTracks: () => list.filter((t) => t.kind === "audio"),
    getVideoTracks: () => list.filter((t) => t.kind === "video"),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  };
  return stream as unknown as MediaStream;
};

type FakeSender = {
  track: MediaStreamTrack | null;
  replaceTrack: (track: MediaStreamTrack | null) => Promise<void>;
};

type FakeTransceiver = {
  sender: FakeSender;
  receiver: { track: { kind: string } };
  direction: RTCRtpTransceiverDirection;
  currentDirection: RTCRtpTransceiverDirection | null;
};

const makeSender = (track: MediaStreamTrack | null): FakeSender => {
  const sender: FakeSender = {
    track,
    replaceTrack: vi.fn(async (next: MediaStreamTrack | null) => {
      sender.track = next;
    }),
  };
  return sender;
};

export const createFakePeerConnection = (): RTCPeerConnection => {
  const senders: FakeSender[] = [];
  const transceivers: FakeTransceiver[] = [];
  const settleDirections = () => {
    transceivers.forEach((transceiver) => {
      transceiver.currentDirection = transceiver.direction;
    });
  };
  const pc = {
    connectionState: "new" as RTCPeerConnectionState,
    signalingState: "stable" as RTCSignalingState,
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    addTrack: vi.fn((track: MediaStreamTrack) => {
      const sender = makeSender(track);
      senders.push(sender);
      transceivers.push({
        sender,
        receiver: { track: { kind: track.kind } },
        direction: "sendrecv",
        currentDirection: null,
      });
      return sender;
    }),
    addTransceiver: vi.fn((kind: string, init?: RTCRtpTransceiverInit) => {
      const sender = makeSender(null);
      senders.push(sender);
      const transceiver: FakeTransceiver = {
        sender,
        receiver: { track: { kind } },
        direction: init?.direction ?? "sendrecv",
        currentDirection: null,
      };
      transceivers.push(transceiver);
      return transceiver;
    }),
    getTransceivers: vi.fn(() => transceivers),
    close: vi.fn(),
    getSenders: vi.fn(() => senders),
    createOffer: vi.fn(async () => ({ type: "offer", sdp: "fake-offer" })),
    createAnswer: vi.fn(async () => ({ type: "answer", sdp: "fake-answer" })),
    localDescription: null as RTCSessionDescriptionInit | null,
    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      const type = desc?.type ?? (pc.signalingState === "have-remote-offer" ? "answer" : "offer");
      pc.localDescription = { type, sdp: desc?.sdp ?? `fake-${type}` };
      pc.signalingState = type === "offer" ? "have-local-offer" : "stable";
      if (type === "answer") settleDirections();
    }),
    setRemoteDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      pc.signalingState = desc?.type === "offer" ? "have-remote-offer" : "stable";
      if (desc?.type === "answer") settleDirections();
    }),
    addIceCandidate: vi.fn(async () => undefined),
  };
  return pc as unknown as RTCPeerConnection;
};

export const createFakeAdapter = (overrides: Partial<WebRtcAdapter> = {}): WebRtcAdapter => ({
  createPeerConnection: vi.fn(() => createFakePeerConnection()),
  getUserMedia: vi.fn(async () => createFakeStream()),
  getDisplayMedia: vi.fn(async () => createFakeStream(["video"])),
  supportsDisplayMedia: vi.fn(() => true),
  createMediaStream: vi.fn(() => createFakeStream([])),
  ...overrides,
});
