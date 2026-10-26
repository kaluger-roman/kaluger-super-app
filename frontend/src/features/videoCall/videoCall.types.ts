export type CallMediaState = {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  cameraAvailable: boolean;
};

// Where the peer is, in domain terms (FR-030): on screen, in the background, or out of reach.
type PeerPresence = "onScreen" | "background" | "disconnected";

// The peer reports what it keeps sending while in the background (FR-033), not just that it left.
export type PeerPresenceState = {
  presence: PeerPresence;
  audioSuspended: boolean;
  videoSuspended: boolean;
};

type TileInterruptionKind = "minimized" | "reconnecting";

export type TileInterruption = {
  kind: TileInterruptionKind;
  label: string;
};

// Offsets are CSS pixels from the centre of the video box, applied before the scale.
export type CallZoom = {
  scale: number;
  offsetX: number;
  offsetY: number;
};
