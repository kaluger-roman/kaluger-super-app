export type CallMediaState = {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  cameraAvailable: boolean;
};

// Where a participant is, in domain terms (FR-030): on screen, in the background, or out of reach.
export type PresenceState = "on_screen" | "background";
export type PeerPresence = PresenceState | "disconnected";

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
