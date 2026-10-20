import { useUnit } from "effector-react";

import { toLocalTileStream } from "./ActiveCallScreen.helpers";
import type { CallStreams } from "./ActiveCallScreen.types";
import { callModel, getSession } from "../../model";

export const useCallStreams = (): CallStreams => {
  const callId = useUnit(callModel.$callId);
  useUnit(callModel.$mediaEpoch);

  if (!callId) return { localStream: null, remoteStream: null };
  const session = getSession(callId);
  if (!session) return { localStream: null, remoteStream: null };
  return { localStream: toLocalTileStream(session), remoteStream: session.remoteStream };
};
