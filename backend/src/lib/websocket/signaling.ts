import { processCallSignal } from "../../services/callSignaling";
import type { CallerKindValue } from "../../types";
import { isCallSignalMessage, parseCallSignal } from "./signaling.helpers";

export const handleCallSignal = async (
  kind: CallerKindValue,
  id: string,
  raw: unknown
): Promise<void> => {
  const signal = parseCallSignal(raw);
  if (signal) await processCallSignal({ kind, id }, signal);
};

// Returns false for a message that is not a call signal, so the caller handles it as usual.
export const routeCallMessage = (kind: CallerKindValue, id: string, data: unknown): boolean => {
  if (!isCallSignalMessage(data)) return false;
  void handleCallSignal(kind, id, data);
  return true;
};
