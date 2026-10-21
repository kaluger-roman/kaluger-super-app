export type CallSoundsAdapter = {
  startRingback: () => void;
  stopRingback: () => void;
  startRingtone: () => void;
  stopRingtone: () => void;
};

export type TonePattern = {
  freqs: number[];
  onMs: number;
  offMs: number;
  volume: number;
};

export type ToneHandle = { stop: () => void };
