export type CallSoundsAdapter = {
  // Called inside the click that starts a call: browsers unlock audio only during a user gesture.
  primeAudio: () => void;
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
