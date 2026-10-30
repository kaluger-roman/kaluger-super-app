export type CallDevice = "mic" | "camera";

// `toggled`: the devices the user just toggled. Their live track the system muted (iOS stops the
// capture without ending the track) is replaced too when the user has it on.
// `skipped`: the tracks the run before a replayed request already tried.
export type TrackRecoveryRequest = {
  callId: string;
  toggled: CallDevice[];
  skipped?: MediaStreamTrack[];
};

// `busy`: the devices another app holds; they are tried again on the next return or device toggle.
// `failed`: the toggled devices the user has on that the browser refused for another reason.
export type TrackRecoveryResult = {
  recovered: number;
  busy: CallDevice[];
  failed: CallDevice[];
  attempted: MediaStreamTrack[];
};

export type RecoveryRun = { result: TrackRecoveryResult };

export type DeviceRequest = { stream: MediaStream } | { error: unknown };
