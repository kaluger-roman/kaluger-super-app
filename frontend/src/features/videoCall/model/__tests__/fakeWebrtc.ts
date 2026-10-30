import { vi } from "vitest";
import type { Mock } from "vitest";

import type { WebRtcAdapter } from "../webrtc.types";

export type FakeTrack = {
  id: string;
  kind: "audio" | "video";
  enabled: boolean;
  muted: boolean;
  readyState: MediaStreamTrackState;
  stop: Mock<() => void>;
  addEventListener: (type: string, listener: () => void) => void;
  dispatchEnded: () => void;
  dispatch: (type: string) => void;
};

export type FakeStream = {
  getTracks: () => FakeTrack[];
  getTrackById: (id: string) => FakeTrack | null;
  getAudioTracks: () => FakeTrack[];
  getVideoTracks: () => FakeTrack[];
  addTrack: Mock<(track: FakeTrack) => void>;
  removeTrack: Mock<(track: FakeTrack) => void>;
};

type FakeSender = {
  track: MediaStreamTrack | null;
  replaceTrack: Mock<(track: MediaStreamTrack | null) => Promise<void>>;
};

type FakeTransceiver = {
  sender: FakeSender;
  receiver: { track: { kind: string } };
  direction: RTCRtpTransceiverDirection;
  currentDirection: RTCRtpTransceiverDirection | null;
};

type FakePeerConnection = {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  localDescription: RTCSessionDescriptionInit | null;
  onicecandidate:
    ((event: { candidate: { toJSON: () => RTCIceCandidateInit } | null }) => void) | null;
  ontrack: ((event: { track: FakeTrack; streams: FakeStream[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  restartIce: Mock<() => void>;
  setConfiguration: Mock<(config: RTCConfiguration) => void>;
  addTrack: Mock<(track: MediaStreamTrack) => FakeSender>;
  addTransceiver: Mock<(kind: string, init?: RTCRtpTransceiverInit) => FakeTransceiver>;
  getTransceivers: Mock<() => FakeTransceiver[]>;
  getSenders: Mock<() => FakeSender[]>;
  close: Mock<() => void>;
  createOffer: Mock<() => Promise<RTCSessionDescriptionInit>>;
  createAnswer: Mock<() => Promise<RTCSessionDescriptionInit>>;
  setLocalDescription: Mock<(desc?: RTCSessionDescriptionInit) => Promise<void>>;
  setRemoteDescription: Mock<(desc?: RTCSessionDescriptionInit) => Promise<void>>;
  addIceCandidate: Mock<(candidate: RTCIceCandidateInit) => Promise<void>>;
};

let trackCounter = 0;

export const createFakeTrack = (kind: "audio" | "video"): FakeTrack => {
  const listeners = new Map<string, Array<() => void>>();
  trackCounter += 1;
  const dispatch = (type: string) => listeners.get(type)?.forEach((listener) => listener());
  const track: FakeTrack = {
    id: `track-${trackCounter}`,
    kind,
    enabled: true,
    muted: false,
    readyState: "live",
    stop: vi.fn(() => {
      track.readyState = "ended";
    }),
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    dispatchEnded: () => dispatch("ended"),
    dispatch,
  };
  return track;
};

// The system stopped (or resumed) feeding the track without ending it.
export const setTrackMutedBySystem = (track: FakeTrack, muted: boolean): void => {
  track.muted = muted;
  track.dispatch(muted ? "mute" : "unmute");
};

// The system stopped the track (another app took the device, the OS suspended the page).
export const endTrackBySystem = (track: FakeTrack): void => {
  track.readyState = "ended";
  track.dispatchEnded();
};

export const createFakeStream = (
  tracks: Array<"audio" | "video"> = ["audio", "video"]
): FakeStream => {
  const list = tracks.map(createFakeTrack);
  return {
    getTracks: () => list,
    getTrackById: (id) => list.find((track) => track.id === id) ?? null,
    getAudioTracks: () => list.filter((track) => track.kind === "audio"),
    getVideoTracks: () => list.filter((track) => track.kind === "video"),
    addTrack: vi.fn((track: FakeTrack) => {
      list.push(track);
    }),
    removeTrack: vi.fn((track: FakeTrack) => {
      const index = list.indexOf(track);
      if (index >= 0) list.splice(index, 1);
    }),
  };
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

const createFakePeerConnection = (): FakePeerConnection => {
  const senders: FakeSender[] = [];
  const transceivers: FakeTransceiver[] = [];
  const settleDirections = () => {
    transceivers.forEach((transceiver) => {
      transceiver.currentDirection = transceiver.direction;
    });
  };
  const pc: FakePeerConnection = {
    connectionState: "new",
    iceConnectionState: "new",
    signalingState: "stable",
    localDescription: null,
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    oniceconnectionstatechange: null,
    restartIce: vi.fn(),
    setConfiguration: vi.fn(),
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
      const transceiver: FakeTransceiver = {
        sender: makeSender(null),
        receiver: { track: { kind } },
        direction: init?.direction ?? "sendrecv",
        currentDirection: null,
      };
      senders.push(transceiver.sender);
      transceivers.push(transceiver);
      return transceiver;
    }),
    getTransceivers: vi.fn(() => transceivers),
    getSenders: vi.fn(() => senders),
    close: vi.fn(),
    createOffer: vi.fn(async () => ({ type: "offer" as const, sdp: "fake-offer" })),
    createAnswer: vi.fn(async () => ({ type: "answer" as const, sdp: "fake-answer" })),
    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      if (desc?.type === "rollback") {
        pc.signalingState = "stable";
        return;
      }
      const type = desc?.type ?? (pc.signalingState === "have-remote-offer" ? "answer" : "offer");
      pc.localDescription = { type, sdp: desc?.sdp ?? `fake-${type}` };
      pc.signalingState = type === "offer" ? "have-local-offer" : "stable";
      if (type === "answer") settleDirections();
    }),
    setRemoteDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      if (desc?.type === "answer" && pc.signalingState !== "have-local-offer") {
        throw new DOMException(`Called in wrong state: ${pc.signalingState}`, "InvalidStateError");
      }
      pc.signalingState = desc?.type === "offer" ? "have-remote-offer" : "stable";
      if (desc?.type === "answer") settleDirections();
    }),
    addIceCandidate: vi.fn<(candidate: RTCIceCandidateInit) => Promise<void>>(
      async () => undefined
    ),
  };
  return pc;
};

