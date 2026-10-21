import { sample } from "effector";
import type { Event } from "effector";

import * as callModel from "./call.model";

// The one gate for results of work started for a call: a result that arrives after its call
// ended (or for another call) belongs to no call and is dropped.
export const forCurrentCall = <T>(
  clock: Event<T>,
  callIdOf: (payload: T) => string | null
): Event<T> =>
  sample({
    clock,
    source: callModel.$callId,
    filter: (callId, payload) => callId !== null && callId === callIdOf(payload),
    fn: (_, payload) => payload,
  });
