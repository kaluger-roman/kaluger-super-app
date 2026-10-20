import type { CallPhase } from "./call.types";
import { RINGBACK_PATTERN, RINGTONE_PATTERN, TONE_RAMP_SECONDS } from "./callSounds.constants";
import type { CallSoundsAdapter, ToneHandle, TonePattern } from "./callSounds.types";

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;
  if (!audioContext) audioContext = new window.AudioContext();
  if (audioContext.state === "suspended") {
    // Browsers keep audio suspended until the first user gesture; the next tone retries.
    void audioContext.resume().catch((error: unknown) => {
      console.warn("Call sound is waiting for a user gesture:", error);
    });
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
    gain.gain.setTargetAtTime(on ? pattern.volume : 0, now, TONE_RAMP_SECONDS);
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

export const getCallSoundsAdapter = (): CallSoundsAdapter => adapter;

export const syncCallSounds = (soundsAdapter: CallSoundsAdapter, phase: CallPhase): void => {
  if (phase === "outgoing") {
    soundsAdapter.stopRingtone();
    soundsAdapter.startRingback();
  } else if (phase === "incoming") {
    soundsAdapter.stopRingback();
    soundsAdapter.startRingtone();
  } else {
    soundsAdapter.stopRingback();
    soundsAdapter.stopRingtone();
  }
};
