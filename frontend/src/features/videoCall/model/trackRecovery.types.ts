export type CallDevice = "mic" | "camera";

// `busy`: the devices another app holds; they are tried again on the next return or device toggle.
export type TrackRecoveryResult = {
  recovered: number;
  busy: CallDevice[];
};

export type DeviceRequest = { stream: MediaStream } | { error: unknown };
