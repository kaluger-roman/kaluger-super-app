import { createEffect, sample } from "effector";

import { $callPhase } from "./call.model";
import type { CallPhase } from "./call.types";

export type CallSoundsAdapter = {
  startRingback: () => void;
  stopRingback: () => void;
  startRingtone: () => void;
  stopRingtone: () => void;
};

type TonePattern = {
  freqs: number[];
  onMs: number;
  offMs: number;
  volume: number;
};

const RINGBACK_PATTERN: TonePattern = {
  freqs: [425],
  onMs: 1000,
  offMs: 3000,
  volume: 0.06,
};

const RINGTONE_PATTERN: TonePattern = {
  freqs: [440, 480],
  onMs: 1500,
  offMs: 3000,
  volume: 0.08,
};

type ToneHandle = { stop: () => void };

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext;
  if (!ctor) return null;
  if (!audioContext) audioContext = new ctor();
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
};

const startTone = (pattern: TonePattern): ToneHandle | null => {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const oscillators = pattern.freqs.map((freq) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    oscillator.start();
    return oscillator;
  });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pulse = (on: boolean): void => {
    if (stopped) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(on ? pattern.volume : 0, now, 0.02);
    timer = setTimeout(() => pulse(!on), on ? pattern.onMs : pattern.offMs);
  };
  pulse(true);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          /* oscillator already stopped */
        }
        oscillator.disconnect();
      });
      gain.disconnect();
    },
  };
};

const createDefaultAdapter = (): CallSoundsAdapter => {
  let ringback: ToneHandle | null = null;
  let ringtone: ToneHandle | null = null;
  return {
    startRingback: () => {
      if (!ringback) ringback = startTone(RINGBACK_PATTERN);
    },
    stopRingback: () => {
      ringback?.stop();
      ringback = null;
    },
    startRingtone: () => {
      if (!ringtone) ringtone = startTone(RINGTONE_PATTERN);
    },
    stopRingtone: () => {
      ringtone?.stop();
      ringtone = null;
    },
  };
};

let adapter: CallSoundsAdapter = createDefaultAdapter();

export const setCallSoundsAdapter = (next: CallSoundsAdapter): void => {
  adapter = next;
};

export const resetCallSoundsAdapter = (): void => {
  adapter = createDefaultAdapter();
};

const syncCallSoundsFx = createEffect((phase: CallPhase): void => {
  if (phase === "outgoing") {
    adapter.stopRingtone();
    adapter.startRingback();
  } else if (phase === "incoming") {
    adapter.stopRingback();
    adapter.startRingtone();
  } else {
    adapter.stopRingback();
    adapter.stopRingtone();
  }
});

sample({ clock: $callPhase, target: syncCallSoundsFx });