export const triggerConnectionState = (
  pc: FakePeerConnection,
  state: RTCPeerConnectionState
): void => {
  pc.connectionState = state;
  pc.onconnectionstatechange?.();
};

export const triggerIceState = (pc: FakePeerConnection, state: RTCIceConnectionState): void => {
  pc.iceConnectionState = state;
  pc.oniceconnectionstatechange?.();
};

type FakeAdapterOverrides = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<FakeStream>;
  getDisplayMedia: () => Promise<FakeStream>;
  supportsDisplayMedia: () => boolean;
};

export type FakeAdapter = WebRtcAdapter & {
  peerConnections: FakePeerConnection[];
};

// The one place where fakes become DOM types: the code under test only sees the adapter.
const asDom = <T>(fake: unknown): T => fake as T;

export const createFakeAdapter = (overrides: Partial<FakeAdapterOverrides> = {}): FakeAdapter => {
  const peerConnections: FakePeerConnection[] = [];
  const getUserMedia = overrides.getUserMedia ?? (async () => createFakeStream());
  const getDisplayMedia = overrides.getDisplayMedia ?? (async () => createFakeStream(["video"]));
  return {
    peerConnections,
    createPeerConnection: vi.fn(() => {
      const pc = createFakePeerConnection();
      peerConnections.push(pc);
      return asDom<RTCPeerConnection>(pc);
    }),
    getUserMedia: vi.fn(async (constraints) => asDom<MediaStream>(await getUserMedia(constraints))),
    getDisplayMedia: vi.fn(async () => asDom<MediaStream>(await getDisplayMedia())),
    supportsDisplayMedia: vi.fn(overrides.supportsDisplayMedia ?? (() => true)),
    createMediaStream: vi.fn(() => asDom<MediaStream>(createFakeStream([]))),
  };
};
