import { createEvent, createWatch, sample } from "effector";
import type { Store, Unit } from "effector";

// The call flow runs unscoped (WebRTC callbacks fire events outside any scope),
// so these tests read the global value through a one-off sample instead of fork.
export const readStore = <T>(store: Store<T>): T => {
  const probe = createEvent();
  const read = sample({ clock: probe, source: store });
  const values: T[] = [];
  const unwatch = createWatch({ unit: read, fn: (value) => values.push(value) });
  probe();
  unwatch();
  return values[0];
};

export const collectEvents = <T>(unit: Unit<T>): { calls: T[]; unwatch: () => void } => {
  const calls: T[] = [];
  const unwatch = createWatch({ unit, fn: (value) => calls.push(value) });
  return { calls, unwatch };
};
