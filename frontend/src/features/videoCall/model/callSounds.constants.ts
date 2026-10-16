import type { TonePattern } from "./callSounds.types";

export const RINGBACK_PATTERN: TonePattern = {
  freqs: [425],
  onMs: 1000,
  offMs: 3000,
  volume: 0.06,
};

export const RINGTONE_PATTERN: TonePattern = {
  freqs: [440, 480],
  onMs: 1500,
  offMs: 3000,
  volume: 0.08,
};

export const TONE_RAMP_SECONDS = 0.02;
