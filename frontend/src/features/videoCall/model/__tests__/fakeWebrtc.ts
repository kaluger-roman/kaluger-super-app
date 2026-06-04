import { vi } from "vitest";

import type { WebRtcAdapter } from "../webrtc";

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

export const createFakePeerConnection = (): RTCPeerConnection => {
  const senders: FakeSender[] = [];
  const pc = {
    connectionState: "new" as RTCPeerConnectionState,
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    addTrack: vi.fn((track: MediaStreamTrack) => {
      const sender: FakeSender = {
        track,
        replaceTrack: vi.fn(async (next: MediaStreamTrack | null) => {
          sender.track = next;
        }),
      };
      senders.push(sender);
      return sender;
    }),
    close: vi.fn(),
    getSenders: vi.fn(() => senders),
    createOffer: vi.fn(async () => ({ type: "offer", sdp: "fake-offer" })),
    createAnswer: vi.fn(async () => ({ type: "answer", sdp: "fake-answer" })),
    setLocalDescription: vi.fn(async () => undefined),
    setRemoteDescription: vi.fn(async () => undefined),
    addIceCandidate: vi.fn(async () => undefined),
  };
  return pc as unknown as RTCPeerConnection;
};

export const createFakeAdapter = (
  overrides: Partial<WebRtcAdapter> = {}
): WebRtcAdapter => ({
  createPeerConnection: vi.fn(() => createFakePeerConnection()),
  getUserMedia: vi.fn(async () => createFakeStream()),
  getDisplayMedia: vi.fn(async () => createFakeStream(["video"])),
  createMediaStream: vi.fn(() => createFakeStream([])),
  ...overrides,
});
